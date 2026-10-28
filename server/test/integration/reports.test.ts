import request from 'supertest';
import { resetEnvCache } from '../../config/env';
import { userClient } from '../../lib/jsynq';
import { clearMembershipCache } from '../../middleware/auth';
import { EntitlementModel, SubscriptionModel } from '../../modules/billing/models';
import { ReportConversationModel, ReportDailyStatsModel, ReportSyncStateModel } from '../../modules/reports/models';
import { syncWorkspaceReports } from '../../modules/reports/sync';
import { createApp } from '../helpers/app';
import { testDeps } from '../helpers/deps';
import { FakeJsynq } from '../helpers/fakeJsynq';
import type { FakeConversation, FakeMessage } from '../helpers/fakeJsynqCrm';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

/**
 * The reference fixture of the JSYNQ aggregator (`attendeReports.integration.test.ts`), served through the fake
 * inbox and message routes: the same inputs must give the same numbers.
 */
const NOW = new Date('2026-10-22T12:00:00Z');
const DAY = '2026-10-20';
const at = (hhmmss: string, day = DAY) => `${day}T${hhmmss}.000Z`;
const hex = (c: string) => c.repeat(24);

describe('reports computed in Attende from the JSYNQ inbox', () => {
  let jsynq: FakeJsynq;
  const userId = hex('a');
  const agentX = hex('9');
  const card1 = hex('c');
  const projectId = hex('b');
  let workspaceId: string;
  let token: string;
  const app = createApp(testDeps({ now: () => NOW }), null);
  const sync = (opts: Parameters<typeof syncWorkspaceReports>[2] = {}) =>
    syncWorkspaceReports(userClient(token), workspaceId, { callGapMs: 0, now: () => NOW, ...opts });
  const get = (path: string) => request(app).get(path).set('Authorization', `Bearer ${token}`);
  const messageCalls = () => jsynq.calls.filter((c) => c.endsWith('/messages')).length;

  const conv = (id: string, createdAt: string, over: Partial<FakeConversation>): FakeConversation => ({
    _id: id,
    workspaceId,
    channel: 'whatsapp',
    sessionId: hex('5'),
    createdAt,
    lastMessageAt: createdAt,
    lastMessageDirection: 'inbound',
    ...over,
  });
  const msg = (conversationId: string, createdAt: string, direction: 'inbound' | 'outbound', senderType: FakeMessage['senderType'], over: Partial<FakeMessage> = {}): FakeMessage => ({
    _id: `${conversationId.slice(0, 8)}${createdAt.replace(/\D/g, '').slice(0, 16)}`,
    conversationId,
    direction,
    senderType,
    createdAt,
    status: 'sent',
    ...over,
  });

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
    jsynq.reset();
    clearMembershipCache();
    jsynq.addUser('o@x.com', { id: userId });
    workspaceId = jsynq.addWorkspace(userId);
    token = userToken({ id: userId, workspaceId });
    await EntitlementModel.create({ workspaceId, tier: 'attende_growth', status: 'active', limits: { lines: 3, agents: 3, aiRepliesPerMonth: 5000, seats: 5, docs: 100 } });
    jsynq.agents.set(agentX, { id: agentX, workspaceId, name: 'SDR', description: '', systemPrompt: 'x', isActive: true, body: {} });
    jsynq.bindings.set('bind-x', { _id: 'bind-x', workspaceId, agentId: agentX, channel: 'whatsapp', sessionId: hex('5'), targetType: 'all_inbound', status: 'active', policy: {} });
    jsynq.crm.cards.push({ ...jsynq.crm.addCard({ workspaceId, project: projectId, board: hex('d'), column: hex('e') }), _id: card1, createdAt: at('10:01:00') });

    const [c1, c2, c3, c4] = [hex('1'), hex('2'), hex('3'), hex('4')];
    jsynq.crm.conversations.push(
      // c1: AI answers in 20 s and has the last word -> resolved_by_ai; its card is a new lead
      conv(c1, at('10:00:00'), { lastMessageAt: at('10:05:00'), lastMessageDirection: 'outbound', automationBindingId: 'bind-x', linkedEntityType: 'card', linkedEntityId: card1, crmProjectId: projectId }),
      // c2: AI answers, then a human steps in with a handoff
      conv(c2, at('11:00:00'), {
        lastMessageAt: at('11:09:00'),
        lastMessageDirection: 'outbound',
        automationBindingId: 'bind-x',
        conversationState: 'human_handoff',
        conversationStateHistory: [{ state: 'human_handoff', changedAt: at('11:08:00'), changedBy: 'rule', reason: 'Customer asked for  a human' }],
      }),
      // c3: nobody ever answers
      conv(c3, at('12:00:00'), { lastMessageAt: at('23:30:00'), lastMessageDirection: 'inbound' }),
      // c4: started two days later, still open at NOW
      conv(c4, at('11:00:00', '2026-10-22'), { lastMessageAt: at('11:30:00', '2026-10-22'), lastMessageDirection: 'inbound' })
    );
    jsynq.crm.messages.push(
      msg(c1, at('10:00:00'), 'inbound', 'contact'),
      msg(c1, at('10:00:20'), 'outbound', 'agent', { agentExecutionId: 'exec1', senderAgent: { source: 'agent' } }),
      msg(c1, at('10:02:00'), 'outbound', 'agent', { senderAgent: { source: 'inbound_rule' } }), // rule reply: no execution
      msg(c1, at('10:03:00'), 'outbound', 'agent', { agentExecutionId: 'exec1', status: 'failed' }),
      msg(c2, at('11:00:00'), 'inbound', 'contact'),
      msg(c2, at('11:00:40'), 'outbound', 'agent', { agentExecutionId: 'exec1' }),
      msg(c2, at('11:05:00'), 'inbound', 'contact'),
      msg(c2, at('11:09:00'), 'outbound', 'user'),
      msg(c3, at('12:00:00'), 'inbound', 'contact'),
      msg(c3, at('23:30:00'), 'inbound', 'contact'),
      msg(c4, at('11:00:00', '2026-10-22'), 'inbound', 'contact')
    );
  });

  it('gives the reference numbers for the reference conversations', async () => {
    const result = await sync();
    expect(result).toMatchObject({ conversations: 4, messages: 11, done: true });
    const rows = await ReportDailyStatsModel.find({ workspaceId, day: DAY }).lean();
    const x = rows.find((r) => r.agentId === agentX)!;
    const none = rows.find((r) => r.agentId === null)!;
    // Per-day activity
    expect(x).toMatchObject({ channel: 'whatsapp', aiReplies: 2, aiFailed: 1 });
    expect(none).toMatchObject({ inboundMessages: 5, humanReplies: 1, automationReplies: 1, conversationsActive: 3 });
    // Cohort: c1 + c2 belong to agent X, c3 (never answered) has no agent
    expect(x).toMatchObject({ conversationsStarted: 2, outcomeResolvedByAi: 1, outcomeHandedOff: 1, leadsCreated: 1 });
    expect(none).toMatchObject({ conversationsStarted: 1, outcomeAbandoned: 1, outcomeOpen: 0 });
    // First responses: AI 20 s and 40 s; human 9 minutes after the contact's first message (c2)
    expect(x.frAi).toMatchObject({ count: 2, sumMs: 60_000 });
    expect(x.frHuman).toMatchObject({ count: 1, sumMs: 9 * 60_000 });
    expect(x.handoffEvents).toBe(1);
    expect(x.handoffReasons).toEqual([{ reason: 'Customer asked for a human', count: 1 }]);
    // c4 started on the 22nd and is still open.
    const today = await ReportDailyStatsModel.findOne({ workspaceId, day: '2026-10-22', agentId: null }).lean();
    expect(today).toMatchObject({ conversationsStarted: 1, outcomeOpen: 1, inboundMessages: 1 });
  });

  it('serves the overview, agents and outcomes the reports page expects', async () => {
    await sync();
    const overview = await get('/api/attende/reports/overview?from=2026-10-20&to=2026-10-22');
    expect(overview.status).toBe(200);
    const o = overview.body.data;
    expect(o.status).toEqual({ state: 'ready', lastSyncAt: NOW.toISOString() });
    expect(o.range).toEqual({ from: '2026-10-20', to: '2026-10-22', days: 3 });
    expect(o.kpis.conversations.value).toBe(4);
    expect(o.kpis.aiReplies.value).toBe(2);
    expect(o.kpis.handoffRate.value).toBeCloseTo(0.25);
    // settled = 4 - 1 open; resolved 1
    expect(o.kpis.aiResolutionRate.value).toBeCloseTo(1 / 3);
    expect(o.kpis.firstResponseAiAvgMs.value).toBe(30_000);
    expect(o.kpis.afterHoursShare.value).toBeNull();
    expect(o.notAvailable).toEqual(expect.arrayContaining(['after_hours_share', 'opt_outs']));
    expect(o.byAgent[0]).toMatchObject({ agentId: agentX, name: 'SDR', conversations: 2, aiReplies: 2, leadsCreated: 1 });
    expect(o.topHandoffReasons).toEqual([{ reason: 'Customer asked for a human', count: 1 }]);
    expect(o.series.map((p: { day: string }) => p.day)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22']);

    const agents = await get('/api/attende/reports/agents?from=2026-10-20&to=2026-10-22&agentId=none');
    expect(agents.body.data.agents.map((a: { agentId: string | null }) => a.agentId)).toEqual([agentX, null]);
    const outcomes = await get(`/api/attende/reports/outcomes?from=2026-10-20&to=2026-10-22&agentId=${agentX}`);
    expect(outcomes.body.data.outcomes).toMatchObject({ total: 2 });
    expect((await get('/api/attende/reports/overview?channel=fax')).status).toBe(400);
    expect((await get('/api/attende/reports/overview?to=2026-10-23')).body.reference).toBe('REPORT_INVALID_FILTERS');
  });

  it('answers "preparing", never zeros, before the first sync finished', async () => {
    const before = await get('/api/attende/reports/overview');
    expect(before.status).toBe(200);
    expect(before.body.data.status).toEqual({ state: 'preparing', lastSyncAt: null });

    // A backfill cut short (here: two conversations per run) stays "preparing" and resumes where it stopped.
    const first = await sync({ maxConversations: 2 });
    expect(first).toMatchObject({ conversations: 2, done: false });
    expect((await get('/api/attende/reports/overview')).body.data.status.state).toBe('preparing');
    expect((await ReportSyncStateModel.findOne({ workspaceId }).lean())?.scan).toBeTruthy();
    const second = await sync({ maxConversations: 2 });
    expect(second).toMatchObject({ conversations: 2, done: true });
    const ready = await get('/api/attende/reports/overview?from=2026-10-20&to=2026-10-22');
    expect(ready.body.data.status.state).toBe('ready');
    expect(ready.body.data.kpis.conversations.value).toBe(4);
  });

  it('reads only what changed since the cursor and never counts a message twice', async () => {
    await sync();
    const calls = messageCalls();
    // Nothing new: the scan stops at the cursor, no message list is read again.
    const idle = await sync();
    expect(idle).toMatchObject({ conversations: 0, messages: 0, done: true });
    expect(messageCalls()).toBe(calls);

    // A new message in c3 (same day): only that one is read and counted.
    const later = new Date(NOW.getTime() + 60_000).toISOString();
    const c3 = jsynq.crm.conversations.find((c) => c._id === hex('3'))!;
    c3.lastMessageAt = later;
    jsynq.crm.messages.push(msg(hex('3'), later, 'outbound', 'user'));
    const next = await sync({ now: () => new Date(NOW.getTime() + 120_000) });
    expect(next).toMatchObject({ conversations: 1, messages: 1, done: true });
    const today = await ReportDailyStatsModel.findOne({ workspaceId, day: '2026-10-22', agentId: null }).lean();
    expect(today).toMatchObject({ humanReplies: 1, inboundMessages: 1 });
    const stored = await ReportConversationModel.findOne({ conversationId: hex('3') }).lean();
    expect(stored?.activeDays).toEqual(['2026-10-20', '2026-10-22']);
    // The reply is outside c3's cohort window (no first response), but the conversation is active again: its cohort
    // outcome on the 20th is `open` now, as in the reference.
    expect(await ReportDailyStatsModel.findOne({ workspaceId, day: DAY, agentId: null }).lean()).toMatchObject({ outcomeAbandoned: 0, outcomeOpen: 1, humanReplies: 1 });
    expect((await ReportConversationModel.findOne({ conversationId: hex('3') }).lean())?.firstHumanAt).toBeNull();
  });

  it('backfills 90 days only', async () => {
    const old = '2026-07-01T10:00:00.000Z';
    jsynq.crm.conversations.push(conv(hex('6'), old, { lastMessageAt: old }));
    jsynq.crm.messages.push(msg(hex('6'), old, 'inbound', 'contact'));
    const r = await sync();
    expect(r.conversations).toBe(4);
    expect(await ReportConversationModel.countDocuments({ conversationId: hex('6') })).toBe(0);
  });

  it('runs from the cron route as the workspace owner', async () => {
    await SubscriptionModel.create({ workspaceId, userId, stripeCustomerId: 'cus_test', status: 'active' });
    const res = await request(app).get('/api/cron/reports').set('Authorization', `Bearer ${process.env.CRON_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, job: 'reports', workspaces: 1, conversations: 4, failed: 0 });
    expect((await request(app).get('/api/cron/reports')).status).toBe(401);
  });
});
