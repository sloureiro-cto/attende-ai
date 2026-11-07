import request from 'supertest';
import { resetEnvCache } from '../../config/env';
import type { Deps } from '../../deps';
import { clearMembershipCache } from '../../middleware/auth';
import { AgentSetupModel } from '../../modules/agents/models';
import { AdvancedAutomationModel } from '../../modules/automations/models';
import { EntitlementModel } from '../../modules/billing/models';
import { ReportDailyStatsModel, ReportSyncStateModel } from '../../modules/reports/models';
import { ON_DEMAND_STALE_MS } from '../../modules/reports/onDemand';
import { createApp } from '../helpers/app';
import { testDeps } from '../helpers/deps';
import { FakeJsynq } from '../helpers/fakeJsynq';
import type { FakeConversation, FakeMessage } from '../helpers/fakeJsynqCrm';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

const hex = (c: string) => c.repeat(24);
const NOW = new Date('2026-10-22T12:00:00Z');
const DAY = '2026-10-20';
const at = (hhmmss: string, day = DAY) => `${day}T${hhmmss}.000Z`;

/**
 * A workspace that pays a JSYNQ plan (Attende included, `source: 'jsynq_plan'`) and whose agents were all built in
 * JSYNQ: the agents page lists them, switches their channels, and the reports count their conversations even though
 * neither the cron nor the worker ever ran.
 */
describe('JSYNQ-made agents and reports of an included workspace', () => {
  let jsynq: FakeJsynq;
  const owner = hex('7');
  const agentJ = hex('9');
  let workspaceId: string;
  let sessionId: string;
  let token: string;
  let clock: Date;
  /** Tasks the handlers handed to `deps.background` (Vercel `waitUntil` in production). */
  let background: Array<Promise<unknown>>;
  const deps: Deps = { ...testDeps({ now: () => clock }), background: (task) => void background.push(task) };
  const app = createApp(deps, null);
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const settle = async () => {
    const tasks = background.splice(0);
    await Promise.all(tasks);
    return tasks.length;
  };

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
    background = [];
    clock = NOW;
    jsynq.addUser('owner@x.com', { id: owner });
    workspaceId = jsynq.addWorkspace(owner);
    jsynq.setPlan(workspaceId, 'pro', 'active');
    token = userToken({ id: owner, workspaceId });
    sessionId = jsynq.addSession(workspaceId);
    // JSYNQ's own default assistant (isSystem) and an agent the customer built in JSYNQ, live on WhatsApp.
    const system = hex('8');
    jsynq.agents.set(system, {
      id: system,
      workspaceId,
      name: 'JSYNQ',
      description: '',
      systemPrompt: 'default',
      isActive: true,
      isSystem: true,
      body: {},
    });
    jsynq.agents.set(agentJ, {
      id: agentJ,
      workspaceId,
      name: 'Vendas JSYNQ',
      description: 'Feito no JSYNQ',
      systemPrompt: 'x',
      isActive: true,
      type: 'specialized',
      category: 'sales',
      modelConfig: { provider: 'openai', model: 'gpt-4.1-mini' },
      body: {},
    });
    jsynq.bindings.set('bind-j', {
      _id: 'bind-j',
      workspaceId,
      agentId: agentJ,
      channel: 'whatsapp',
      sessionId,
      targetType: 'all_inbound',
      status: 'active',
      policy: {},
    });
    // A conversation-level binding (an AI handoff) is not a channel of the agent.
    jsynq.bindings.set('bind-conv', {
      _id: 'bind-conv',
      workspaceId,
      agentId: agentJ,
      channel: 'whatsapp',
      sessionId,
      targetType: 'conversation',
      targetId: hex('1'),
      status: 'active',
      policy: {},
    });
  });

  describe('agents page', () => {
    it('lists Attende agents and JSYNQ-only agents apart, without JSYNQ system agents', async () => {
      const ours = hex('6');
      jsynq.agents.set(ours, {
        id: ours,
        workspaceId,
        name: 'Recepção',
        description: '',
        systemPrompt: 'y',
        isActive: true,
        body: {},
      });
      await AgentSetupModel.create({
        workspaceId,
        templateKey: 'receptionist',
        form: { businessName: 'Loja', handoff: { triggers: [], keywords: [] } },
        clientRequestId: 'req-000001',
        createdBy: owner,
        state: 'ready',
        agentId: ours,
        lines: [],
      });

      const res = await request(app).get('/api/attende/agents').set(auth()).expect(200);
      expect(res.body.data.agents.map((a: { agentId: string }) => a.agentId)).toEqual([ours]);
      expect(res.body.data.jsynqAgents).toEqual([
        {
          kind: 'jsynq',
          id: agentJ,
          agentId: agentJ,
          name: 'Vendas JSYNQ',
          description: 'Feito no JSYNQ',
          model: 'gpt-4.1-mini',
          role: 'sales',
          status: 'live',
          lines: [
            {
              channel: 'whatsapp',
              sessionId,
              bindingId: 'bind-j',
              exists: true,
              connected: true,
              label: 'Main',
              active: true,
            },
          ],
          editPath: `/agents/${agentJ}`,
        },
      ]);
      // The included workspace was discovered by the gate on that first call.
      expect(await EntitlementModel.findOne({ workspaceId }).lean()).toMatchObject({
        source: 'jsynq_plan',
        status: 'active',
      });
    });

    it('switches a JSYNQ agent channel through the binding pause / resume routes', async () => {
      const base = `/api/attende/agents/jsynq/${agentJ}/bindings/bind-j`;
      const off = await request(app).post(`${base}/pause`).set(auth()).send({}).expect(200);
      expect(off.body.data).toMatchObject({
        id: agentJ,
        status: 'paused',
        lines: [{ bindingId: 'bind-j', active: false }],
      });
      expect(jsynq.bindings.get('bind-j')?.status).toBe('paused');
      expect(jsynq.calls).toContain('POST /api/automation-bindings/bind-j/pause');

      const on = await request(app).post(`${base}/resume`).set(auth()).send({}).expect(200);
      expect(on.body.data).toMatchObject({ status: 'live', lines: [{ active: true }] });
      expect(jsynq.bindings.get('bind-j')?.status).toBe('active');
      expect(jsynq.calls).toContain('POST /api/automation-bindings/bind-j/resume');
      // The other agent's handoff binding was never touched.
      expect(jsynq.bindings.get('bind-conv')?.status).toBe('active');
    });

    it('refuses to turn a channel on where an active automation runs (the conflict rule)', async () => {
      jsynq.bindings.get('bind-j')!.status = 'paused';
      await AdvancedAutomationModel.create({
        workspaceId,
        name: 'Boas-vindas',
        status: 'active',
        channels: [{ channel: 'whatsapp', enabledSessionIds: [sessionId] }],
        trigger: {},
        createdBy: owner,
      });
      const res = await request(app).post(`/api/attende/agents/jsynq/${agentJ}/bindings/bind-j/resume`).set(auth()).send({});
      expect(res.status).toBe(409);
      expect(res.body.details).toMatchObject({
        code: 'ATTENDE_AUTOMATION_ON_LINE',
        lines: [{ channel: 'whatsapp', sessionId }],
      });
      expect(jsynq.bindings.get('bind-j')?.status).toBe('paused');
      // Turning it off is always allowed.
      jsynq.bindings.get('bind-j')!.status = 'active';
      await request(app).post(`/api/attende/agents/jsynq/${agentJ}/bindings/bind-j/pause`).set(auth()).send({}).expect(200);
    });

    it('never switches system agents, Attende agents, other agents’ bindings or handoff bindings', async () => {
      const ours = hex('6');
      jsynq.agents.set(ours, {
        id: ours,
        workspaceId,
        name: 'Recepção',
        description: '',
        systemPrompt: 'y',
        isActive: true,
        body: {},
      });
      jsynq.bindings.set('bind-ours', {
        _id: 'bind-ours',
        workspaceId,
        agentId: ours,
        channel: 'whatsapp',
        sessionId,
        targetType: 'all_inbound',
        status: 'active',
        policy: {},
      });
      await AgentSetupModel.create({
        workspaceId,
        templateKey: 'receptionist',
        form: {},
        clientRequestId: 'req-000002',
        createdBy: owner,
        state: 'ready',
        agentId: ours,
        lines: [],
      });
      const post = (agent: string, binding: string) => request(app).post(`/api/attende/agents/jsynq/${agent}/bindings/${binding}/pause`).set(auth()).send({});
      expect((await post(ours, 'bind-ours')).status).toBe(404);
      expect((await post(hex('8'), 'bind-j')).status).toBe(404);
      expect((await post(agentJ, 'bind-ours')).status).toBe(404);
      expect((await post(agentJ, 'bind-conv')).status).toBe(404);
      expect(jsynq.calls.filter((c) => c.endsWith('/pause'))).toEqual([]);
    });
  });

  describe('reports without cron or worker', () => {
    const c1 = hex('1');
    const conv = (over: Partial<FakeConversation>): FakeConversation => ({
      _id: c1,
      workspaceId,
      channel: 'whatsapp',
      sessionId,
      createdAt: at('10:00:00'),
      lastMessageAt: at('10:09:00'),
      lastMessageDirection: 'outbound',
      automationBindingId: 'bind-j',
      ...over,
    });
    const msg = (
      createdAt: string,
      direction: 'inbound' | 'outbound',
      senderType: FakeMessage['senderType'],
      over: Partial<FakeMessage> = {}
    ): FakeMessage => ({
      _id: `m${createdAt.replace(/\D/g, '').slice(0, 14)}`,
      conversationId: c1,
      direction,
      senderType,
      createdAt,
      status: 'sent',
      ...over,
    });

    beforeEach(() => {
      jsynq.crm.conversations.push(conv({}));
      jsynq.crm.messages.push(
        msg(at('10:00:00'), 'inbound', 'contact'),
        msg(at('10:00:30'), 'outbound', 'agent', { agentExecutionId: 'exec-j', senderAgent: { source: 'agent' } }),
        msg(at('10:05:00'), 'inbound', 'contact'),
        msg(at('10:09:00'), 'outbound', 'user')
      );
    });

    it('the first view says "preparing" and builds the rows of the JSYNQ-made agent in the background', async () => {
      const first = await request(app).get('/api/attende/reports/overview?from=2026-10-20&to=2026-10-22').set(auth()).expect(200);
      expect(first.body.data.status).toEqual({ state: 'preparing', lastSyncAt: null });
      expect(await settle()).toBe(1);

      const rows = await ReportDailyStatsModel.find({ workspaceId, day: DAY }).lean();
      expect(rows.find((r) => r.agentId === agentJ)).toMatchObject({ aiReplies: 1, conversationsStarted: 1 });
      expect(rows.find((r) => r.agentId === null)).toMatchObject({
        inboundMessages: 2,
        humanReplies: 1,
        conversationsActive: 1,
      });

      const ready = await request(app).get('/api/attende/reports/overview?from=2026-10-20&to=2026-10-22').set(auth()).expect(200);
      expect(ready.body.data.status.state).toBe('ready');
      expect(ready.body.data.kpis.conversations.value).toBe(1);
      expect(ready.body.data.byAgent[0]).toMatchObject({ agentId: agentJ, name: 'Vendas JSYNQ', aiReplies: 1 });
      // Fresh: the second view starts nothing.
      expect(await settle()).toBe(0);
    });

    it('runs once for parallel views and never while another run holds the workspace lease', async () => {
      // The page asks for overview and agents at once: one sync.
      await Promise.all([
        request(app).get('/api/attende/reports/overview').set(auth()).expect(200),
        request(app).get('/api/attende/reports/agents').set(auth()).expect(200),
        request(app).get('/api/attende/reports/outcomes').set(auth()).expect(200),
      ]);
      expect(await settle()).toBe(1);
      expect(jsynq.calls.filter((c) => c.includes('/messaging/inbox/conversations')).length).toBe(1);

      // Stale again, but the cron (or the worker) holds the workspace: the view does not start a second run.
      clock = new Date(NOW.getTime() + ON_DEMAND_STALE_MS + 1_000);
      await ReportSyncStateModel.updateOne({ workspaceId }, { $set: { lockedUntil: new Date(clock.getTime() + 60_000) } });
      await request(app).get('/api/attende/reports/overview').set(auth()).expect(200);
      expect(await settle()).toBe(0);

      // Lease released and still stale: the next view refreshes it.
      await ReportSyncStateModel.updateOne({ workspaceId }, { $set: { lockedUntil: null } });
      await request(app).get('/api/attende/reports/overview').set(auth()).expect(200);
      expect(await settle()).toBe(1);
      expect(jsynq.calls.filter((c) => c.includes('/messaging/inbox/conversations')).length).toBe(2);
    });

    it('the cron includes the workspace too (Attende included in its JSYNQ plan)', async () => {
      await request(app).get('/api/attende/entitlements').set(auth()).expect(200);
      const res = await request(app).get('/api/cron/reports').set('Authorization', `Bearer ${process.env.CRON_SECRET}`).expect(200);
      expect(res.body).toMatchObject({ ok: true, workspaces: 1, conversations: 1, failed: 0 });
      expect(await ReportDailyStatsModel.countDocuments({ workspaceId, agentId: agentJ })).toBeGreaterThan(0);
    });
  });
});
