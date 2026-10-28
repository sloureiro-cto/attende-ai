import request from 'supertest';
import type { TestApp } from '../helpers/app';
import { createApp } from '../helpers/app';
import { resetEnvCache } from '../../config/env';
import { clearMembershipCache } from '../../middleware/auth';
import { AgentPauseModel, EntitlementModel, PlanModel, SubscriptionModel } from '../../modules/billing/models';
import { BillingService } from '../../modules/billing/service';
import { recordAiReply, resumeAiQuotaPauses } from '../../modules/billing/usage';
import { OrphanWorkspaceModel, SignupModel, TrialClaimModel } from '../../modules/signup/models';
import { testDeps } from '../helpers/deps';
import { FakeJsynq } from '../helpers/fakeJsynq';
import { FakeStripe } from '../helpers/fakeStripe';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

const sdrForm = {
  businessName: 'Clínica Sorriso',
  businessDescription: 'Clínica odontológica no centro de São Paulo.',
  language: 'pt',
  tone: 'friendly',
  disclosure: true,
  offerings: [{ name: 'Limpeza', price: 'R$ 150' }],
  workingHours: null,
  handoff: { triggers: ['Cliente quer desconto'], keywords: ['atendente'], message: 'Vou chamar alguém.' },
  sdr: { goal: 'book_meeting', qualificationQuestions: ['Qual serviço você procura?'] },
};

const STARTER_LIMITS = { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 };

/** Each signup from its own address: the per-IP signup rate limit lives for the whole file. */
let visitor = 0;
const ip = () => `198.51.100.${(visitor += 1)}`;

describe('E2E on JSYNQ staging routes: signup -> trial -> agent -> go-live -> over-limit -> cancel -> agents paused', () => {
  let jsynq: FakeJsynq;
  let stripe: FakeStripe;
  let app: TestApp;

  beforeAll(async () => {
    await startMongo();
    jsynq = await new FakeJsynq().start();
    process.env.JSYNQ_API_URL = jsynq.url;
    resetEnvCache();
  });

  afterAll(async () => {
    await jsynq.stop();
    await stopMongo();
  });

  beforeEach(async () => {
    await clearMongo();
    clearMembershipCache();
    jsynq.reset();
    stripe = new FakeStripe();
    app = createApp(testDeps({ stripe }), null);
    await PlanModel.create({
      slug: 'attende_starter',
      title: 'Starter',
      prices: [
        { id: 'price_starter_brl_month', currency: 'brl', interval: 'month', intervalCount: 1, amount: 19700, active: true },
        { id: 'price_starter_usd_month', currency: 'usd', interval: 'month', intervalCount: 1, amount: 3900, active: true },
      ],
      active: true,
    });
  });

  /** Account (JSYNQ `POST /api/users`) + the code JSYNQ e-mailed (`PATCH /api/users/verify-otp`). */
  const signUp = async (email: string) => {
    await request(app)
      .post('/api/attende/signup')
      .set('x-forwarded-for', ip())
      .send({ name: 'Maria Souza', email, password: 'Senha#2026', businessName: 'Clínica Sorriso', locale: 'pt' })
      .expect(201);
    return request(app).post('/api/attende/signup/verify').send({ email, otp: jsynq.otpOf(email) });
  };
  /** The session NextAuth mints from the verify proof: same claims, same secret. */
  const sessionOf = (id: string, email: string, workspaceId: string | null = null) => userToken({ id, email, workspaceId });

  it('runs the whole lifecycle against JSYNQ and Stripe, with no partner API call', async () => {
    // 1. signup + JSYNQ's own OTP
    const verified = await signUp('maria@clinica.com.br');
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ email: 'maria@clinica.com.br', isVerified: true, workspaceId: null, signup: { state: 'verified', businessName: 'Clínica Sorriso' } });
    expect(verified.body.accessToken).toBeUndefined();
    const userId: string = verified.body.id;
    expect(jsynq.users.get(userId)).toMatchObject({ verified: true, language: 'portuguese' });
    let token = sessionOf(userId, 'maria@clinica.com.br');

    // 2. card + trial: JSYNQ workspace and CRM project created as the user
    const intent = await request(app).post('/api/attende/signup/setup-intent').set('Authorization', `Bearer ${token}`).send({}).expect(200);
    expect(intent.body.clientSecret).toMatch(/^seti_/);
    stripe.addCard('pm_card_ok');
    const trial = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).set('cf-ipcountry', 'BR').send({ paymentMethodId: 'pm_card_ok' });
    expect(trial.status).toBe(201);
    expect(trial.body).toMatchObject({ subscriptionStatus: 'trialing', plan: { slug: 'attende_starter' }, alreadyStarted: false, entitlements: { status: 'trialing', tier: 'attende_starter' } });
    const workspaceId: string = trial.body.workspaceId;
    expect(jsynq.workspaces.get(workspaceId)).toMatchObject({ name: 'Clínica Sorriso', owner: userId, language: 'portuguese' });
    const crm = jsynq.projects.filter((p) => p.workspaceId === workspaceId);
    expect(crm).toEqual([expect.objectContaining({ title: 'Clínica Sorriso', projectType: { title: 'crm' }, columns: expect.arrayContaining(['Lead']) })]);
    expect((await SignupModel.findOne({ userId }).lean())?.crmProjectId).toBe(crm[0]!._id);
    expect(await TrialClaimModel.countDocuments({ status: 'consumed' })).toBe(2);
    const sub = [...stripe.subscriptions.values()][0]!;
    expect(sub).toMatchObject({ priceId: 'price_starter_brl_month', metadata: { app: 'attende', workspaceId } });

    // idempotent retry: same workspace, nothing new in JSYNQ
    const again = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_ok' });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ workspaceId, alreadyStarted: true });
    expect(jsynq.workspaces.size).toBe(1);

    // The frontend refreshes its session: the JWT now carries the workspace.
    token = sessionOf(userId, 'maria@clinica.com.br', workspaceId);
    const auth = { Authorization: `Bearer ${token}` };

    const ent = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(ent.body).toMatchObject({ entitlements: { status: 'trialing', trialDaysLeft: 7 }, access: { allowed: true } });
    // JSYNQ's own seeded default agent is not an Attende agent.
    expect(ent.body.usage).toMatchObject({ aiReplies: { used: 0, limit: 1000 }, agents: { used: 0, limit: 1 }, lines: { used: 0, limit: 1 }, docs: { used: 0, limit: 20 }, trialOutbound: { used: 0, cap: 50 } });

    // 3. agent from template (starts paused)
    const sessionId = jsynq.addSession(workspaceId, 'whatsapp', 'connected');
    const created = await request(app)
      .post('/api/attende/agents/from-template')
      .set(auth)
      .send({ templateKey: 'sdr', form: { ...sdrForm, handoff: { ...sdrForm.handoff, target: { kind: 'user', userId } } }, lines: [{ channel: 'whatsapp', sessionId }], clientRequestId: 'req-0001-abcd' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ templateKey: 'sdr', status: 'paused', lines: [{ channel: 'whatsapp', sessionId, connected: true, active: false }] });
    const agent = jsynq.agents.get(created.body.data.agentId)!;
    // Tool ids from the workspace registry; no staging-unknown fields.
    expect(agent.body).toMatchObject({ availableTools: ['jsynq:search_knowledge_base', 'jsynq:request_human_handoff'], type: 'specialized' });
    expect(agent.body).not.toHaveProperty('toolNames');
    expect(agent.body).not.toHaveProperty('knowledgeTrust');
    expect(agent.systemPrompt).toContain('não instruções');
    const binding = [...jsynq.bindings.values()][0]!;
    expect(binding).toMatchObject({ status: 'paused', policy: { allowHumanHandoff: true, workspaceAccess: 'none' } });
    expect(binding.policy).not.toHaveProperty('handoffAssigneeUserId');

    // same clientRequestId = same agent
    const replay = await request(app)
      .post('/api/attende/agents/from-template')
      .set(auth)
      .send({ templateKey: 'sdr', form: sdrForm, lines: [{ channel: 'whatsapp', sessionId }], clientRequestId: 'req-0001-abcd' });
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(created.body.data.id);

    // plan quota (starter = 1 agent), counted from GET /api/agents
    const second = await request(app)
      .post('/api/attende/agents/from-template')
      .set(auth)
      .send({ templateKey: 'sdr', form: sdrForm, lines: [], clientRequestId: 'req-0002-abcd' });
    expect(second.status).toBe(403);
    expect(second.body.details).toMatchObject({ code: 'ATTENDE_QUOTA_EXCEEDED', resource: 'agents', limit: 1, used: 1 });

    // 4. prompt edited in JSYNQ -> drift flagged, then repaired by go-live
    agent.systemPrompt = 'edited by hand';
    const drifted = await request(app).get(`/api/attende/agents/${created.body.data.id}`).set(auth).expect(200);
    expect(drifted.body.data.promptDrift).toBe(true);
    const live = await request(app).post(`/api/attende/agents/${created.body.data.id}/go-live`).set(auth).send({}).expect(200);
    expect(live.body.data).toMatchObject({ status: 'live', warnings: ['not_tested', 'no_documents'] });
    expect(agent.systemPrompt).not.toBe('edited by hand');
    expect(binding.status).toBe('active');

    // dry run
    const test = await request(app).post(`/api/attende/agents/${created.body.data.id}/test`).set(auth).send({ message: 'quero falar com um atendente' }).expect(200);
    expect(test.body.data).toMatchObject({ mode: 'dry_run', nothingSent: true, passed: true, reason: 'handoff_requested' });

    // knowledge upload / list / delete (docs counted from the JSYNQ knowledge sources)
    const up = await request(app).post(`/api/attende/agents/${created.body.data.id}/knowledge`).set(auth).attach('file', Buffer.from('preços'), { filename: 'precos.txt', contentType: 'text/plain' });
    expect(up.status).toBe(201);
    const docs = await request(app).get(`/api/attende/agents/${created.body.data.id}/knowledge`).set(auth).expect(200);
    expect(docs.body.data.documents).toEqual([expect.objectContaining({ name: 'precos.txt', indexStatus: 'ready', pageCount: 2 })]);
    expect((await request(app).get('/api/attende/entitlements').set(auth)).body.usage).toMatchObject({ agents: { used: 1 }, lines: { used: 1 }, docs: { used: 1 } });
    await request(app).delete(`/api/attende/agents/${created.body.data.id}/knowledge/${up.body.data.documentId}`).set(auth).expect(200);
    expect(jsynq.documents.size).toBe(0);

    // 5. over-limit refusals for what the app sends straight to JSYNQ
    const lines = await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'lines' });
    expect(lines.status).toBe(403);
    expect(lines.body.details).toMatchObject({ code: 'ATTENDE_QUOTA_EXCEEDED', resource: 'lines', limit: 1, used: 1 });
    await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'seats', adding: 1 }).expect(200);
    jsynq.pendingInvites.set(workspaceId, 1);
    const seats = await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'seats', adding: 1 });
    expect(seats.status).toBe(403);
    expect(seats.body.details).toMatchObject({ resource: 'seats', limit: 2, used: 2 });
    await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'outbound' }).expect(200);
    await request(app).post('/api/attende/usage/outbound').set(auth).send({ count: 50 }).expect(200);
    const capped = await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'outbound' });
    expect(capped.status).toBe(403);
    expect(capped.body.details).toMatchObject({ resource: 'trialOutbound', limit: 50, used: 50 });
    expect((await request(app).get('/api/attende/entitlements').set(auth)).body.usage.trialOutbound).toEqual({ used: 50, cap: 50 });

    // 6a. The customer schedules the cancellation in the portal: still entitled, agents keep answering.
    const canceledAt = new Date('2026-10-20T12:00:00Z');
    Object.assign(sub, { cancelAtPeriodEnd: true, canceledAt });
    const scheduled = stripe.signedEvent('customer.subscription.updated', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', scheduled.header).send(scheduled.payload).expect(200);
    expect(await SubscriptionModel.findOne({ workspaceId }).lean()).toMatchObject({ cancelAtPeriodEnd: true, canceledAt });
    const pending = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(pending.body.access).toEqual({ allowed: true });
    expect(binding.status).toBe('active');

    // 6b. ...and undoes it.
    Object.assign(sub, { cancelAtPeriodEnd: false, canceledAt: null });
    const undone = stripe.signedEvent('customer.subscription.updated', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', undone.header).send(undone.payload).expect(200);
    expect((await request(app).get('/api/attende/entitlements').set(auth)).body.subscription).toMatchObject({ cancelAtPeriodEnd: false, canceledAt: null });

    // 6c. Stripe: the customer cancels -> the agents' bindings are paused in JSYNQ, the app is gated
    sub.canceledAt = canceledAt;
    sub.status = 'canceled';
    const { payload, header } = stripe.signedEvent('customer.subscription.deleted', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', header).send(payload).expect(200);
    expect((await EntitlementModel.findOne({ workspaceId }).lean())?.status).toBe('canceled');
    expect(binding.status).toBe('paused');
    expect(await AgentPauseModel.findOne({ workspaceId }).lean()).toMatchObject({ reasons: ['access'], bindingIds: [binding._id] });
    const blocked = await request(app).get('/api/attende/agents').set(auth);
    expect(blocked.status).toBe(402);
    expect(blocked.body).toMatchObject({ reference: 'ATTENDE_SUBSCRIPTION_INACTIVE', details: { code: 'ATTENDE_SUBSCRIPTION_INACTIVE' } });
    const noChannel = await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'lines' });
    expect(noChannel.status).toBe(402);
    const after = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(after.body.access).toMatchObject({ allowed: false, code: 'ATTENDE_SUBSCRIPTION_INACTIVE' });

    // A replayed webhook does not pause twice or fail.
    const replayDeleted = stripe.signedEvent('customer.subscription.deleted', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', replayDeleted.header).send(replayDeleted.payload).expect(200);

    // 6d. Reactivation resumes exactly the bindings that were paused.
    Object.assign(sub, { status: 'active', canceledAt: null, trialEnd: null });
    const back = stripe.signedEvent('customer.subscription.updated', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', back.header).send(back.payload).expect(200);
    expect(binding.status).toBe('active');
    expect(await AgentPauseModel.countDocuments({ workspaceId })).toBe(0);

    const badSig = await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', 't=1,v1=bad').send(payload);
    expect(badSig.status).toBe(400);

    // billing portal
    const portal = await request(app).post('/api/attende/billing/portal').set(auth).send({ kind: 'payment_method', returnUrl: 'https://evil.example/x' }).expect(200);
    expect(portal.body.data.url).toContain(encodeURIComponent('http://app.test/billing'));

    // Only staging routes were called: no partner API, no limits/usage/features/webhook endpoints.
    expect(jsynq.calls.filter((c) => /\/partner\/|\/limits|\/usage|\/features|webhook-endpoints|inbound-routing/.test(c))).toEqual([]);
  });

  it('AI-reply quota: recordAiReply pauses the agents at the limit; go-live refuses; next month resumes them', async () => {
    const owner = '9'.repeat(24);
    const workspaceId = jsynq.addWorkspace(owner);
    const sessionId = jsynq.addSession(workspaceId);
    await EntitlementModel.create({ workspaceId, tier: 'attende_starter', status: 'active', limits: { ...STARTER_LIMITS, aiRepliesPerMonth: 3 }, currentPeriodEnd: new Date(Date.now() + 20 * 86_400_000) });
    await SubscriptionModel.create({ workspaceId, userId: owner, stripeCustomerId: 'cus_q', status: 'active' });
    const auth = { Authorization: `Bearer ${userToken({ id: owner, workspaceId })}` };
    const created = await request(app).post('/api/attende/agents/from-template').set(auth).send({ templateKey: 'sdr', form: sdrForm, lines: [{ channel: 'whatsapp', sessionId }], clientRequestId: 'quota-0001' }).expect(201);
    await request(app).post(`/api/attende/agents/${created.body.data.id}/go-live`).set(auth).send({}).expect(200);
    const binding = [...jsynq.bindings.values()][0]!;
    expect(binding.status).toBe('active');

    const now = new Date('2026-10-28T12:00:00Z');
    const deps = testDeps({ now: () => now });
    expect(await recordAiReply(deps, workspaceId, 2)).toMatchObject({ used: 2, limit: 3, paused: false });
    expect(await recordAiReply(deps, workspaceId)).toMatchObject({ used: 3, paused: true });
    expect(binding.status).toBe('paused');
    const relive = await request(app).post(`/api/attende/agents/${created.body.data.id}/go-live`).set(auth).send({});
    expect(relive.status).toBe(403);
    expect(relive.body.details).toMatchObject({ code: 'ATTENDE_QUOTA_EXCEEDED', resource: 'aiReplies' });

    // Same month: still over. Next month: resumed.
    expect(await resumeAiQuotaPauses(deps)).toBe(0);
    expect(await resumeAiQuotaPauses(testDeps({ now: () => new Date('2026-11-01T00:05:00Z') }))).toBe(1);
    expect(binding.status).toBe('active');
  });

  it('a person pausing an agent during a workspace pause keeps it paused on resume', async () => {
    const owner = '8'.repeat(24);
    const workspaceId = jsynq.addWorkspace(owner);
    const sessionId = jsynq.addSession(workspaceId);
    await EntitlementModel.create({ workspaceId, tier: 'attende_starter', status: 'active', limits: { ...STARTER_LIMITS, aiRepliesPerMonth: 1 } });
    const auth = { Authorization: `Bearer ${userToken({ id: owner, workspaceId })}` };
    const created = await request(app).post('/api/attende/agents/from-template').set(auth).send({ templateKey: 'sdr', form: sdrForm, lines: [{ channel: 'whatsapp', sessionId }], clientRequestId: 'keep-0001' }).expect(201);
    await request(app).post(`/api/attende/agents/${created.body.data.id}/go-live`).set(auth).send({}).expect(200);
    await recordAiReply(testDeps({ now: () => new Date('2026-10-28T12:00:00Z') }), workspaceId);
    expect([...jsynq.bindings.values()][0]!.status).toBe('paused');
    await request(app).post(`/api/attende/agents/${created.body.data.id}/pause`).set(auth).send({}).expect(200);
    expect(await resumeAiQuotaPauses(testDeps({ now: () => new Date('2026-11-02T00:00:00Z') }))).toBe(1);
    expect([...jsynq.bindings.values()][0]!.status).toBe('paused');
  });

  it('reconcile pauses the agents of a trial that ended without a webhook', async () => {
    const owner = 'b'.repeat(24);
    const workspaceId = jsynq.addWorkspace(owner);
    const sessionId = jsynq.addSession(workspaceId);
    await EntitlementModel.create({ workspaceId, tier: 'attende_starter', status: 'trialing', limits: STARTER_LIMITS, trialEndsAt: new Date(Date.now() + 86_400_000) });
    await SubscriptionModel.create({ workspaceId, userId: owner, stripeCustomerId: 'cus_x', status: 'trialing' });
    const auth = { Authorization: `Bearer ${userToken({ id: owner, workspaceId })}` };
    const created = await request(app).post('/api/attende/agents/from-template').set(auth).send({ templateKey: 'sdr', form: sdrForm, lines: [{ channel: 'whatsapp', sessionId }], clientRequestId: 'trial-0001' }).expect(201);
    await request(app).post(`/api/attende/agents/${created.body.data.id}/go-live`).set(auth).send({}).expect(200);

    const later = testDeps({ stripe, now: () => new Date(Date.now() + 2 * 86_400_000) });
    const out = await new BillingService(later).reconcile();
    expect(out).toMatchObject({ enforced: 1 });
    expect([...jsynq.bindings.values()][0]!.status).toBe('paused');
    // Run again: nothing more to do, still paused.
    await new BillingService(later).reconcile();
    expect(await AgentPauseModel.findOne({ workspaceId }).lean()).toMatchObject({ reasons: ['access'] });
  });

  it('lists the invoices of the workspace customer, and an empty list without one', async () => {
    const owner = 'f'.repeat(24);
    const ws = jsynq.addWorkspace(owner);
    const auth = { Authorization: `Bearer ${userToken({ id: owner, workspaceId: ws })}` };

    const none = await request(app).get('/api/attende/billing/invoices').set(auth).expect(200);
    expect(none.body).toEqual({ success: true, data: { invoices: [] } });
    expect(stripe.listInvoicesCalls).toEqual([]);

    await SubscriptionModel.create({ workspaceId: ws, userId: owner, stripeCustomerId: 'cus_inv', stripeSubscriptionId: 'sub_inv', status: 'active' });
    const invoice = (n: number) => ({
      id: `in_${n}`,
      number: `A-${n}`,
      created: 1792700000 - n * 86_400,
      amountPaid: 19700,
      currency: 'brl',
      status: 'paid',
      hostedInvoiceUrl: `https://invoice.stripe.test/${n}`,
      invoicePdf: `https://invoice.stripe.test/${n}.pdf`,
    });
    stripe.invoices.set('cus_inv', [invoice(1), invoice(2), invoice(3)]);
    stripe.invoices.set('cus_someone_else', [invoice(9)]);

    const all = await request(app).get('/api/attende/billing/invoices').set(auth).expect(200);
    expect(all.body.data.invoices).toEqual([invoice(1), invoice(2), invoice(3)]);
    expect(stripe.listInvoicesCalls.at(-1)).toEqual({ customerId: 'cus_inv', limit: 24 });

    const two = await request(app).get('/api/attende/billing/invoices?limit=2').set(auth).expect(200);
    expect(two.body.data.invoices.map((i: { id: string }) => i.id)).toEqual(['in_1', 'in_2']);

    for (const bad of ['0', '101', 'abc']) {
      const res = await request(app).get(`/api/attende/billing/invoices?limit=${bad}`).set(auth);
      expect(res.status).toBe(422);
      expect(res.body.reference).toBe('BILLING_INVALID_QUERY');
    }
    expect((await request(app).get('/api/attende/billing/invoices')).status).toBe(401);
    const outsider = userToken({ id: 'e'.repeat(24), workspaceId: ws });
    expect((await request(app).get('/api/attende/billing/invoices').set('Authorization', `Bearer ${outsider}`)).body.reference).toBe('WORKSPACE_FORBIDDEN');
  });

  it('existing JSYNQ account: 409 USER_EXISTS_UNMANAGED at signup, then the trial continues with that user', async () => {
    const existing = jsynq.addUser('joao@empresa.com', { id: 'a'.repeat(24) });
    const res = await request(app).post('/api/attende/signup').set('x-forwarded-for', ip()).send({ name: 'João Silva', email: 'joao@empresa.com', password: 'Senha#2026', businessName: 'Empresa', locale: 'pt' });
    expect(res.status).toBe(409);
    expect(res.body.reference).toBe('USER_EXISTS_UNMANAGED');
    // No code to verify for someone else's account.
    expect((await request(app).post('/api/attende/signup/verify').send({ email: 'joao@empresa.com', otp: '123456' })).body.reference).toBe('USER_EXISTS_UNMANAGED');

    const token = sessionOf(existing, 'joao@empresa.com');
    stripe.addCard('pm_card_joao');
    const trial = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_joao' });
    expect(trial.status).toBe(201);
    expect(jsynq.workspaces.get(trial.body.workspaceId)?.owner).toBe(existing);
  });

  it('verify: wrong codes count, five lock the code until a resend, and a verified e-mail never verifies again', async () => {
    await request(app).post('/api/attende/signup').set('x-forwarded-for', ip()).send({ name: 'Ana Lima', email: 'ana@lima.com', password: 'Senha#2026', businessName: 'Lima', locale: 'en' }).expect(201);
    for (let i = 0; i < 5; i += 1) {
      const wrong = await request(app).post('/api/attende/signup/verify').send({ email: 'ana@lima.com', otp: '000000' });
      expect(wrong.body.reference).toBe('SIGNUP_OTP_INVALID');
    }
    expect((await request(app).post('/api/attende/signup/verify').send({ email: 'ana@lima.com', otp: jsynq.otpOf('ana@lima.com') })).body.reference).toBe('SIGNUP_OTP_EXPIRED');
    await request(app).post('/api/attende/signup/resend').send({ email: 'ana@lima.com' }).expect(202);
    expect(jsynq.calls).toContain('POST /api/verification-otps');
    const ok = await request(app).post('/api/attende/signup/verify').send({ email: 'ana@lima.com', otp: jsynq.otpOf('ana@lima.com') });
    expect(ok.status).toBe(200);
    expect(ok.body.signup.state).toBe('verified');
    const twice = await request(app).post('/api/attende/signup/verify').send({ email: 'ana@lima.com', otp: '123456' });
    expect(twice.status).toBe(409);
    // A second submit of a pending signup does not create another JSYNQ user: it asks JSYNQ for a new code.
    await request(app).post('/api/attende/signup').set('x-forwarded-for', ip()).send({ name: 'Bia Lima', email: 'bia@lima.com', password: 'Senha#2026', businessName: 'Lima', locale: 'es' }).expect(201);
    await request(app).post('/api/attende/signup').set('x-forwarded-for', ip()).send({ name: 'Bia Lima', email: 'bia@lima.com', password: 'Senha#2026', businessName: 'Lima B', locale: 'es' }).expect(201);
    expect(jsynq.calls.filter((c) => c === 'POST /api/users')).toHaveLength(2);
    expect([...jsynq.users.values()].filter((u) => u.email === 'bia@lima.com')).toHaveLength(1);
  });

  it('compensates when Stripe fails after the workspace exists, and the card can be retried', async () => {
    const verified = await signUp('ana@loja.com');
    const token = sessionOf(verified.body.id, 'ana@loja.com');
    stripe.addCard('pm_card_declined');
    stripe.failNextSubscription = Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError' });
    const failed = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_declined' });
    expect(failed.status).toBe(402);
    expect(failed.body.reference).toBe('SIGNUP_PAYMENT_FAILED');
    expect(jsynq.calls.some((c) => c.startsWith('DELETE /api/workspaces/'))).toBe(true);
    expect(jsynq.workspaces.size).toBe(0);
    expect(await TrialClaimModel.countDocuments()).toBe(0);
    expect((await SignupModel.findOne({ email: 'ana@loja.com' }).lean())?.state).toBe('failed');

    stripe.addCard('pm_card_good');
    const ok = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_good' });
    expect(ok.status).toBe(201);
    expect(jsynq.workspaces.size).toBe(1);
  });

  it('a workspace JSYNQ would not delete is recorded as an orphan and reused by the retry', async () => {
    const verified = await signUp('rui@loja.com');
    const token = sessionOf(verified.body.id, 'rui@loja.com');
    stripe.addCard('pm_card_declined');
    stripe.failNextSubscription = Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError' });
    const realDelete = jsynq.workspaces.delete.bind(jsynq.workspaces);
    jsynq.workspaces.delete = () => {
      throw new Error('JSYNQ down');
    };
    await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_declined' }).expect(402);
    jsynq.workspaces.delete = realDelete;
    const [orphanId] = [...jsynq.workspaces.keys()];
    expect(await OrphanWorkspaceModel.findOne({ workspaceId: orphanId }).lean()).toMatchObject({ userId: verified.body.id });

    stripe.addCard('pm_card_good');
    const ok = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_good' });
    expect(ok.status).toBe(201);
    expect(ok.body.workspaceId).toBe(orphanId);
    expect(jsynq.workspaces.size).toBe(1);
  });

  it('a retry after a crash right after POST /api/workspaces adopts that workspace instead of creating another', async () => {
    const verified = await signUp('lia@loja.com');
    const userId: string = verified.body.id;
    // The crashed attempt: JSYNQ created the workspace, the id was never saved, the lock went stale.
    const startedAt = new Date(Date.now() - 10 * 60_000);
    await SignupModel.updateOne({ userId }, { $set: { state: 'trial_starting', lockedAt: startedAt, workspaceCreateStartedAt: startedAt } });
    const crashed = jsynq.addWorkspace(userId);
    jsynq.workspaces.get(crashed)!.name = 'Clínica Sorriso';
    jsynq.workspaces.get(crashed)!.createdAt = new Date(startedAt.getTime() + 1000).toISOString();

    stripe.addCard('pm_card_lia');
    const ok = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${sessionOf(userId, 'lia@loja.com')}`).send({ paymentMethodId: 'pm_card_lia' });
    expect(ok.status).toBe(201);
    expect(ok.body.workspaceId).toBe(crashed);
    expect(jsynq.workspaces.size).toBe(1);
  });

  it('one trial per card', async () => {
    const a = await signUp('one@a.com');
    stripe.addCard('pm_shared', 'fp_same');
    await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${sessionOf(a.body.id, 'one@a.com')}`).send({ paymentMethodId: 'pm_shared' }).expect(201);
    const b = await signUp('two@b.com');
    stripe.addCard('pm_shared_2', 'fp_same');
    const res = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${sessionOf(b.body.id, 'two@b.com')}`).send({ paymentMethodId: 'pm_shared_2' });
    expect(res.status).toBe(409);
    expect(res.body.reference).toBe('SIGNUP_TRIAL_ALREADY_USED');
  });

  it('refuses a workspace the user does not belong to, and a header that contradicts the token', async () => {
    const owner = 'c'.repeat(24);
    const ws = jsynq.addWorkspace(owner);
    const other = jsynq.addWorkspace('d'.repeat(24));
    const outsider = userToken({ id: 'e'.repeat(24), workspaceId: ws });
    expect((await request(app).get('/api/attende/entitlements').set('Authorization', `Bearer ${outsider}`)).body.reference).toBe('WORKSPACE_FORBIDDEN');
    const mine = userToken({ id: owner, workspaceId: ws });
    const mismatch = await request(app).get('/api/attende/entitlements').set('Authorization', `Bearer ${mine}`).set('x-workspace-id', other);
    expect(mismatch.status).toBe(409);
    expect((await request(app).get('/api/attende/entitlements')).status).toBe(401);
    expect((await request(app).get('/api/attende/agents').set('Authorization', `Bearer ${mine}`)).body.reference).toBe('ATTENDE_NOT_ENTITLED');
    expect((await request(app).post('/api/attende/limits/check').set('Authorization', `Bearer ${mine}`).send({ resource: 'lines' })).body.reference).toBe('ATTENDE_NOT_ENTITLED');
  });
});
