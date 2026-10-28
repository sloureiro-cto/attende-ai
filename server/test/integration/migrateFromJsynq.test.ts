import mongoose, { Types } from 'mongoose';
import { resetEnvCache } from '../../config/env';
import { AgentSetupModel } from '../../modules/agents/models';
import { EntitlementModel, PlanModel } from '../../modules/billing/models';
import { SignupModel, TrialClaimModel } from '../../modules/signup/models';
import { migrateFromJsynq } from '../../scripts/migrate-from-jsynq';
import { FakeJsynq } from '../helpers/fakeJsynq';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';

/** The old JSYNQ database lives in another database of the same in-memory server. */
describe('scripts/migrate-from-jsynq', () => {
  let jsynq: FakeJsynq;
  let source: NonNullable<mongoose.Connection['db']>;
  const userId = new Types.ObjectId();
  let jsynqWs: string;
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
    jsynqWs = jsynq.addWorkspace(String(userId));
    const ent = (tier: string) => ({ attende: { tier, status: 'trialing', limits: { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 }, trialEndsAt: new Date('2026-11-01T00:00:00Z'), trialOutboundCap: 50, trialOutboundUsed: 3 } });
    await source.collection('workspaces').insertMany([
      { _id: new Types.ObjectId(jsynqWs), name: 'Clínica', entitlements: ent('attende_starter') },
      { _id: legacyWs, name: 'Legacy', entitlements: ent('attende_growth') },
      { _id: new Types.ObjectId(), name: 'Plain JSYNQ workspace' },
    ]);
    await source.collection('users').insertOne({ _id: userId, name: 'Maria Souza', email: 'maria@clinica.com.br' });
    await source.collection('plans').insertMany([
      { slug: 'attende_starter', title: 'Starter', active: true, rules: { bots: { enabled: true, lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 } }, stripe: { products: [{ id: 'prod_1' }], prices: [{ id: 'price_1', currency: 'brl', interval: 'month', amount: 19700, active: true }] } },
      { slug: 'pro', title: 'Pro', rules: {} },
    ]);
    await source.collection('attendee_signups').insertMany([
      { userId, email: 'maria@clinica.com.br', canonicalEmail: 'maria@clinica.com.br', businessName: 'Clínica', locale: 'pt', state: 'trial_started', workspaceId: new Types.ObjectId(jsynqWs), startAttempts: 1, createdAt: new Date('2026-10-01T00:00:00Z') },
      { userId: new Types.ObjectId(), email: 'pending@x.com', canonicalEmail: 'pending@x.com', businessName: 'X', state: 'pending_verification' },
    ]);
    await source.collection('attendee_trial_claims').insertOne({ kind: 'card', key: 'a'.repeat(64), userId, workspaceId: new Types.ObjectId(jsynqWs), status: 'consumed' });
    await source.collection('attende_agent_setups').insertOne({
      workspaceId: new Types.ObjectId(jsynqWs),
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
    const report = await migrateFromJsynq({ source, apply: false });
    expect(report.counts).toEqual({
      agentSetups: { found: 1, inserted: 1 },
      signups: { found: 2, inserted: 1 },
      trialClaims: { found: 1, inserted: 1 },
      entitlements: { found: 2, inserted: 2 },
      plans: { found: 1, inserted: 1 },
    });
    expect(report.workspaces).toEqual([jsynqWs, String(legacyWs)]);
    expect(await EntitlementModel.countDocuments()).toBe(0);
    expect(await AgentSetupModel.countDocuments()).toBe(0);
    expect(jsynq.calls).toEqual([]);
    expect(await snapshot()).toEqual(before);
  });

  it('apply: copies, lists the workspaces needing a JSYNQ plan, never calls JSYNQ, and is re-runnable', async () => {
    const before = await snapshot();
    const report = await migrateFromJsynq({ source, apply: true });
    expect(report.workspaces).toEqual([jsynqWs, String(legacyWs)]);
    expect(jsynq.calls).toEqual([]);

    expect(await EntitlementModel.findOne({ workspaceId: jsynqWs }).lean()).toMatchObject({ tier: 'attende_starter', status: 'trialing', trialOutboundCap: 50, limits: { lines: 1, docs: 20 } });

    const signup = await SignupModel.findOne({ email: 'maria@clinica.com.br' }).lean();
    expect(signup).toMatchObject({ name: 'Maria Souza', state: 'trial_started', userId: String(userId), workspaceId: jsynqWs });
    expect(await SignupModel.countDocuments({ email: 'pending@x.com' })).toBe(0);
    expect(await TrialClaimModel.findOne({ kind: 'card' }).lean()).toMatchObject({ key: 'a'.repeat(64), userId: String(userId), status: 'consumed' });
    const setup = await AgentSetupModel.findOne({ workspaceId: jsynqWs }).lean();
    expect(setup).toMatchObject({ state: 'ready', templateKey: 'sdr', clientRequestId: 'req-0001-abcd', createdBy: String(userId) });
    expect(typeof setup!.lines[0]!.sessionId).toBe('string');
    expect(typeof setup!.documents[0]!.documentId).toBe('string');
    expect(await PlanModel.findOne({ slug: 'attende_starter' }).lean()).toMatchObject({ title: 'Starter', limits: { agents: 1 }, prices: [{ id: 'price_1', amount: 19700 }] });
    expect(await PlanModel.countDocuments({ slug: 'pro' })).toBe(0);

    // The JSYNQ database is untouched.
    expect(await snapshot()).toEqual(before);

    // Re-run: nothing new, and newer local data is never overwritten.
    await EntitlementModel.updateOne({ workspaceId: jsynqWs }, { $set: { status: 'active' } });
    const again = await migrateFromJsynq({ source, apply: true });
    expect(Object.values(again.counts).every((c) => c.inserted === 0)).toBe(true);
    expect((await EntitlementModel.findOne({ workspaceId: jsynqWs }).lean())?.status).toBe('active');
  });
});
