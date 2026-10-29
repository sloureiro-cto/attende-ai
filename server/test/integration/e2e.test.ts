import request from 'supertest';
import type { TestApp } from '../helpers/app';
import { createApp } from '../helpers/app';
import { resetEnvCache } from '../../config/env';
import { clearMembershipCache } from '../../middleware/auth';
import { ATTENDE_PLANS } from '../../modules/billing/catalog';
import { AgentPauseModel, EntitlementModel, SubscriptionModel } from '../../modules/billing/models';
import { BillingService } from '../../modules/billing/service';
import { TIERS } from '../../modules/billing/tiers';
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
const DAY_MS = 86_400_000;
const usdPrice = (slug: keyof typeof ATTENDE_PLANS) => ATTENDE_PLANS[slug].prices.find((p) => p.currency === 'usd')!.id;
const CRON = { Authorization: 'Bearer test-cron-secret-0123456789' };

/** Each signup from its own address: the per-IP signup rate limit lives for the whole file. */
let visitor = 0;
const ip = () => `198.51.100.${(visitor += 1)}`;

describe('E2E on JSYNQ staging routes and JSYNQ Stripe: signup -> trial -> agent -> go-live -> cancel -> agents paused', () => {
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
    jsynq.useStripe(stripe);
    app = createApp(testDeps({ stripe }), null);
  });

  /** Account (JSYNQ `POST /api/users`) + the code JSYNQ e-mailed (`PATCH /api/users/verify-otp`). */
  const signUp = async (email: string, locale: 'pt' | 'en' = 'pt') => {
    await request(app)
      .post('/api/attende/signup')
      .set('x-forwarded-for', ip())
      .send({ name: 'Maria Souza', email, password: 'Senha#2026', businessName: 'Clínica Sorriso', locale })
      .expect(201);
    return request(app).post('/api/attende/signup/verify').send({ email, otp: jsynq.otpOf(email) });
  };
  /** The session NextAuth mints from the verify proof: same claims, same secret. */
  const sessionOf = (id: string, email: string, workspaceId: string | null = null) => userToken({ id, email, workspaceId });

  /** The card step: JSYNQ's SetupIntent, confirmed in the browser with JSYNQ's publishable key (attaches the card). */
  const confirmCard = async (token: string, pmId: string, opts: { fingerprint?: string; declines?: boolean } = {}) => {
    const intent = await request(app).post('/api/attende/signup/setup-intent').set('Authorization', `Bearer ${token}`).send({}).expect(200);
    expect(intent.body.clientSecret).toMatch(/^seti_cus_/);
    stripe.addCard(pmId, opts.fingerprint, { declines: opts.declines });
    stripe.confirmSetup(intent.body.clientSecret, pmId);
  };
  const startTrial = (token: string, body: Record<string, unknown>, country = 'BR') =>
    request(app).post('/api/attende/signup/start-trial').set('Authorization', `Bearer ${token}`).set('cf-ipcountry', country).send(body);

  /** A signed-up owner with a 7-day trial on `planSlug`, and the session that carries the workspace. */
  const trialOwner = async (email: string, pmId: string, planSlug = 'attende-profissional', fingerprint?: string) => {
    const verified = await signUp(email);
    const userId: string = verified.body.id;
    await confirmCard(sessionOf(userId, email), pmId, { fingerprint });
    const started = await startTrial(sessionOf(userId, email), { paymentMethodId: pmId, planSlug }).expect(201);
    const workspaceId: string = started.body.workspaceId;
    const subId = jsynq.subscriptionOf(workspaceId)!.stripeSubscriptionId!;
    return { userId, workspaceId, subId, auth: { Authorization: `Bearer ${sessionOf(userId, email, workspaceId)}` } };
  };
  /** The cron, as if `minutes` had passed (it re-reads subscriptions older than 15 min). */
  const reconcileLater = (minutes = 20) => new BillingService(testDeps({ stripe, now: () => new Date(Date.now() + minutes * 60_000) })).reconcile();

  it('BR signup: card -> 7-day trial on attende-profissional (USD) -> channel -> agent live -> cancel/resume -> ended -> agents paused', async () => {
    // 1. signup + JSYNQ's own OTP
    const verified = await signUp('maria@clinica.com.br');
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ email: 'maria@clinica.com.br', isVerified: true, workspaceId: null, signup: { state: 'verified', businessName: 'Clínica Sorriso' } });
    expect(verified.body.accessToken).toBeUndefined();
    const userId: string = verified.body.id;
    expect(jsynq.users.get(userId)).toMatchObject({ verified: true, language: 'portuguese' });
    let token = sessionOf(userId, 'maria@clinica.com.br');

    // 2. card on the JSYNQ customer, then JSYNQ's upgrade-to-trial as the owner, then the 7-day trial in Stripe
    await confirmCard(token, 'pm_card_ok');
    const customerId = jsynq.users.get(userId)!.stripeCustomerId!;
    expect(stripe.paymentMethods.get('pm_card_ok')?.customerId).toBe(customerId);
    const before = Date.now();
    const trial = await startTrial(token, { paymentMethodId: 'pm_card_ok', planSlug: 'attende-profissional' });
    expect(trial.status).toBe(201);
    expect(trial.body).toMatchObject({
      subscriptionStatus: 'trialing',
      plan: { slug: 'attende-profissional', name: 'Profissional' },
      alreadyStarted: false,
      entitlements: { status: 'trialing', tier: 'attende-profissional', source: 'attende' },
    });
    const workspaceId: string = trial.body.workspaceId;
    expect(jsynq.workspaces.get(workspaceId)).toMatchObject({ name: 'Clínica Sorriso', owner: userId, language: 'portuguese' });
    const crm = jsynq.projects.filter((p) => p.workspaceId === workspaceId);
    expect(crm).toEqual([expect.objectContaining({ title: 'Clínica Sorriso', projectType: { title: 'crm' }, columns: expect.arrayContaining(['Lead']) })]);
    expect((await SignupModel.findOne({ userId }).lean())?.crmProjectId).toBe(crm[0]!._id);
    expect(await TrialClaimModel.countDocuments({ status: 'consumed' })).toBe(2);
    expect(jsynq.calls.filter((c) => c === 'POST /api/subscriptions/upgrade-to-trial')).toHaveLength(1);

    // The workspace's JSYNQ subscription: the Attende plan, billed in USD (everyone is, for now), 7 days of trial.
    const jsub = jsynq.subscriptionOf(workspaceId)!;
    expect(jsub).toMatchObject({ planSlug: 'attende-profissional', status: 'trialing', stripePriceId: usdPrice('attende-profissional') });
    const sub = stripe.subscriptions.get(jsub.stripeSubscriptionId!)!;
    expect(sub).toMatchObject({ customerId, currency: 'usd', priceId: usdPrice('attende-profissional'), quantity: 1, status: 'trialing', defaultPaymentMethodId: 'pm_card_ok' });
    const trialMs = sub.trialEnd!.getTime() - before;
    expect(trialMs).toBeGreaterThan(7 * DAY_MS - 60_000);
    expect(trialMs).toBeLessThan(7 * DAY_MS + 60_000);
    expect(new Date(jsub.trialEndDate!).getTime()).toBe(sub.trialEnd!.getTime());
    expect(stripe.writes()).toEqual([
      { op: 'subscriptions.update', id: sub.id, update: expect.objectContaining({ trialEnd: sub.trialEnd, prorationBehavior: 'none', defaultPaymentMethodId: 'pm_card_ok' }) },
    ]);

    // idempotent retry: same workspace, nothing new in JSYNQ or Stripe
    const again = await startTrial(token, { paymentMethodId: 'pm_card_ok' });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ workspaceId, alreadyStarted: true });
    expect(jsynq.workspaces.size).toBe(1);
    expect(stripe.writes()).toHaveLength(1);

    // The frontend refreshes its session: the JWT now carries the workspace.
    token = sessionOf(userId, 'maria@clinica.com.br', workspaceId);
    const auth = { Authorization: `Bearer ${token}` };

    const ent = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(ent.body).toMatchObject({
      entitlements: { status: 'trialing', trialDaysLeft: 7, source: 'attende', tier: 'attende-profissional' },
      access: { allowed: true },
      subscription: { source: 'attende', planSlug: 'attende-profissional', status: 'trialing', price: { amount: 79, currency: 'usd', interval: 'month' }, cancelAtPeriodEnd: false, ended: false },
    });
    // JSYNQ's own seeded default agent is not an Attende agent.
    expect(ent.body.usage).toMatchObject({ aiReplies: { used: 0, limit: 5000 }, agents: { used: 0, limit: 3 }, lines: { used: 0, limit: 3 }, docs: { used: 0, limit: 100 }, trialOutbound: { used: 0, cap: 50 } });

    // 3. a channel is allowed (JSYNQ unlocked it on trialing), then an agent from a template (starts paused)
    await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'lines' }).expect(200);
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
    jsynq.pendingInvites.set(workspaceId, 3);
    await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'seats', adding: 1 }).expect(200);
    jsynq.pendingInvites.set(workspaceId, 4);
    const seats = await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'seats', adding: 1 });
    expect(seats.status).toBe(403);
    expect(seats.body.details).toMatchObject({ code: 'ATTENDE_QUOTA_EXCEEDED', resource: 'seats', limit: 5, used: 5 });
    await request(app).post('/api/attende/usage/outbound').set(auth).send({ count: 50 }).expect(200);
    const capped = await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'outbound' });
    expect(capped.status).toBe(403);
    expect(capped.body.details).toMatchObject({ resource: 'trialOutbound', limit: 50, used: 50 });

    // 6a. Cancel at the period end: Stripe flag set, JSYNQ's copy synced, still entitled, agents keep answering.
    const cancel = await request(app).post('/api/attende/billing/cancel').set(auth).send({}).expect(200);
    expect(cancel.body.data.subscription).toMatchObject({ status: 'trialing', cancelAtPeriodEnd: true });
    expect(stripe.writes().at(-1)).toEqual({ op: 'subscriptions.update', id: sub.id, update: { cancelAtPeriodEnd: true } });
    expect(jsynq.subscriptionOf(workspaceId)?.canceledAt).toBeTruthy();
    const pending = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(pending.body.access).toEqual({ allowed: true });
    expect(pending.body.subscription).toMatchObject({ cancelAtPeriodEnd: true, ended: false });
    expect(binding.status).toBe('active');

    // 6b. ...and resumes before the end.
    const resumed = await request(app).post('/api/attende/billing/resume').set(auth).send({}).expect(200);
    expect(resumed.body.data.subscription).toMatchObject({ cancelAtPeriodEnd: false });
    expect(stripe.subscriptions.get(sub.id)?.cancelAtPeriodEnd).toBe(false);
    expect(jsynq.subscriptionOf(workspaceId)?.canceledAt).toBeNull();
    expect((await request(app).get('/api/attende/entitlements').set(auth)).body.subscription).toMatchObject({ cancelAtPeriodEnd: false, canceledAt: null });

    // 6c. Canceled again, and the period ends: Stripe cancels it, JSYNQ moves the workspace to free.
    await request(app).post('/api/attende/billing/cancel').set(auth).send({}).expect(200);
    await stripe.advance(sub.id);
    expect(jsynq.subscriptionOf(workspaceId)).toMatchObject({ status: 'canceled', planSlug: 'free' });
    // The cron re-reads /subscriptions/me: canceled -> the agents' bindings are paused in JSYNQ, the app is gated.
    expect(await reconcileLater()).toMatchObject({ subscriptions: 1 });
    expect((await EntitlementModel.findOne({ workspaceId }).lean())?.status).toBe('canceled');
    expect(binding.status).toBe('paused');
    expect(await AgentPauseModel.findOne({ workspaceId }).lean()).toMatchObject({ reasons: ['access'], bindingIds: [binding._id] });
    const blocked = await request(app).get('/api/attende/agents').set(auth);
    expect(blocked.status).toBe(402);
    expect(blocked.body).toMatchObject({ reference: 'ATTENDE_SUBSCRIPTION_INACTIVE', details: { code: 'ATTENDE_SUBSCRIPTION_INACTIVE' } });
    expect((await request(app).post('/api/attende/limits/check').set(auth).send({ resource: 'lines' })).status).toBe(402);
    const after = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(after.body.access).toMatchObject({ allowed: false, code: 'ATTENDE_SUBSCRIPTION_INACTIVE' });
    // A canceled customer, not one who never subscribed.
    expect(after.body.subscription).toMatchObject({ source: 'attende', status: 'canceled', ended: true, planSlug: 'attende-profissional' });

    // Running the cron again does not pause twice or fail.
    await reconcileLater(40);
    expect(await AgentPauseModel.findOne({ workspaceId }).lean()).toMatchObject({ reasons: ['access'] });

    // 6d. Reactivation after the end is not possible here: explained, nothing sent to Stripe.
    const writes = stripe.writes().length;
    const reactivate = await request(app).post('/api/attende/billing/resume').set(auth).send({});
    expect(reactivate.status).toBe(409);
    expect(reactivate.body.reference).toBe('BILLING_SUBSCRIPTION_ENDED');
    expect(stripe.writes()).toHaveLength(writes);

    // Only staging routes were called: no partner API, no limits/usage/features/webhook endpoints.
    expect(jsynq.calls.filter((c) => /\/partner\/|\/limits|\/usage|\/features|webhook-endpoints|inbound-routing/.test(c))).toEqual([]);
  });

  it('after a subscription ended, a new signup with the same card gets no trial and can subscribe without one', async () => {
    const first = await trialOwner('ana@clinica.com.br', 'pm_ana', 'attende-essencial', 'fp_family_card');
    await request(app).post('/api/attende/billing/cancel').set(first.auth).send({}).expect(200);
    await stripe.advance(first.subId);
    await reconcileLater();
    expect((await EntitlementModel.findOne({ workspaceId: first.workspaceId }).lean())?.status).toBe('canceled');

    // A new account and workspace, the same card: the trial is refused before anything is created.
    const verified = await signUp('ana.nova@clinica.com.br');
    const token = sessionOf(verified.body.id, 'ana.nova@clinica.com.br');
    await confirmCard(token, 'pm_ana_again', { fingerprint: 'fp_family_card' });
    const upgrades = jsynq.calls.filter((c) => c === 'POST /api/subscriptions/upgrade-to-trial').length;
    const refused = await startTrial(token, { paymentMethodId: 'pm_ana_again', planSlug: 'attende-essencial' });
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ reference: 'SIGNUP_TRIAL_ALREADY_USED', details: { canSubscribeWithoutTrial: true } });
    expect(jsynq.calls.filter((c) => c === 'POST /api/subscriptions/upgrade-to-trial')).toHaveLength(upgrades);
    expect([...jsynq.workspaces.values()].filter((w) => w.owner === verified.body.id)).toEqual([]);

    // Subscribing without a trial with a card that declines: nothing is left behind.
    await confirmCard(token, 'pm_declines', { declines: true });
    const declined = await startTrial(token, { paymentMethodId: 'pm_declines', planSlug: 'attende-essencial', withoutTrial: true });
    expect(declined.status).toBe(402);
    expect(declined.body.reference).toBe('SIGNUP_PAYMENT_FAILED');
    const customer = jsynq.users.get(verified.body.id)!.stripeCustomerId;
    expect([...stripe.subscriptions.values()].filter((x) => x.customerId === customer).map((x) => x.status)).toEqual(['canceled']);
    expect([...jsynq.workspaces.values()].filter((w) => w.owner === verified.body.id)).toEqual([]);

    // ...then with a good card: upgrade-to-trial, then `trial_end: now` charges the first month at once.
    const paid = await startTrial(token, { paymentMethodId: 'pm_ana_again', planSlug: 'attende-essencial', withoutTrial: true });
    expect(paid.status).toBe(201);
    expect(paid.body).toMatchObject({ subscriptionStatus: 'active', trialEndsAt: null, entitlements: { status: 'active', tier: 'attende-essencial' } });
    const jsub = jsynq.subscriptionOf(paid.body.workspaceId)!;
    expect(jsub).toMatchObject({ planSlug: 'attende-essencial', status: 'active' });
    expect(stripe.writes().at(-1)).toMatchObject({ op: 'subscriptions.update', id: jsub.stripeSubscriptionId, update: { trialEnd: 'now', prorationBehavior: 'none', paymentBehavior: 'error_if_incomplete' } });
    expect(stripe.invoices.get(jsub.stripeSubscriptionId!)?.[0]).toMatchObject({ amountPaid: 3900, currency: 'usd' });
    // No trial claim was taken for it.
    expect(await TrialClaimModel.countDocuments({ userId: verified.body.id })).toBe(0);
  });

  it('a US signup is billed in USD, like everyone (one billing currency for now)', async () => {
    const verified = await signUp('john@shop.com', 'en');
    const token = sessionOf(verified.body.id, 'john@shop.com');
    await confirmCard(token, 'pm_john');
    const trial = await startTrial(token, { paymentMethodId: 'pm_john', planSlug: 'escala' }, 'US');
    expect(trial.status).toBe(201);
    expect(trial.body.plan).toEqual({ slug: 'attende-escala', name: 'Escala' });
    const sub = stripe.subscriptions.get(jsynq.subscriptionOf(trial.body.workspaceId)!.stripeSubscriptionId!)!;
    expect(sub).toMatchObject({ currency: 'usd', priceId: usdPrice('attende-escala') });
    const catalog = await request(app).get('/api/attende/signup/plans').set('x-forwarded-for', ip()).expect(200);
    expect(catalog.body.currency).toBe('usd');
    expect(catalog.body.plans.map((p: { prices: Array<{ currency: string; amount: number }> }) => p.prices)).toEqual([
      [{ currency: 'usd', interval: 'month', amount: 3900 }],
      [{ currency: 'usd', interval: 'month', amount: 7900 }],
      [{ currency: 'usd', interval: 'month', amount: 19900 }],
    ]);
  });

  it('a workspace on a paid JSYNQ plan gets Attende included (Profissional), with no Attende billing actions', async () => {
    const owner = '7'.repeat(24);
    const workspaceId = jsynq.addWorkspace(owner);
    jsynq.setPlan(workspaceId, 'pro', 'active');
    const auth = { Authorization: `Bearer ${userToken({ id: owner, workspaceId })}` };

    // The gate discovers it on the first call: no signup, no trial.
    await request(app).get('/api/attende/agents').set(auth).expect(200);
    const ent = await request(app).get('/api/attende/entitlements').set(auth).expect(200);
    expect(ent.body).toMatchObject({
      entitlements: { tier: 'attende-profissional', status: 'active', source: 'jsynq_plan', limits: TIERS['attende-profissional'], trialEndsAt: null },
      access: { allowed: true },
      subscription: { source: 'jsynq_plan', planSlug: 'pro', status: 'active', price: null, cancelAtPeriodEnd: false, ended: false },
    });
    expect(ent.body.usage.trialOutbound).toBeNull();

    for (const [path, body] of [
      ['/api/attende/billing/cancel', {}],
      ['/api/attende/billing/resume', {}],
      ['/api/attende/billing/change-plan', { planSlug: 'attende-escala' }],
      ['/api/attende/billing/portal', { kind: 'manage' }],
    ] as const) {
      const res = await request(app).post(path).set(auth).send(body);
      expect(res.status).toBe(409);
      expect(res.body.reference).toBe('BILLING_MANAGED_IN_JSYNQ');
    }
    expect(stripe.calls).toEqual([]);

    // The JSYNQ plan ends (JSYNQ moves the workspace to free): Attende goes with it.
    Object.assign(jsynq.subscriptionOf(workspaceId)!, { status: 'canceled', planSlug: 'free' });
    await reconcileLater();
    expect((await EntitlementModel.findOne({ workspaceId }).lean())).toMatchObject({ status: 'canceled', source: 'jsynq_plan' });
    expect((await request(app).get('/api/attende/agents').set(auth)).status).toBe(402);
  });

  it('change plan: swaps the item to the target flat price in the same currency, prorated; owner only', async () => {
    const { workspaceId, subId, auth } = await trialOwner('lu@loja.com', 'pm_lu', 'attende-essencial');
    const before = stripe.subscriptions.get(subId)!;
    expect((await request(app).get('/api/attende/entitlements').set(auth)).body.usage.agents.limit).toBe(1);

    const bad = await request(app).post('/api/attende/billing/change-plan').set(auth).send({ planSlug: 'pro' });
    expect(bad.status).toBe(422);
    const member = 'e'.repeat(24);
    jsynq.workspaces.get(workspaceId)!.members.push(member);
    const notOwner = await request(app).post('/api/attende/billing/change-plan').set('Authorization', `Bearer ${userToken({ id: member, workspaceId })}`).send({ planSlug: 'attende-escala' });
    expect(notOwner.status).toBe(403);
    expect(notOwner.body.reference).toBe('BILLING_OWNER_ONLY');

    const changed = await request(app).post('/api/attende/billing/change-plan').set(auth).send({ planSlug: 'attende-escala' }).expect(200);
    expect(changed.body.data).toMatchObject({ subscription: { planSlug: 'attende-escala', status: 'trialing' }, entitlements: { tier: 'attende-escala', limits: TIERS['attende-escala'] } });
    expect(stripe.writes().at(-1)).toEqual({
      op: 'subscriptions.update',
      id: subId,
      update: { item: { id: before.itemId, priceId: usdPrice('attende-escala'), quantity: before.quantity }, prorationBehavior: 'create_prorations' },
    });
    expect(stripe.subscriptions.get(subId)).toMatchObject({ priceId: usdPrice('attende-escala'), currency: 'usd', trialEnd: before.trialEnd });
    expect(jsynq.subscriptionOf(workspaceId)).toMatchObject({ planSlug: 'attende-escala', stripePriceId: usdPrice('attende-escala') });
    expect((await request(app).get('/api/attende/entitlements').set(auth)).body.usage.agents.limit).toBe(10);

    // Same plan again: nothing sent.
    const writes = stripe.writes().length;
    await request(app).post('/api/attende/billing/change-plan').set(auth).send({ planSlug: 'escala' }).expect(200);
    expect(stripe.writes()).toHaveLength(writes);
  });

  it('portal: the JSYNQ customer, card update flow, and only back to this app', async () => {
    const { userId, auth } = await trialOwner('bia@loja.com', 'pm_bia');
    const portal = await request(app).post('/api/attende/billing/portal').set(auth).send({ kind: 'payment_method', returnUrl: 'https://evil.example/x' }).expect(200);
    expect(portal.body.data.url).toContain(encodeURIComponent('http://app.test/billing'));
    expect(stripe.portalSessions).toEqual([{ customerId: jsynq.users.get(userId)!.stripeCustomerId, returnUrl: 'http://app.test/billing', flow: 'payment_method_update' }]);
    await request(app).post('/api/attende/billing/portal').set(auth).send({ kind: 'manage', returnUrl: 'http://app.test/billing?x=1' }).expect(200);
    expect(stripe.portalSessions[1]).toEqual({ customerId: jsynq.users.get(userId)!.stripeCustomerId, returnUrl: 'http://app.test/billing?x=1', flow: undefined });
    const noSub = jsynq.addWorkspace('6'.repeat(24));
    const none = await request(app).post('/api/attende/billing/portal').set('Authorization', `Bearer ${userToken({ id: '6'.repeat(24), workspaceId: noSub })}`).send({});
    expect(none.status).toBe(404);
    expect(none.body.reference).toBe('BILLING_NO_SUBSCRIPTION');
  });

  it('lists the invoices from JSYNQ, and an empty list without a subscription', async () => {
    const owner = 'f'.repeat(24);
    const ws = jsynq.addWorkspace(owner);
    const empty = { Authorization: `Bearer ${userToken({ id: owner, workspaceId: ws })}` };
    const none = await request(app).get('/api/attende/billing/invoices').set(empty).expect(200);
    expect(none.body).toEqual({ success: true, data: { invoices: [] } });

    const { subId, auth } = await trialOwner('rita@loja.com', 'pm_rita');
    const invoice = (n: number) => ({ id: `in_${n}`, number: `A-${n}`, created: 1792700000 - n * 86_400, amountPaid: 7900, currency: 'usd', status: 'paid', hostedInvoiceUrl: `https://invoice.stripe.test/${n}`, invoicePdf: null });
    stripe.invoices.set(subId, [invoice(3), invoice(1), invoice(2)]);
    const all = await request(app).get('/api/attende/billing/invoices').set(auth).expect(200);
    expect(all.body.data.invoices).toEqual([invoice(1), invoice(2), invoice(3)]);
    expect(jsynq.calls).toContain(`GET /api/workspaces/${jsynq.subscriptionOf([...jsynq.workspaces.keys()].at(-1)!)!.workspaceId}/billing/invoices`);
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

  it('AI-reply quota: recordAiReply pauses the agents at the limit; go-live refuses; next month resumes them', async () => {
    const owner = '9'.repeat(24);
    const workspaceId = jsynq.addWorkspace(owner);
    const sessionId = jsynq.addSession(workspaceId);
    await EntitlementModel.create({ workspaceId, tier: 'attende-essencial', status: 'active', limits: { ...STARTER_LIMITS, aiRepliesPerMonth: 3 }, currentPeriodEnd: new Date(Date.now() + 20 * 86_400_000) });
    await SubscriptionModel.create({ workspaceId, userId: owner, status: 'active' });
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
    await EntitlementModel.create({ workspaceId, tier: 'attende-essencial', status: 'active', limits: { ...STARTER_LIMITS, aiRepliesPerMonth: 1 } });
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
    await EntitlementModel.create({ workspaceId, tier: 'attende-essencial', status: 'trialing', limits: STARTER_LIMITS, trialEndsAt: new Date(Date.now() + 86_400_000) });
    await SubscriptionModel.create({ workspaceId, userId: owner, status: 'trialing' });
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

  it('existing JSYNQ account: 409 USER_EXISTS_UNMANAGED at signup, then the trial continues with that user', async () => {
    const existing = jsynq.addUser('joao@empresa.com', { id: 'a'.repeat(24) });
    const res = await request(app).post('/api/attende/signup').set('x-forwarded-for', ip()).send({ name: 'João Silva', email: 'joao@empresa.com', password: 'Senha#2026', businessName: 'Empresa', locale: 'pt' });
    expect(res.status).toBe(409);
    expect(res.body.reference).toBe('USER_EXISTS_UNMANAGED');
    // No code to verify for someone else's account.
    expect((await request(app).post('/api/attende/signup/verify').send({ email: 'joao@empresa.com', otp: '123456' })).body.reference).toBe('USER_EXISTS_UNMANAGED');

    const token = sessionOf(existing, 'joao@empresa.com');
    await confirmCard(token, 'pm_card_joao');
    const trial = await startTrial(token, { paymentMethodId: 'pm_card_joao' });
    expect(trial.status).toBe(201);
    expect(jsynq.workspaces.get(trial.body.workspaceId)?.owner).toBe(existing);
    expect(trial.body.plan.slug).toBe('attende-essencial');
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

  it('compensates when JSYNQ reports a Stripe refusal after the workspace exists, and the card can be retried', async () => {
    const verified = await signUp('ana@loja.com');
    const token = sessionOf(verified.body.id, 'ana@loja.com');
    await confirmCard(token, 'pm_card_declined');
    jsynq.failUpgradeWithStripe = 'Your card was declined.';
    const failed = await startTrial(token, { paymentMethodId: 'pm_card_declined' });
    expect(failed.status).toBe(402);
    expect(failed.body.reference).toBe('SIGNUP_PAYMENT_FAILED');
    expect(jsynq.calls.some((c) => c.startsWith('DELETE /api/workspaces/'))).toBe(true);
    expect(jsynq.workspaces.size).toBe(0);
    expect(await TrialClaimModel.countDocuments()).toBe(0);
    expect((await SignupModel.findOne({ email: 'ana@loja.com' }).lean())?.state).toBe('failed');

    await confirmCard(token, 'pm_card_good');
    const ok = await startTrial(token, { paymentMethodId: 'pm_card_good' });
    expect(ok.status).toBe(201);
    expect(jsynq.workspaces.size).toBe(1);
  });

  it('a card not on the JSYNQ customer is refused before anything is created', async () => {
    const verified = await signUp('zed@loja.com');
    const token = sessionOf(verified.body.id, 'zed@loja.com');
    stripe.addCard('pm_not_attached');
    const res = await startTrial(token, { paymentMethodId: 'pm_not_attached' });
    expect(res.status).toBe(422);
    expect(res.body.reference).toBe('SIGNUP_PAYMENT_METHOD_INVALID');
    expect(jsynq.workspaces.size).toBe(0);
  });

  it('a retry after a half-undone attempt reuses the workspace and its JSYNQ subscription (one upgrade-to-trial)', async () => {
    const verified = await signUp('rui@loja.com');
    const token = sessionOf(verified.body.id, 'rui@loja.com');
    await confirmCard(token, 'pm_card_rui');
    // Stripe fails right after JSYNQ created the subscription, and the undo cannot reach Stripe nor JSYNQ either.
    const realUpdate = stripe.updateSubscription.bind(stripe);
    const realCancel = stripe.cancelSubscriptionNow.bind(stripe);
    stripe.updateSubscription = async () => {
      throw new Error('Stripe unavailable');
    };
    stripe.cancelSubscriptionNow = async () => {
      throw new Error('Stripe unavailable');
    };
    const realDelete = jsynq.workspaces.delete.bind(jsynq.workspaces);
    jsynq.workspaces.delete = () => {
      throw new Error('JSYNQ down');
    };
    expect((await startTrial(token, { paymentMethodId: 'pm_card_rui', planSlug: 'attende-profissional' })).status).toBeGreaterThanOrEqual(400);
    jsynq.workspaces.delete = realDelete;
    stripe.updateSubscription = realUpdate;
    stripe.cancelSubscriptionNow = realCancel;
    const [orphanId] = [...jsynq.workspaces.keys()];
    expect(await OrphanWorkspaceModel.findOne({ workspaceId: orphanId }).lean()).toMatchObject({ userId: verified.body.id });
    expect(jsynq.subscriptionOf(orphanId!)).toMatchObject({ planSlug: 'attende-profissional', status: 'trialing' });

    const ok = await startTrial(token, { paymentMethodId: 'pm_card_rui', planSlug: 'attende-profissional' });
    expect(ok.status).toBe(201);
    expect(ok.body.workspaceId).toBe(orphanId);
    expect(jsynq.workspaces.size).toBe(1);
    expect(jsynq.calls.filter((c) => c === 'POST /api/subscriptions/upgrade-to-trial')).toHaveLength(1);
    // The reused subscription got the 7-day trial, not JSYNQ's 14.
    const sub = stripe.subscriptions.get(jsynq.subscriptionOf(orphanId!)!.stripeSubscriptionId!)!;
    expect(sub.trialEnd!.getTime() - Date.now()).toBeLessThan(7 * DAY_MS + 60_000);
  });

  it('a retry after a crash right after POST /api/workspaces adopts that workspace instead of creating another', async () => {
    const verified = await signUp('lia@loja.com');
    const userId: string = verified.body.id;
    await confirmCard(sessionOf(userId, 'lia@loja.com'), 'pm_card_lia');
    // The crashed attempt: JSYNQ created the workspace, the id was never saved, the lock went stale.
    const startedAt = new Date(Date.now() - 10 * 60_000);
    await SignupModel.updateOne({ userId }, { $set: { state: 'trial_starting', lockedAt: startedAt, workspaceCreateStartedAt: startedAt } });
    const crashed = jsynq.addWorkspace(userId);
    jsynq.workspaces.get(crashed)!.name = 'Clínica Sorriso';
    jsynq.workspaces.get(crashed)!.createdAt = new Date(startedAt.getTime() + 1000).toISOString();
    jsynq.setPlan(crashed, 'free');

    const ok = await startTrial(sessionOf(userId, 'lia@loja.com'), { paymentMethodId: 'pm_card_lia' });
    expect(ok.status).toBe(201);
    expect(ok.body.workspaceId).toBe(crashed);
    expect(jsynq.workspaces.size).toBe(1);
  });

  it('one trial per card', async () => {
    await trialOwner('one@a.com', 'pm_shared', 'attende-essencial', 'fp_same');
    const b = await signUp('two@b.com');
    await confirmCard(sessionOf(b.body.id, 'two@b.com'), 'pm_shared_2', { fingerprint: 'fp_same' });
    const res = await startTrial(sessionOf(b.body.id, 'two@b.com'), { paymentMethodId: 'pm_shared_2' });
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
