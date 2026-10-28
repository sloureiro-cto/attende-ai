import request from 'supertest';
import type { TestApp } from '../helpers/app';
import { createApp } from '../helpers/app';
import { resetEnvCache } from '../../config/env';
import type { Deps } from '../../deps';
import { partnerClient, userClient } from '../../lib/jsynq';
import { clearMembershipCache } from '../../middleware/auth';
import { AutomationRunModel } from '../../modules/automations/models';
import { createAutomationsRuntime } from '../../modules/automations/runtime/factory';
import { jsynqConversationGateway } from '../../modules/automations/runtime/jsynqGateway';
import { EntitlementModel, PlanModel, SubscriptionModel } from '../../modules/billing/models';
import { BillingService } from '../../modules/billing/service';
import { WorkspaceEventModel } from '../../modules/jsynq-webhooks/models';
import { signPayload } from '../../modules/jsynq-webhooks/signature';
import { SignupModel, TrialClaimModel } from '../../modules/signup/models';
import { FakeJsynq, PARTNER_KEY } from '../helpers/fakeJsynq';
import { FakeMailer } from '../helpers/fakeMailer';
import { FakeStripe } from '../helpers/fakeStripe';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

const JSYNQ_WEBHOOK_SECRET = 'jsynq-test-webhook-secret';

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

describe('E2E: signup -> trial -> agent -> go-live -> usage webhook -> cancel', () => {
  let jsynq: FakeJsynq;
  let stripe: FakeStripe;
  let mailer: FakeMailer;
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
    mailer = new FakeMailer();
    const deps: Deps = { stripe, partner: partnerClient(PARTNER_KEY), user: userClient, mailer, now: () => new Date() };
    app = createApp(deps, null);
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

  const signUp = async (email: string) => {
    await request(app)
      .post('/api/attende/signup')
      .send({ name: 'Maria Souza', email, password: 'Senha#2026', businessName: 'Clínica Sorriso', locale: 'pt' })
      .expect(201);
    return request(app).post('/api/attende/signup/verify').send({ email, otp: mailer.lastOtp(email) });
  };

  it('runs the whole lifecycle against JSYNQ and Stripe', async () => {
    // 1. signup + OTP -> JSYNQ user through the partner API
    const verified = await signUp('maria@clinica.com.br');
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ email: 'maria@clinica.com.br', workspaceId: null, signup: { state: 'verified', businessName: 'Clínica Sorriso' } });
    const userId: string = verified.body.id;
    expect(jsynq.users.get(userId)?.managed).toBe(true);
    const signup = await SignupModel.findOne({ email: 'maria@clinica.com.br' }).lean();
    expect(signup?.passwordEnc).toBeUndefined();
    let token: string = verified.body.accessToken;

    // 2. card + trial
    const intent = await request(app).post('/api/attende/signup/setup-intent').set('Authorization', `Bearer ${token}`).send({}).expect(200);
    expect(intent.body.clientSecret).toMatch(/^seti_/);
    stripe.addCard('pm_card_ok');
    const trial = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).set('cf-ipcountry', 'BR').send({ paymentMethodId: 'pm_card_ok' });
    expect(trial.status).toBe(201);
    expect(trial.body).toMatchObject({ subscriptionStatus: 'trialing', plan: { slug: 'attende_starter' }, alreadyStarted: false, entitlements: { status: 'trialing', tier: 'attende_starter' } });
    const workspaceId: string = trial.body.workspaceId;
    expect(jsynq.workspaces.get(workspaceId)?.features).toEqual({ conversationAnalytics: true });
    expect(jsynq.limits.get(workspaceId)).toMatchObject({
      status: 'active',
      rateLimitProfile: 'strict',
      limits: { messagingChannels: 1, agents: 1, aiRepliesPerMonth: 1000, knowledgeDocuments: 20, members: 2, outboundMessages: { max: 50 } },
    });
    expect(await TrialClaimModel.countDocuments({ status: 'consumed' })).toBe(2);
    const sub = [...stripe.subscriptions.values()][0]!;
    expect(sub).toMatchObject({ priceId: 'price_starter_brl_month', metadata: { app: 'attende', workspaceId } });

    // idempotent retry
    const again = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_ok' });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ workspaceId, alreadyStarted: true });

    // The frontend refreshes its session: the JWT now carries the workspace.
    token = userToken({ id: userId, email: 'maria@clinica.com.br', workspaceId });
    const auth = { Authorization: `Bearer ${token}` };

    const ent = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(ent.body).toMatchObject({ entitlements: { status: 'trialing', trialDaysLeft: 7 }, access: { allowed: true }, usage: { aiReplies: { used: 3, limit: 1000 }, agents: { used: 0, limit: 1 } } });
    expect(ent.body.subscription).toMatchObject({ status: 'trialing', cancelAtPeriodEnd: false, canceledAt: null });

    // 3. agent from template (starts paused)
    const sessionId = jsynq.addSession(workspaceId, 'whatsapp', 'connected');
    const created = await request(app)
      .post('/api/attende/agents/from-template')
      .set(auth)
      .send({ templateKey: 'sdr', form: { ...sdrForm, handoff: { ...sdrForm.handoff, target: { kind: 'user', userId } } }, lines: [{ channel: 'whatsapp', sessionId }], clientRequestId: 'req-0001-abcd' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ templateKey: 'sdr', status: 'paused', lines: [{ channel: 'whatsapp', sessionId, connected: true, active: false }] });
    const agent = jsynq.agents.get(created.body.data.agentId)!;
    expect(agent.body).toMatchObject({ toolNames: ['search_knowledge_base', 'request_human_handoff'], knowledgeTrust: 'untrusted', type: 'specialized' });
    const binding = [...jsynq.bindings.values()][0]!;
    expect(binding).toMatchObject({ status: 'paused', policy: { allowHumanHandoff: true, handoffAssigneeUserId: userId, workspaceAccess: 'none' } });

    // same clientRequestId = same agent
    const replay = await request(app)
      .post('/api/attende/agents/from-template')
      .set(auth)
      .send({ templateKey: 'sdr', form: sdrForm, lines: [{ channel: 'whatsapp', sessionId }], clientRequestId: 'req-0001-abcd' });
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(created.body.data.id);
    expect(jsynq.agents.size).toBe(1);

    // plan quota (starter = 1 agent)
    const second = await request(app)
      .post('/api/attende/agents/from-template')
      .set(auth)
      .send({ templateKey: 'sdr', form: sdrForm, lines: [], clientRequestId: 'req-0002-abcd' });
    expect(second.status).toBe(403);
    expect(second.body.details.code).toBe('ATTENDE_QUOTA_EXCEEDED');

    // 4. prompt edited in JSYNQ -> drift flagged, then repaired by go-live
    agent.systemPrompt = 'edited by hand';
    const drifted = await request(app).get(`/api/attende/agents/${created.body.data.id}`).set(auth).expect(200);
    expect(drifted.body.data.promptDrift).toBe(true);
    const live = await request(app).post(`/api/attende/agents/${created.body.data.id}/go-live`).set(auth).send({}).expect(200);
    expect(live.body.data).toMatchObject({ status: 'live', warnings: ['not_tested', 'no_documents'] });
    expect(live.body.data.promptDrift).toBeUndefined();
    expect(agent.systemPrompt).not.toBe('edited by hand');
    expect(binding.status).toBe('active');

    // dry run
    const test = await request(app).post(`/api/attende/agents/${created.body.data.id}/test`).set(auth).send({ message: 'quero falar com um atendente' }).expect(200);
    expect(test.body.data).toMatchObject({ mode: 'dry_run', nothingSent: true, passed: true, reason: 'handoff_requested' });

    // knowledge upload / list / delete
    const up = await request(app).post(`/api/attende/agents/${created.body.data.id}/knowledge`).set(auth).attach('file', Buffer.from('preços'), { filename: 'precos.txt', contentType: 'text/plain' });
    expect(up.status).toBe(201);
    const docs = await request(app).get(`/api/attende/agents/${created.body.data.id}/knowledge`).set(auth).expect(200);
    expect(docs.body.data.documents).toEqual([expect.objectContaining({ name: 'precos.txt', indexStatus: 'ready', pageCount: 2 })]);
    await request(app).delete(`/api/attende/agents/${created.body.data.id}/knowledge/${up.body.data.documentId}`).set(auth).expect(200);
    expect(jsynq.documents.size).toBe(0);

    // 5. JSYNQ webhook: usage.limit_reached (signed, deduplicated)
    const envelope = JSON.stringify({ id: 'evt_0001', type: 'usage.limit_reached', workspaceId, occurredAt: new Date().toISOString(), data: { meter: 'aiReplies', max: 1000, period: 'cal:2026-10' } });
    const sig = signPayload(JSYNQ_WEBHOOK_SECRET, envelope, Math.floor(Date.now() / 1000));
    const hook = await request(app).post('/api/jsynq/webhooks').set('Content-Type', 'application/json').set('X-Jsynq-Signature', sig).send(envelope);
    expect(hook.status).toBe(200);
    expect(hook.body).toEqual({ received: true });
    const dup = await request(app).post('/api/jsynq/webhooks').set('Content-Type', 'application/json').set('X-Jsynq-Signature', sig).send(envelope);
    expect(dup.body).toEqual({ received: true, duplicate: true });
    expect(await WorkspaceEventModel.countDocuments({ workspaceId, type: 'usage.limit_reached' })).toBe(1);
    const forged = await request(app).post('/api/jsynq/webhooks').set('Content-Type', 'application/json').set('X-Jsynq-Signature', `t=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}`).send(envelope);
    expect(forged.status).toBe(401);

    // 6a. The customer schedules the cancellation in the portal: still entitled, and the app can say when it ends.
    const canceledAt = new Date('2026-10-20T12:00:00Z');
    Object.assign(sub, { cancelAtPeriodEnd: true, canceledAt });
    const scheduled = stripe.signedEvent('customer.subscription.updated', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', scheduled.header).send(scheduled.payload).expect(200);
    expect(await SubscriptionModel.findOne({ workspaceId }).lean()).toMatchObject({ cancelAtPeriodEnd: true, canceledAt });
    const pending = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(pending.body.access).toEqual({ allowed: true });
    expect(pending.body.subscription).toMatchObject({ status: 'trialing', cancelAtPeriodEnd: true, canceledAt: canceledAt.toISOString(), currentPeriodEnd: sub.currentPeriodEnd!.toISOString() });

    // 6b. ...and undoes it.
    Object.assign(sub, { cancelAtPeriodEnd: false, canceledAt: null });
    const undone = stripe.signedEvent('customer.subscription.updated', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', undone.header).send(undone.payload).expect(200);
    expect((await request(app).get('/api/attende/entitlements').set(auth)).body.subscription).toMatchObject({ cancelAtPeriodEnd: false, canceledAt: null });

    // 6c. Stripe: the customer cancels -> JSYNQ limits suspended, app gated
    sub.canceledAt = canceledAt;
    sub.status = 'canceled';
    const { payload, header } = stripe.signedEvent('customer.subscription.deleted', sub);
    await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', header).send(payload).expect(200);
    expect(jsynq.limits.get(workspaceId)).toMatchObject({ status: 'suspended' });
    expect((await EntitlementModel.findOne({ workspaceId }).lean())?.status).toBe('canceled');
    const blocked = await request(app).get('/api/attende/agents').set(auth);
    expect(blocked.status).toBe(402);
    expect(blocked.body).toMatchObject({ reference: 'ATTENDE_SUBSCRIPTION_INACTIVE', details: { code: 'ATTENDE_SUBSCRIPTION_INACTIVE' } });
    const after = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(after.body.access).toMatchObject({ allowed: false, code: 'ATTENDE_SUBSCRIPTION_INACTIVE' });
    expect(after.body.subscription).toMatchObject({ status: 'canceled', cancelAtPeriodEnd: false, canceledAt: canceledAt.toISOString() });

    const badSig = await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', 't=1,v1=bad').send(payload);
    expect(badSig.status).toBe(400);

    // billing portal
    const portal = await request(app).post('/api/attende/billing/portal').set(auth).send({ kind: 'payment_method', returnUrl: 'https://evil.example/x' }).expect(200);
    expect(portal.body.data.url).toContain(encodeURIComponent('http://app.test/billing'));
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

  it('existing JSYNQ account: 409 USER_EXISTS_UNMANAGED, then the trial continues with that user', async () => {
    jsynq.users.set('a'.repeat(24), { id: 'a'.repeat(24), email: 'joao@empresa.com', name: 'João', managed: false });
    const res = await signUp('joao@empresa.com');
    expect(res.status).toBe(409);
    expect(res.body.reference).toBe('USER_EXISTS_UNMANAGED');

    const token = userToken({ id: 'a'.repeat(24), email: 'joao@empresa.com', workspaceId: null });
    stripe.addCard('pm_card_joao');
    const trial = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_joao' });
    expect(trial.status).toBe(201);
    expect(jsynq.workspaces.get(trial.body.workspaceId)?.owner).toBe('a'.repeat(24));
  });

  it('compensates when Stripe fails after the workspace exists, and the card can be retried', async () => {
    const verified = await signUp('ana@loja.com');
    const token = verified.body.accessToken;
    stripe.addCard('pm_card_declined');
    stripe.failNextSubscription = Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError' });
    const failed = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_declined' });
    expect(failed.status).toBe(402);
    expect(failed.body.reference).toBe('SIGNUP_PAYMENT_FAILED');
    expect(jsynq.workspaces.size).toBe(0);
    expect(await TrialClaimModel.countDocuments()).toBe(0);
    expect((await SignupModel.findOne({ email: 'ana@loja.com' }).lean())?.state).toBe('failed');

    stripe.addCard('pm_card_good');
    const ok = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).send({ paymentMethodId: 'pm_card_good' });
    expect(ok.status).toBe(201);
  });

  it('one trial per card', async () => {
    const a = await signUp('one@a.com');
    stripe.addCard('pm_shared', 'fp_same');
    await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${a.body.accessToken}`).send({ paymentMethodId: 'pm_shared' }).expect(201);
    const b = await signUp('two@b.com');
    stripe.addCard('pm_shared_2', 'fp_same');
    const res = await request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${b.body.accessToken}`).send({ paymentMethodId: 'pm_shared_2' });
    expect(res.status).toBe(409);
    expect(res.body.reference).toBe('SIGNUP_TRIAL_ALREADY_USED');
  });

  it('reconcile retries limits JSYNQ did not acknowledge', async () => {
    const owner = 'b'.repeat(24);
    const ws = jsynq.addWorkspace(owner);
    await SubscriptionModel.create({ workspaceId: ws, userId: owner, stripeCustomerId: 'cus_x', status: 'active' });
    await EntitlementModel.create({ workspaceId: ws, tier: 'attende_starter', status: 'active', limits: { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 }, currentPeriodEnd: new Date(Date.now() + 86_400_000) });
    jsynq.failures[`PUT /api/partner/v1/workspaces/${ws}/limits`] = 400;
    const billing = new BillingService({ stripe, partner: partnerClient(PARTNER_KEY), now: () => new Date() });
    expect(await billing.syncLimits(ws)).toBe(false);
    expect(jsynq.limits.has(ws)).toBe(false);
    const out = await billing.reconcile();
    expect(out.limits).toBe(1);
    expect(jsynq.limits.get(ws)).toMatchObject({ status: 'active', rateLimitProfile: 'standard' });
  });

  it('advanced automation: inbound routing, a signed inbound call and per-step actions on the JSYNQ partner API', async () => {
    const owner = '1'.repeat(24);
    const COL = '2'.repeat(24);
    const BOARD = '4'.repeat(24);
    const workspaceId = jsynq.addWorkspace(owner);
    const sessionId = jsynq.addSession(workspaceId, 'whatsapp');
    await EntitlementModel.create({ workspaceId, tier: 'attende_starter', status: 'active', limits: { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 } });
    const auth = { Authorization: `Bearer ${userToken({ id: owner, workspaceId })}` };
    // The webhook endpoint is registered first: the inbound URL must be on its origin.
    await partnerClient(PARTNER_KEY).createWebhookEndpoint({ url: 'https://attende-api.test/jsynq/webhooks', events: ['channel.connected'] });

    // A URL on another origin is refused by JSYNQ.
    const wrong = jsynqConversationGateway(PARTNER_KEY, { inboundUrl: 'https://elsewhere.test/jsynq/inbound' });
    await expect(wrong.setInboundRouting(workspaceId, [{ channel: 'whatsapp', sessionId }])).rejects.toMatchObject({ status: 422 });

    const gateway = jsynqConversationGateway(PARTNER_KEY, { inboundUrl: 'https://attende-api.test/jsynq/inbound' });
    const runtime = createAutomationsRuntime({ gateway })!;
    const withRuntime = createApp({ stripe, partner: partnerClient(PARTNER_KEY), user: userClient, mailer, now: () => new Date() }, runtime);
    jsynq.conversations.set('c1', { contactName: 'Ana', linkedCardId: 'card1', vars: { 'lead.name': 'Ana' } });

    const created = await request(withRuntime)
      .post('/api/messaging-automations/advanced')
      .set(auth)
      .send({
        name: 'Qualificação',
        status: 'active',
        trigger: { kind: 'new_conversation', dedupeDays: 0 },
        channels: [{ channel: 'whatsapp', enabledSessionIds: [sessionId] }],
        startNodeId: 'ask',
        nodes: [
          { id: 'ask', kind: 'send_message', x: 0, y: 0, text: 'Oi {{lead.name}}! Quer falar com vendas?', replyMode: 'buttons', options: [{ id: 'yes', label: 'Sim' }, { id: 'no', label: 'Não' }] },
          { id: 'mv', kind: 'move_stage', x: 0, y: 100, columnId: COL, projectId: '3'.repeat(24) },
          { id: 'mv2', kind: 'move_stage', x: 0, y: 150, columnId: COL, boardId: BOARD },
          { id: 'ho', kind: 'handoff', x: 0, y: 200, message: 'Vou chamar alguém.', assignMode: 'member_list', userIds: [owner] },
        ],
        edges: [
          { id: 'e1', from: 'ask', output: 'yes', to: 'mv' },
          { id: 'e2', from: 'mv', output: 'next', to: 'mv2' },
          { id: 'e3', from: 'mv2', output: 'next', to: 'ho' },
        ],
      });
    expect(created.status).toBe(201);
    expect(jsynq.inboundRouting.get(workspaceId)).toEqual({ url: 'https://attende-api.test/jsynq/inbound', sessions: [{ channel: 'whatsapp', sessionId }] });

    const inbound = (body: Record<string, unknown>) => {
      const raw = JSON.stringify({ workspaceId, channel: 'whatsapp', sessionId, conversationId: 'c1', ...body });
      return request(withRuntime)
        .post('/api/jsynq/inbound')
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'JSYNQ-Webhooks/1.0')
        .set('X-Jsynq-Signature', signPayload(JSYNQ_WEBHOOK_SECRET, raw, Math.floor(Date.now() / 1000)))
        .send(raw);
    };

    // JSYNQ's payload: no optionId, ever.
    expect((await inbound({ messageId: 'wamid.1', text: 'oi', firstInbound: true })).body).toEqual({ handled: true });
    const runId = (await AutomationRunModel.findOne({ conversationId: 'c1' }).lean())!.run!.runId;
    expect(jsynq.actions).toEqual([{ method: 'POST', path: `/workspaces/${workspaceId}/conversations/whatsapp/c1/messages`, body: { text: 'Oi Ana! Quer falar com vendas?\n\n1. Sim\n2. Não' }, key: `${runId}:ask:wamid.1` }]);

    // Media without text: not an answer to the buttons, the run keeps waiting and owns the message.
    expect((await inbound({ messageId: 'wamid.2', text: '', firstInbound: false })).body).toEqual({ handled: true });
    expect(jsynq.actions).toHaveLength(1);

    // A redelivery of the same message is a no-op.
    expect((await inbound({ messageId: 'wamid.1', text: 'oi', firstInbound: true })).body).toEqual({ handled: true });
    expect(jsynq.actions).toHaveLength(1);

    expect((await inbound({ messageId: 'wamid.3', text: 'Sim' })).body).toEqual({ handled: true });
    const conv = `/workspaces/${workspaceId}/conversations/whatsapp/c1`;
    expect(jsynq.actions.slice(1)).toEqual([
      // Same column twice in one run: two steps, two keys, both moves run (no replay).
      { method: 'POST', path: `${conv}/card/move`, body: { columnId: COL }, key: `${runId}:mv:wamid.3` },
      { method: 'POST', path: `${conv}/card/move`, body: { columnId: COL, boardId: BOARD }, key: `${runId}:mv2:wamid.3` },
      { method: 'POST', path: `${conv}/messages`, body: { text: 'Vou chamar alguém.' }, key: `${runId}:ho:wamid.3:message` },
      { method: 'POST', path: `${conv}/handoff`, body: { assignMode: 'member_list', userIds: [owner], reason: 'Advanced automation handoff' }, key: `${runId}:ho:wamid.3` },
    ]);
    expect((await AutomationRunModel.findOne({ conversationId: 'c1' }).lean())?.run?.status).toBe('handed_off');
    // Nothing called the endpoints JSYNQ does not have.
    expect(jsynq.calls.some((c) => /evaluate-condition|\/extract$/.test(c))).toBe(false);
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
  });
});
