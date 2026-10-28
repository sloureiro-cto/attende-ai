import request from 'supertest';
import { resetEnvCache } from '../../config/env';
import { userClient } from '../../lib/jsynq';
import { LeaseModel } from '../../lib/lease';
import { clearMembershipCache } from '../../middleware/auth';
import { AgentSetupModel } from '../../modules/agents/models';
import { AgentPauseModel, EntitlementModel, SubscriptionModel, UsageCounterModel } from '../../modules/billing/models';
import { runReportsJob } from '../../modules/reports/job';
import type { WorkerEvent } from '../../modules/worker/events';
import { AiHandoffModel, SeenMessageModel } from '../../modules/worker/models';
import { Worker } from '../../modules/worker/worker';
import { createApp } from '../helpers/app';
import { testDeps } from '../helpers/deps';
import { FakeJsynq } from '../helpers/fakeJsynq';
import type { FakeConversation } from '../helpers/fakeJsynqCrm';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

const hex = (c: string) => c.repeat(24);

async function waitFor(cond: () => boolean | Promise<boolean>, what: string, ms = 8000): Promise<void> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`timed out waiting for ${what}`);
}

describe('worker: JSYNQ websocket + safety poll -> automations, AI quota, handoff assignee', () => {
  let jsynq: FakeJsynq;
  let workspaceId: string;
  let sessionId: string;
  let projectId: string;
  let columns: string[];
  let conv: FakeConversation;
  let cardId: string;
  let offsetMs: number;
  let workers: Worker[];
  let events: WorkerEvent[];
  const owner = hex('a');
  const member = hex('b');
  const now = () => new Date(Date.now() + offsetMs);
  const app = () => createApp(testDeps({ now }), null);
  const auth = () => ({ Authorization: `Bearer ${userToken({ id: owner, workspaceId })}` });

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
    offsetMs = 0;
    workers = [];
    events = [];
    workspaceId = jsynq.addWorkspace(owner, [member]);
    sessionId = jsynq.addSession(workspaceId, 'whatsapp', 'connected');
    projectId = hex('c');
    const board = jsynq.crm.addBoard(workspaceId, projectId);
    columns = board.columns;
    cardId = jsynq.crm.addCard({ workspaceId, project: projectId, board: board.boardId, column: columns[0]! })._id;
    const at = new Date(Date.now() - 60 * 60_000).toISOString();
    conv = {
      _id: hex('d'),
      workspaceId,
      channel: 'whatsapp',
      sessionId,
      createdAt: at,
      lastMessageAt: at,
      lastMessageDirection: 'outbound',
      contactName: 'Ana Souza',
      contactPhone: '+5511999990000',
      linkedEntityType: 'card',
      linkedEntityId: cardId,
      crmProjectId: projectId,
      assignedUserId: null,
    };
    jsynq.crm.conversations.push(conv);
    await EntitlementModel.create({ workspaceId, tier: 'attende_starter', status: 'active', limits: { lines: 3, agents: 3, aiRepliesPerMonth: 1000, seats: 3, docs: 20 } });
    await SubscriptionModel.create({ workspaceId, userId: owner, stripeCustomerId: 'cus_test', status: 'active' });
  });

  afterEach(async () => {
    await Promise.all(workers.map((w) => w.stop()));
  });

  const makeWorker = (over: Partial<ConstructorParameters<typeof Worker>[0]> = {}) => {
    const w = new Worker({
      deps: { user: userClient, now },
      wsUrl: jsynq.wsUrl,
      runtimeEnabled: true,
      reportsEnabled: false,
      // Polls and timers are driven by the tests; the lease and reconnects are fast.
      intervals: { leaseTtlMs: 1500, leaseRenewMs: 50, workspacesMs: 3_600_000, pollMs: 3_600_000, timersMs: 3_600_000, socketMinBackoffMs: 20, socketMaxBackoffMs: 100 },
      onEvent: (e) => events.push(e),
      ...over,
    });
    workers.push(w);
    return w;
  };
  const connected = async (w: Worker) => {
    w.start();
    await waitFor(() => w.leader && !!w.socketOf(workspaceId)?.connected && jsynq.sockets.some((s) => s.userId === owner && s.handshakes > 0), 'socket handshake');
  };
  const contactSays = (text: string, c = conv) => jsynq.crm.addMessage(c, { direction: 'inbound', senderType: 'contact', content: text });
  const outbound = () => jsynq.crm.messages.filter((m) => m.conversationId === conv._id && m.direction === 'outbound');
  const createAutomation = async (body: Record<string, unknown>) => {
    const res = await request(app())
      .post('/api/messaging-automations/advanced')
      .set(auth())
      .send({ status: 'active', trigger: { kind: 'new_conversation', dedupeDays: 0 }, channels: [{ channel: 'whatsapp', enabledSessionIds: [sessionId] }], ...body });
    return res;
  };
  const tickTimers = (w: Worker) => w.automations!.jobs[0]!.run();

  it('events reach the runtime with the full text; the socket authenticates with a server-minted token', async () => {
    const created = await createAutomation({
      name: 'Boas-vindas',
      startNodeId: 'hello',
      nodes: [{ id: 'hello', kind: 'send_message', x: 0, y: 0, text: 'Oi {{lead.name}}!', replyMode: 'none' }],
      edges: [],
    });
    expect(created.status).toBe(201);
    const w = makeWorker();
    await connected(w);
    // The token is the owner's, scoped to the workspace (JSYNQ verifies it with AUTH_SECRET).
    expect(jsynq.refusedSockets).toBe(0);
    expect(jsynq.sockets.find((s) => s.room === `messaging-inbox:${workspaceId}`)?.userId).toBe(owner);

    const long = 'Olá, gostaria de saber o preço do plano anual para a minha empresa';
    const m = contactSays(long);
    await waitFor(() => outbound().some((o) => o.content === 'Oi Ana Souza!'), 'the automation reply');
    await waitFor(() => events.some((e) => e.type === 'inbound_message'), 'the inbound event');
    const inbound = events.find((e) => e.type === 'inbound_message' && e.messageId === m._id);
    expect(inbound).toMatchObject({ type: 'inbound_message', text: long, firstInbound: true, sessionId, conversationId: conv._id });
    // The websocket preview is cut at 40 characters: the text came from the messages endpoint.
    expect(jsynq.calls).toContain(`GET /api/whatsapp-lite/sessions/${sessionId}/conversations/${conv._id}/messages`);
    // The automation's own message comes back as `self`, never as a human reply.
    await waitFor(() => events.some((e) => e.type === 'message_sent' && e.by === 'self'), 'own message event');
  });

  it('reconnects with backoff and the catch-up poll recovers what the socket missed; every message is handled once', async () => {
    const w = makeWorker({ runtimeEnabled: false });
    await connected(w);

    // Missed: the socket is down while the contact writes.
    jsynq.muteSockets = true;
    jsynq.dropSockets();
    const missed = contactSays('mensagem enquanto o socket caiu');
    jsynq.muteSockets = false;
    await waitFor(() => jsynq.sockets.length === 1 && jsynq.sockets[0]!.handshakes > 0, 'reconnect');
    await waitFor(() => events.some((e) => e.type === 'inbound_message' && e.messageId === missed._id), 'catch-up of the missed message');

    // Dedup: the same message again through the socket and the poll is not handled twice.
    const live = contactSays('segunda mensagem');
    await waitFor(() => events.some((e) => e.type === 'inbound_message' && e.messageId === live._id), 'live message');
    jsynq.broadcast(workspaceId, 'messaging-inbox:new-inbound-message', { workspaceId, channel: 'whatsapp', sessionId, conversationId: conv._id, messageId: live._id, lastInboundAt: live.createdAt });
    await w.pollAll();
    await w.sync.idle();
    const count = (id: string) => events.filter((e) => e.type === 'inbound_message' && e.messageId === id).length;
    expect(count(missed._id)).toBe(1);
    expect(count(live._id)).toBe(1);
    expect(await SeenMessageModel.countDocuments({ workspaceId })).toBe(2);
    expect(events.find((e) => e.type === 'inbound_message' && e.messageId === live._id)).toMatchObject({ firstInbound: false });
  });

  it('runs a whole automation: inbound -> reply -> wait -> no reply -> move card -> handoff to a person, who is assigned', async () => {
    const created = await createAutomation({
      name: 'Qualificação',
      startNodeId: 'hello',
      nodes: [
        { id: 'hello', kind: 'send_message', x: 0, y: 0, text: 'Oi {{lead.name}}, tudo bem?', replyMode: 'none' },
        { id: 'pause', kind: 'wait', x: 0, y: 100, minutes: 5 },
        { id: 'ask', kind: 'send_message', x: 0, y: 200, text: 'Qual é o seu orçamento?', replyMode: 'free', noReplyMinutes: 10 },
        { id: 'move', kind: 'move_stage', x: 0, y: 300, columnId: columns[1], projectId },
        { id: 'tag', kind: 'add_label', x: 0, y: 350, labelText: 'Sem resposta' },
        { id: 'human', kind: 'handoff', x: 0, y: 400, message: 'Vou chamar alguém do time.', assignMode: 'specific_user', specificUserId: member },
      ],
      edges: [
        { id: 'e1', from: 'hello', output: 'next', to: 'pause' },
        { id: 'e2', from: 'pause', output: 'next', to: 'ask' },
        { id: 'e3', from: 'ask', output: 'no_reply', to: 'move' },
        { id: 'e4', from: 'move', output: 'next', to: 'tag' },
        { id: 'e5', from: 'tag', output: 'next', to: 'human' },
      ],
    });
    expect(created.status).toBe(201);
    const w = makeWorker();
    await connected(w);

    contactSays('Oi, vi o anúncio');
    await waitFor(() => outbound().some((o) => o.content === 'Oi Ana Souza, tudo bem?'), 'first reply');
    await tickTimers(w);
    expect(outbound()).toHaveLength(1); // the wait is not over

    offsetMs = 6 * 60_000;
    await tickTimers(w);
    expect(outbound().map((o) => o.content)).toEqual(['Oi Ana Souza, tudo bem?', 'Qual é o seu orçamento?']);

    offsetMs = 17 * 60_000;
    await tickTimers(w);
    const card = jsynq.crm.cards.find((c) => c._id === cardId)!;
    expect(card.column).toBe(columns[1]);
    const label = jsynq.crm.labels.find((l) => l.text === 'Sem resposta');
    expect(label).toBeDefined();
    expect(card.labels).toContain(label!._id);
    expect(outbound().map((o) => o.content)).toContain('Vou chamar alguém do time.');
    expect(conv.conversationState).toBe('human_handoff');
    expect(jsynq.crm.assigns).toEqual([{ conversationId: conv._id, userId: member }]);
    expect(conv.assignedUserId).toBe(member);

    // A timer delivered again changes nothing (the run ended).
    await tickTimers(w);
    expect(outbound()).toHaveLength(3);
  });

  it('a handoff to AI creates a conversation binding, removed when an automation takes the conversation back', async () => {
    const agentId = hex('e');
    jsynq.agents.set(agentId, { id: agentId, workspaceId, name: 'Closer', description: '', systemPrompt: 'x', isActive: true, body: {} });
    const toAi = await createAutomation({
      name: 'Para a IA',
      startNodeId: 'hello',
      nodes: [
        { id: 'hello', kind: 'send_message', x: 0, y: 0, text: 'Vou te passar para a nossa assistente.', replyMode: 'none' },
        { id: 'ai', kind: 'handoff', x: 0, y: 100, to: 'ai', agentId },
      ],
      edges: [{ id: 'e1', from: 'hello', output: 'next', to: 'ai' }],
    });
    expect(toAi.status).toBe(201);
    const unknownAgent = await createAutomation({
      name: 'Agente inexistente',
      status: 'draft',
      startNodeId: 'ai',
      nodes: [{ id: 'ai', kind: 'handoff', x: 0, y: 0, to: 'ai', agentId: hex('f') }],
      edges: [],
    });
    expect(unknownAgent.status).toBe(400);
    const back = await createAutomation({
      name: 'De volta',
      trigger: { kind: 'manual', dedupeDays: 0 },
      startNodeId: 'hi',
      nodes: [{ id: 'hi', kind: 'send_message', x: 0, y: 0, text: 'Voltei.', replyMode: 'none' }],
      edges: [],
    });
    expect(back.status).toBe(201);

    const w = makeWorker();
    await connected(w);
    contactSays('quero falar com alguém');
    await waitFor(() => [...jsynq.bindings.values()].some((b) => b.targetType === 'conversation'), 'conversation binding');
    const binding = [...jsynq.bindings.values()].find((b) => b.targetType === 'conversation')!;
    expect(binding).toMatchObject({ agentId, channel: 'whatsapp', sessionId, targetId: conv._id, status: 'active' });
    expect(binding.policy).toMatchObject({ workspaceAccess: 'none', allowMessagingOtherContacts: false });
    expect(await AiHandoffModel.countDocuments({ conversationId: conv._id })).toBe(1);

    const started = await w.automations!.runtime.startAutomation({ workspaceId, channel: 'whatsapp', conversationId: conv._id, sessionId, automationId: back.body.data.id });
    expect(started).toEqual({ started: true });
    expect([...jsynq.bindings.values()].some((b) => b.targetType === 'conversation')).toBe(false);
    expect(await AiHandoffModel.countDocuments({})).toBe(0);
    expect(outbound().map((o) => o.content)).toContain('Voltei.');
  });

  it('counts AI replies from the stream and pauses the agents at the quota', async () => {
    await EntitlementModel.updateOne({ workspaceId }, { $set: { 'limits.aiRepliesPerMonth': 2 } });
    const agentId = hex('e');
    const bindingId = 'bind-agent';
    jsynq.bindings.set(bindingId, { _id: bindingId, workspaceId, agentId, channel: 'whatsapp', sessionId, targetType: 'all_inbound', status: 'active', policy: {} });
    await AgentSetupModel.create({
      workspaceId,
      agentId,
      templateKey: 'sdr',
      form: { handoff: { triggers: [], keywords: [] } },
      lines: [{ channel: 'whatsapp', sessionId, bindingId }],
      clientRequestId: 'req-1',
      state: 'ready',
      createdBy: owner,
    });
    const w = makeWorker({ runtimeEnabled: false });
    await connected(w);

    const aiReply = (text: string) => jsynq.crm.addMessage(conv, { direction: 'outbound', senderType: 'agent', agentExecutionId: hex('9'), senderAgent: { source: 'agent' }, content: text });
    jsynq.crm.addMessage(conv, { direction: 'outbound', senderType: 'agent', senderAgent: { source: 'inbound_rule' }, content: 'template rule' });
    aiReply('Resposta 1');
    await waitFor(async () => ((await UsageCounterModel.findOne({ workspaceId }).lean())?.aiReplies ?? 0) === 1, 'first AI reply counted');
    expect(jsynq.bindings.get(bindingId)!.status).toBe('active');
    aiReply('Resposta 2');
    await waitFor(() => jsynq.bindings.get(bindingId)!.status === 'paused', 'agents paused at the quota');
    expect((await AgentPauseModel.findOne({ workspaceId }).lean())?.reasons).toEqual(['ai_quota']);
    // The template rule is an automation message, not an AI reply.
    expect(events.filter((e) => e.type === 'message_sent' && e.by === 'automation')).toHaveLength(1);
    expect((await UsageCounterModel.findOne({ workspaceId }).lean())?.aiReplies).toBe(2);
  });

  it('"quem assume": assigns the configured member on human_handoff, never overwriting and skipping members who left', async () => {
    const agentId = hex('e');
    const bindingId = 'bind-agent';
    jsynq.bindings.set(bindingId, { _id: bindingId, workspaceId, agentId, channel: 'whatsapp', sessionId, targetType: 'all_inbound', status: 'active', policy: {} });
    await AgentSetupModel.create({
      workspaceId,
      agentId,
      templateKey: 'sdr',
      form: { handoff: { triggers: [], keywords: [], target: { kind: 'user', userId: member } } },
      lines: [{ channel: 'whatsapp', sessionId, bindingId }],
      clientRequestId: 'req-1',
      state: 'ready',
      createdBy: owner,
    });
    const at = new Date().toISOString();
    const handedOff = (id: string, over: Partial<FakeConversation> = {}): FakeConversation => {
      const c: FakeConversation = { ...conv, _id: id, createdAt: at, lastMessageAt: at, conversationState: 'human_handoff', automationBindingId: bindingId, assignedUserId: null, ...over };
      jsynq.crm.conversations.push(c);
      return c;
    };
    const free = handedOff(hex('1'));
    const taken = handedOff(hex('2'), { assignedUserId: owner });
    const w = makeWorker({ runtimeEnabled: false });
    await connected(w);
    await w.pollAll();
    expect(jsynq.crm.assigns).toEqual([{ conversationId: free._id, userId: member }]);
    expect(taken.assignedUserId).toBe(owner);

    // A stale event (read before someone took the conversation) does not overwrite the fresh assignee.
    const raced = handedOff(hex('3'), { assignedUserId: owner });
    await w.handle({ type: 'conversation_state', workspaceId, channel: 'whatsapp', sessionId, conversationId: raced._id, state: 'human_handoff', assignedUserId: null, conversation: { ...raced, assignedUserId: null } });
    expect(raced.assignedUserId).toBe(owner);
    expect(jsynq.crm.assigns).toHaveLength(1);

    // The configured member left the workspace: the conversation stays with the team.
    jsynq.workspaces.get(workspaceId)!.members = [owner];
    w.clients.forget(workspaceId);
    const orphan = handedOff(hex('4'));
    await w.pollAll();
    expect(orphan.assignedUserId).toBeNull();
    expect(jsynq.crm.assigns).toHaveLength(1);

    // An AI reply that comes with a handoff is checked right away (no poll needed).
    jsynq.workspaces.get(workspaceId)!.members = [owner, member];
    w.clients.forget(workspaceId);
    const live = handedOff(hex('5'), { conversationState: 'qualifying' });
    live.conversationState = 'human_handoff';
    jsynq.crm.addMessage(live, { direction: 'outbound', senderType: 'agent', agentExecutionId: hex('9'), content: 'Vou chamar uma pessoa.' });
    await waitFor(() => live.assignedUserId === member, 'assignment after the AI handoff');
  });

  it('conflict rule: an automation cannot go active on a session with an all_inbound agent, nor an agent go live under an automation', async () => {
    const flow = { name: 'A', startNodeId: 'hi', nodes: [{ id: 'hi', kind: 'send_message', x: 0, y: 0, text: 'Oi', replyMode: 'none' }], edges: [] };
    jsynq.bindings.set('b1', { _id: 'b1', workspaceId, agentId: hex('e'), channel: 'whatsapp', sessionId, targetType: 'all_inbound', status: 'paused', policy: {} });
    const refused = await createAutomation(flow);
    expect(refused.status).toBe(409);
    expect(refused.body.details).toMatchObject({ code: 'AUTOMATION_SESSION_HAS_AGENT', sessions: [{ channel: 'whatsapp', sessionId }] });
    // A conversation-level binding (an AI handoff) is not a conflict.
    jsynq.bindings.set('b1', { ...jsynq.bindings.get('b1')!, targetType: 'conversation', targetId: conv._id });
    expect((await createAutomation(flow)).status).toBe(201);

    await AgentSetupModel.create({
      workspaceId,
      agentId: hex('e'),
      templateKey: 'sdr',
      form: { handoff: { triggers: [], keywords: [] } },
      lines: [{ channel: 'whatsapp', sessionId, bindingId: 'b1' }],
      clientRequestId: 'req-1',
      state: 'ready',
      createdBy: owner,
    });
    const setup = await AgentSetupModel.findOne({ workspaceId }).lean();
    const live = await request(app()).post(`/api/attende/agents/${setup!._id}/go-live`).set(auth());
    expect(live.status).toBe(409);
    expect(live.body.details).toMatchObject({ code: 'ATTENDE_AUTOMATION_ON_LINE' });
  });

  it('the lease keeps a second worker on standby until the first stops; the reports job runs once per window', async () => {
    const a = makeWorker({ runtimeEnabled: false });
    const b = makeWorker({ runtimeEnabled: false });
    a.start();
    await waitFor(() => a.leader, 'first worker leads');
    b.start();
    await new Promise((r) => setTimeout(r, 300));
    expect(b.leader).toBe(false);
    await waitFor(() => jsynq.sockets.length === 1 && jsynq.sockets[0]!.handshakes > 0, 'one socket');
    expect(b.status()).toMatchObject({ leader: false, workspaces: 0 });

    await a.stop();
    await waitFor(() => b.leader && !!b.socketOf(workspaceId)?.connected, 'standby takes over');
    expect((await LeaseModel.findById('worker').lean())?.holder).toBe(b.holder);
    await waitFor(() => jsynq.sockets.length === 1, 'the old socket is gone');

    const run = jest.fn(async () => ({ workspaces: 1 }));
    const deps = { user: userClient, now: () => new Date() };
    expect(await runReportsJob(deps, 'worker', run)).toEqual({ workspaces: 1 });
    expect(await runReportsJob(deps, 'cron', run)).toEqual({ skipped: 1 });
    expect(run).toHaveBeenCalledTimes(1);
    const later = { user: userClient, now: () => new Date(Date.now() + 10 * 60_000) };
    expect(await runReportsJob(later, 'cron', run)).toEqual({ workspaces: 1 });
  });
});
