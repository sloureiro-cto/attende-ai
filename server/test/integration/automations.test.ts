import request from 'supertest';
import type { TestApp } from '../helpers/app';
import { createApp } from '../helpers/app';
import { resetEnvCache } from '../../config/env';
import { clearMembershipCache } from '../../middleware/auth';
import { EntitlementModel } from '../../modules/billing/models';
import { AutomationRunModel } from '../../modules/automations/models';
import { createAutomationsRuntime, type AutomationsRuntime } from '../../modules/automations/runtime/factory';
import type { ConversationGateway } from '../../modules/automations/runtime/ports';
import { automationStats } from '../../modules/automations/stats';
import { testDeps } from '../helpers/deps';
import { FakeJsynq } from '../helpers/fakeJsynq';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

class FakeGateway implements ConversationGateway {
  sent: Array<{ conversationId: string; text: string }> = [];
  handoffs: string[] = [];
  humanReplied = false;
  async context() {
    return { contactName: 'Ana', vars: { 'lead.name': 'Ana' } };
  }
  async humanRepliedSince() {
    return this.humanReplied;
  }
  async sendText(key: { conversationId: string }, text: string) {
    this.sent.push({ conversationId: key.conversationId, text });
    return { ok: true };
  }
  async sendTemplate() {
    return { ok: true };
  }
  async moveCard() {
    return { ok: true };
  }
  async addLabel() {}
  async setCardField() {}
  async handoff(key: { conversationId: string }) {
    this.handoffs.push(key.conversationId);
  }
  async businessHours() {
    return null;
  }
}

const flow = {
  name: 'Boas-vindas',
  trigger: { kind: 'new_conversation', dedupeDays: 0 },
  startNodeId: 'ask',
  nodes: [
    { id: 'ask', kind: 'send_message', x: 0, y: 0, text: 'Oi {{lead.name}}! Quer um orçamento?', replyMode: 'buttons', options: [{ id: 'yes', label: 'Sim' }, { id: 'no', label: 'Não' }], noReplyMinutes: 10 },
    { id: 'thanks', kind: 'send_message', x: 0, y: 100, text: 'Ótimo, já te mando.', replyMode: 'none' },
    { id: 'human', kind: 'handoff', x: 100, y: 100, message: 'Vou chamar alguém.' },
    { id: 'bye', kind: 'send_message', x: 200, y: 100, text: 'Qualquer coisa, chame.', replyMode: 'none' },
  ],
  edges: [
    { id: 'e1', from: 'ask', output: 'yes', to: 'thanks' },
    { id: 'e2', from: 'ask', output: 'no', to: 'human' },
    { id: 'e3', from: 'ask', output: 'no_reply', to: 'bye' },
  ],
};

describe('advanced automations: API, preview and runtime', () => {
  let jsynq: FakeJsynq;
  let gateway: FakeGateway;
  let runtime: AutomationsRuntime;
  let app: TestApp;
  let now: Date;
  let workspaceId: string;
  let sessionId: string;
  let auth: Record<string, string>;
  const owner = 'a'.repeat(24);

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
    gateway = new FakeGateway();
    now = new Date('2026-10-20T12:00:00Z');
    runtime = createAutomationsRuntime({ gateway, now: () => now })!;
    app = createApp(testDeps({ now: () => now }), runtime);
    workspaceId = jsynq.addWorkspace(owner);
    sessionId = jsynq.addSession(workspaceId, 'whatsapp', 'connected');
    await EntitlementModel.create({ workspaceId, tier: 'attende_starter', status: 'active', limits: { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 } });
    auth = { Authorization: `Bearer ${userToken({ id: owner, workspaceId })}` };
  });

  /** What the phase-4 worker does for each inbound message it reads from the JSYNQ websocket. */
  const inbound = (body: { messageId: string; text: string; firstInbound?: boolean; conversationId?: string }) =>
    runtime.runtime.onInboundMessage({ workspaceId, channel: 'whatsapp', sessionId, conversationId: 'conv1', firstInbound: false, ...body });

  it('CRUD keeps the JSYNQ-era shapes and validates sessions against JSYNQ', async () => {
    const foreign = await request(app).post('/api/messaging-automations/advanced').set(auth).send({ ...flow, channels: [{ channel: 'whatsapp', enabledSessionIds: ['f'.repeat(24)] }] });
    expect(foreign.status).toBe(400);

    const created = await request(app).post('/api/messaging-automations/advanced').set(auth).send({ ...flow, status: 'active', channels: [{ channel: 'whatsapp', enabledSessionIds: [sessionId] }] });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: 'Boas-vindas', status: 'active', version: 1, issues: [] });

    const list = await request(app).get('/api/messaging-automations/advanced').set(auth).expect(200);
    expect(list.body.data).toMatchObject({ total: 1, totals: { all: 1, active: 1 }, items: [{ stepCount: 4, stats30d: { started: 0, completed: 0 } }] });

    const id = created.body.data.id;
    const stale = await request(app).patch(`/api/messaging-automations/advanced/${id}`).set(auth).send({ name: 'x', expectedUpdatedAt: '2000-01-01T00:00:00.000Z' });
    expect(stale.status).toBe(409);
    const paused = await request(app).patch(`/api/messaging-automations/advanced/${id}`).set(auth).send({ status: 'paused' }).expect(200);
    expect(paused.body.data.status).toBe('paused');

    const bad = await request(app).post('/api/messaging-automations/advanced').set(auth).send({ ...flow, nodes: [{ ...flow.nodes[0], id: '__x' }] });
    expect(bad.status).toBe(400);
    expect(bad.body.details.issues[0]).toMatchObject({ blocking: true });

    await request(app).delete(`/api/messaging-automations/advanced/${id}`).set(auth).expect(204);
    await request(app).get(`/api/messaging-automations/advanced/${id}`).set(auth).expect(404);
  });

  it('preview runs the engine without sending anything', async () => {
    const start = await request(app).post('/api/messaging-automations/advanced/preview').set(auth).send({ automation: flow, channel: 'sms', event: { type: 'start' } }).expect(200);
    expect(start.body.data.effects).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'send_message', delivery: expect.objectContaining({ kind: 'text' }) })]));
    expect(start.body.data.state.status).toBe('waiting');
    const answer = await request(app)
      .post('/api/messaging-automations/advanced/preview')
      .set(auth)
      .send({ automation: flow, channel: 'sms', event: { type: 'inbound', text: '1' }, state: start.body.data.state })
      .expect(200);
    expect(answer.body.data.finished).toBe(true);
    expect(answer.body.data.unavailable).toEqual([]);
    expect(gateway.sent).toHaveLength(0);
  });

  it('preview: model and CRM conditions and the AI step are reported as not available', async () => {
    const ai = {
      startNodeId: 'q',
      nodes: [
        { id: 'q', kind: 'send_message', x: 0, y: 0, text: 'Qual carro?', replyMode: 'free' },
        { id: 'ai', kind: 'ai_agent', x: 0, y: 100, instruction: 'modelo do carro', saveAnswerTo: 'cf_car' },
        {
          id: 'c',
          kind: 'condition',
          x: 0,
          y: 200,
          rows: [{ id: 'hot', name: 'Quente', condition: { type: 'any', clauses: [{ type: 'llm_match', labels: ['quente', 'frio'], match: 'quente' }, { type: 'contains', value: 'urgente' }] } }],
        },
        { id: 'ok', kind: 'send_message', x: 0, y: 300, text: 'ok', replyMode: 'none' },
      ],
      edges: [
        { id: 'e1', from: 'q', output: 'answered', to: 'ai' },
        { id: 'e2', from: 'ai', output: 'not_understood', to: 'c' },
        { id: 'e3', from: 'c', output: 'hot', to: 'ok' },
      ],
    };
    const start = await request(app).post('/api/messaging-automations/advanced/preview').set(auth).send({ automation: ai, channel: 'whatsapp', event: { type: 'start' } }).expect(200);
    const res = await request(app)
      .post('/api/messaging-automations/advanced/preview')
      .set(auth)
      .send({ automation: ai, channel: 'whatsapp', event: { type: 'inbound', text: 'um corolla, urgente' }, state: start.body.data.state })
      .expect(200);
    expect(res.body.data.unavailable).toEqual([
      { kind: 'ai_step', nodeId: 'ai' },
      { kind: 'condition', type: 'llm_match' },
    ]);
    // The local clause of the `any` still matches.
    expect(res.body.data.effects).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'send_message', nodeId: 'ok' })]));
    expect(res.body.data.effects.some((e: { type: string }) => e.type === 'set_field')).toBe(false);
  });

  it('runtime: first inbound starts a run, a reply advances it, redelivery is a no-op, timers fire', async () => {
    await request(app).post('/api/messaging-automations/advanced').set(auth).send({ ...flow, status: 'active', channels: [{ channel: 'whatsapp', enabledSessionIds: [sessionId] }] }).expect(201);

    expect(await inbound({ messageId: 'm1', text: 'oi', firstInbound: true })).toEqual({ handled: true });
    expect(gateway.sent[0]!.text).toBe('Oi Ana! Quer um orçamento?\n\n1. Sim\n2. Não');
    const row = await AutomationRunModel.findOne({ workspaceId, channel: 'whatsapp', conversationId: 'conv1' }).lean();
    expect(row?.run?.status).toBe('waiting');
    expect(row?.waitUntil?.toISOString()).toBe(new Date(now.getTime() + 10 * 60_000).toISOString());

    expect(await inbound({ messageId: 'm1', text: 'oi', firstInbound: true })).toEqual({ handled: true });
    expect(gateway.sent).toHaveLength(1);

    await inbound({ messageId: 'm2', text: 'Sim' });
    expect(gateway.sent.map((s) => s.text)).toEqual(['Oi Ana! Quer um orçamento?\n\n1. Sim\n2. Não', 'Ótimo, já te mando.']);
    expect((await AutomationRunModel.findOne({ conversationId: 'conv1' }).lean())?.run?.status).toBe('completed');

    // after the run, the conversation goes back to JSYNQ (not the first message any more)
    expect(await inbound({ messageId: 'm3', text: 'obrigado' })).toEqual({ handled: false });

    // no-reply timer on another conversation
    await inbound({ conversationId: 'conv2', messageId: 'n1', text: 'olá', firstInbound: true });
    now = new Date(now.getTime() + 11 * 60_000);
    await runtime.jobs.find((j) => j.name === 'automation-timers')!.run();
    expect(gateway.sent.at(-1)).toEqual({ conversationId: 'conv2', text: 'Qualquer coisa, chame.' });

    // a person replying stops the run and hands the message back
    await inbound({ conversationId: 'conv3', messageId: 'p1', text: 'oi', firstInbound: true });
    gateway.humanReplied = true;
    expect(await inbound({ conversationId: 'conv3', messageId: 'p2', text: 'Sim' })).toEqual({ handled: false });

    await automationStats.flush();
    const stats = await request(app).get(`/api/messaging-automations/advanced/${(await request(app).get('/api/messaging-automations/advanced').set(auth)).body.data.items[0].id}/stats`).set(auth).expect(200);
    expect(stats.body.data).toMatchObject({ started: 3, completed: 2, stopped: 1 });
  });

  it('without a gateway there is no runtime (Next.js never runs it; the phase-4 worker brings the gateway)', () => {
    expect(createAutomationsRuntime()).toBeNull();
  });
});
