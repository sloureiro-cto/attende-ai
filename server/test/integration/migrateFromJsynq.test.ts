import mongoose, { Types } from 'mongoose';
import { resetEnvCache } from '../../config/env';
import { partnerClient } from '../../lib/jsynq';
import { AgentSetupModel } from '../../modules/agents/models';
import { EntitlementModel, LimitsSyncModel, PlanModel } from '../../modules/billing/models';
import { SignupModel, TrialClaimModel } from '../../modules/signup/models';
import { migrateFromJsynq } from '../../scripts/migrate-from-jsynq';
import { FakeJsynq, PARTNER_KEY } from '../helpers/fakeJsynq';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';

/** The old JSYNQ database lives in another database of the same in-memory server. */
describe('scripts/migrate-from-jsynq', () => {
  let jsynq: FakeJsynq;
  let source: NonNullable<mongoose.Connection['db']>;
  const userId = new Types.ObjectId();
  let partnerWs: string;
  const legacyWs = new Types.ObjectId();

  beforeAll(async () => {
    await startMongo();
    jsynq = await new FakeJsynq().start();
    process.env.JSYNQ_API_URL = jsynq.url;
    resetEnvCache();
    source = mongoose.connection.useDb('jsynq-source').db!;
  });
  afterAll(async () => {
    await jsynq.stop();
    await stopMongo();
  });

  beforeEach(async () => {
    await clearMongo();
    jsynq.reset();
    await source.dropDatabase();
    partnerWs = jsynq.addWorkspace(String(userId));
    const ent = (tier: string) => ({ attende: { tier, status: 'trialing', limits: { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 }, trialEndsAt: new Date('2026-11-01T00:00:00Z'), trialOutboundCap: 50, trialOutboundUsed: 3 } });
    await source.collection('workspaces').insertMany([
      { _id: new Types.ObjectId(partnerWs), name: 'Clínica', entitlements: ent('attende_starter') },
      { _id: legacyWs, name: 'Legacy', entitlements: ent('attende_growth') },
      { _id: new Types.ObjectId(), name: 'Plain JSYNQ workspace' },
    ]);
    await source.collection('users').insertOne({ _id: userId, name: 'Maria Souza', email: 'maria@clinica.com.br' });
    await source.collection('plans').insertMany([
      { slug: 'attende_starter', title: 'Starter', active: true, rules: { bots: { enabled: true, lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 } }, stripe: { products: [{ id: 'prod_1' }], prices: [{ id: 'price_1', currency: 'brl', interval: 'month', amount: 19700, active: true }] } },
      { slug: 'pro', title: 'Pro', rules: {} },
    ]);
    await source.collection('attendee_signups').insertMany([
      { userId, email: 'maria@clinica.com.br', canonicalEmail: 'maria@clinica.com.br', businessName: 'Clínica', locale: 'pt', state: 'trial_started', workspaceId: new Types.ObjectId(partnerWs), startAttempts: 1, createdAt: new Date('2026-10-01T00:00:00Z') },
      { userId: new Types.ObjectId(), email: 'pending@x.com', canonicalEmail: 'pending@x.com', businessName: 'X', state: 'pending_verification' },
    ]);
    await source.collection('attendee_trial_claims').insertOne({ kind: 'card', key: 'a'.repeat(64), userId, workspaceId: new Types.ObjectId(partnerWs), status: 'consumed' });
    await source.collection('attende_agent_setups').insertOne({
      workspaceId: new Types.ObjectId(partnerWs),
      agentId: new Types.ObjectId(),
      templateKey: 'sdr',
      form: { businessName: 'Clínica' },
      lines: [{ channel: 'whatsapp', sessionId: new Types.ObjectId(), bindingId: new Types.ObjectId() }],
      clientRequestId: 'req-0001-abcd',
      documents: [{ documentId: new Types.ObjectId(), name: 'precos.pdf', uploadedAt: new Date() }],
      liveSince: new Date(),
      createdBy: userId,
      createdAt: new Date('2026-10-02T00:00:00Z'),
    });
  });

  const snapshot = async () => {
    const out: Record<string, unknown[]> = {};
    for (const c of await source.listCollections().toArray()) out[c.name] = await source.collection(c.name).find().sort({ _id: 1 }).toArray();
    return out;
  };

  it('dry run: counts, writes nothing and calls nothing', async () => {
    const before = await snapshot();
    const report = await migrateFromJsynq({ source, apply: false, partner: partnerClient(PARTNER_KEY) });
    expect(report.counts).toEqual({
      agentSetups: { found: 1, inserted: 1 },
      signups: { found: 2, inserted: 1 },
      trialClaims: { found: 1, inserted: 1 },
      entitlements: { found: 2, inserted: 2 },
      plans: { found: 1, inserted: 1 },
    });
    expect(report.limits.every((l) => l.result === 'skipped_dry_run')).toBe(true);
    expect(await EntitlementModel.countDocuments()).toBe(0);
    expect(await AgentSetupModel.countDocuments()).toBe(0);
    expect(jsynq.calls).toEqual([]);
    expect(await snapshot()).toEqual(before);
  });

  it('apply: copies, PUTs the limits of partner-owned workspaces, reports the others, and is re-runnable', async () => {
    const before = await snapshot();
    const report = await migrateFromJsynq({ source, apply: true, partner: partnerClient(PARTNER_KEY) });
    expect(report.limits).toEqual([
      { workspaceId: partnerWs, result: 'synced' },
      { workspaceId: String(legacyWs), result: 'not_partner_owned' },
    ]);

    expect(await EntitlementModel.findOne({ workspaceId: partnerWs }).lean()).toMatchObject({ tier: 'attende_starter', status: 'trialing', trialOutboundCap: 50, limits: { lines: 1, docs: 20 } });
    expect(jsynq.limits.get(partnerWs)).toMatchObject({ status: 'active', rateLimitProfile: 'strict', validUntil: '2026-11-01T00:00:00.000Z', limits: { messagingChannels: 1, outboundMessages: { max: 50 } } });
    expect(await LimitsSyncModel.findOne({ workspaceId: String(legacyWs) }).lean()).toBeNull();

    const signup = await SignupModel.findOne({ email: 'maria@clinica.com.br' }).lean();
    expect(signup).toMatchObject({ name: 'Maria Souza', state: 'trial_started', userId: String(userId), workspaceId: partnerWs });
    expect(await SignupModel.countDocuments({ email: 'pending@x.com' })).toBe(0);
    expect(await TrialClaimModel.findOne({ kind: 'card' }).lean()).toMatchObject({ key: 'a'.repeat(64), userId: String(userId), status: 'consumed' });
    const setup = await AgentSetupModel.findOne({ workspaceId: partnerWs }).lean();
    expect(setup).toMatchObject({ state: 'ready', templateKey: 'sdr', clientRequestId: 'req-0001-abcd', createdBy: String(userId) });
    expect(typeof setup!.lines[0]!.sessionId).toBe('string');
    expect(typeof setup!.documents[0]!.documentId).toBe('string');
    expect(await PlanModel.findOne({ slug: 'attende_starter' }).lean()).toMatchObject({ title: 'Starter', limits: { agents: 1 }, prices: [{ id: 'price_1', amount: 19700 }] });
    expect(await PlanModel.countDocuments({ slug: 'pro' })).toBe(0);

    // The JSYNQ database is untouched.
    expect(await snapshot()).toEqual(before);

    // Re-run: nothing new, and newer local data is never overwritten.
    await EntitlementModel.updateOne({ workspaceId: partnerWs }, { $set: { status: 'active' } });
    const again = await migrateFromJsynq({ source, apply: true, partner: partnerClient(PARTNER_KEY) });
    expect(Object.values(again.counts).every((c) => c.inserted === 0)).toBe(true);
    expect((await EntitlementModel.findOne({ workspaceId: partnerWs }).lean())?.status).toBe('active');
  });
});
