import request from 'supertest';
import { resetEnvCache } from '../../config/env';
import { userClient } from '../../lib/jsynq';
import { clearMembershipCache } from '../../middleware/auth';
import { AdvancedAutomationModel, AutomationCounterModel, AutomationRunModel } from '../../modules/automations/models';
import { cardRunKey } from '../../modules/automations/runtime/ports';
import { resetWebhookRuntime } from '../../modules/automations/webhook';
import { EntitlementModel, SubscriptionModel } from '../../modules/billing/models';
import { AutomationScheduleStateModel } from '../../modules/worker/models';
import { Worker } from '../../modules/worker/worker';
import { createApp } from '../helpers/app';
import { testDeps } from '../helpers/deps';
import { FakeJsynq } from '../helpers/fakeJsynq';
import type { FakeCard, FakeConversation } from '../helpers/fakeJsynqCrm';
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
const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));

describe('automations pack: new steps on JSYNQ routes, triggers, protections, webhook', () => {
  let jsynq: FakeJsynq;
  let workspaceId: string;
  let sessionId: string;
  let projectId: string;
  let boardId: string;
  let columns: string[];
  let board2: { boardId: string; columns: string[] };
  let conv: FakeConversation;
  let card: FakeCard;
  let offsetMs: number;
  let workers: Worker[];
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
    resetWebhookRuntime();
    jsynq.reset();
    offsetMs = 0;
    workers = [];
    workspaceId = jsynq.addWorkspace(owner, [member]);
    sessionId = jsynq.addSession(workspaceId, 'whatsapp', 'connected');
    projectId = hex('c');
    const b = jsynq.crm.addBoard(workspaceId, projectId);
    boardId = b.boardId;
    columns = b.columns; // Lead, Qualified, Won, Lost
    board2 = jsynq.crm.addBoard(workspaceId, projectId, [['Onboarding', 'todo'], ['Live', 'inProgress']]);
    card = jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column: columns[0]!, title: 'Ana Souza' });
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
      linkedEntityId: card._id,
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
      intervals: { leaseTtlMs: 1500, leaseRenewMs: 50, workspacesMs: 3_600_000, pollMs: 3_600_000, timersMs: 3_600_000, schedulesMs: 3_600_000, socketMinBackoffMs: 20, socketMaxBackoffMs: 100 },
      ...over,
    });
    workers.push(w);
    return w;
  };
  const connected = async (w: Worker, crmProjects: string[] = []) => {
    w.start();
    await waitFor(() => w.leader && !!w.socketOf(workspaceId)?.connected, 'inbox socket');
    for (const p of crmProjects) {
      await waitFor(() => !!w.triggers!.crmSocket(workspaceId, p)?.connected && jsynq.sockets.some((s) => s.room === `crm-dashboard:${p}` && s.userId === owner && s.handshakes > 0), `crm socket ${p}`);
    }
  };
  const createAutomation = async (body: Record<string, unknown>) => {
    const res = await request(app())
      .post('/api/messaging-automations/advanced')
      .set(auth())
      .send({ status: 'active', channels: [{ channel: 'whatsapp', enabledSessionIds: [sessionId] }], ...body });
    if (res.status !== 201) throw new Error(`create failed ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data.id as string;
  };
  const chain = (nodes: Array<Record<string, unknown>>) => ({
    startNodeId: String(nodes[0]!.id),
    nodes: nodes.map((n, i) => ({ x: 0, y: i * 100, ...n })),
    edges: nodes.slice(1).map((n, i) => ({ id: `e${i}`, from: String(nodes[i]!.id), output: 'next', to: String(n.id) })),
  });
  /** Runs an automation started (every subject keeps its last 20 starts; runs on one conversation replace each other). */
  const runsOf = async (automationId: string) =>
    (await AutomationRunModel.find({ 'history.automationId': automationId }).select('history').lean()).reduce((n, d) => n + d.history.filter((h) => h.automationId === automationId).length, 0);
  const comments = (cardId = card._id) => jsynq.crm.comments.filter((c) => c.cardId === cardId).map((c) => c.text);
  const move = (target: FakeCard, columnId: string) => {
    const column = jsynq.crm.columns.find((c) => c._id === columnId)!;
    target.column = columnId;
    target.board = column.board;
    target.cardStatus = column.columnStatus;
    target.updatedAt = new Date().toISOString();
    jsynq.crm.emitCard(target, 'moved');
  };

  // --- steps ----------------------------------------------------------------------------------------------------------

  it('each new step calls its JSYNQ route on the conversation\'s lead', async () => {
    const vip = { _id: hex('7'), project: projectId, text: 'VIP', color: '#000000' };
    jsynq.crm.labels.push(vip);
    card.labels = [vip._id];
    const id = await createAutomation({
      name: 'Passos',
      trigger: { kind: 'manual', dedupeDays: 0 },
      ...chain([
        { id: 'f1', kind: 'set_field', fieldId: 'budget', value: '{{lead.name}}', projectId, boardId, fieldType: 'text' },
        { id: 'f2', kind: 'set_field', fieldId: 'card:title', value: 'Ana (WhatsApp)' },
        { id: 'val', kind: 'set_value', value: '1500' },
        { id: 'own', kind: 'set_owner', userId: member },
        { id: 'rl', kind: 'remove_label', labelText: 'vip' },
        { id: 'cm', kind: 'add_comment', text: 'Falou com {{lead.name}}' },
        { id: 'ci', kind: 'add_checklist_item', title: 'Enviar proposta' },
        { id: 'ck', kind: 'check_checklist_item', title: 'enviar proposta', checked: true },
        { id: 'dup', kind: 'duplicate_card', columnId: columns[1] },
        { id: 'mb', kind: 'move_board', projectId, boardId: board2.boardId, columnId: board2.columns[1] },
        { id: 'rd', kind: 'mark_read' },
        { id: 'as', kind: 'assign_conversation', userId: member },
      ]),
    });
    const w = makeWorker();
    await connected(w);
    const started = await w.automations!.runtime.startAutomation({ workspaceId, channel: 'whatsapp', conversationId: conv._id, sessionId, automationId: id });
    expect(started).toEqual({ started: true });

    expect(card.customFields).toEqual(expect.arrayContaining([{ fieldId: 'budget', fieldType: 'text', value: 'Ana Souza' }, expect.objectContaining({ fieldId: 'estimateRevenue', value: '1500' })]));
    expect(card.title).toBe('Ana (WhatsApp)');
    expect(card.assignedUsers).toEqual([member]);
    expect(card.labels).toEqual([]);
    expect(comments()).toEqual(['Falou com Ana Souza']);
    const item = jsynq.crm.cards.find((c) => c.parent === card._id)!;
    expect(item).toMatchObject({ title: 'Enviar proposta', completed: true, board: boardId });
    const copy = jsynq.crm.cards.find((c) => c._id !== card._id && !c.parent && c.title === 'Ana (WhatsApp)')!;
    expect(copy.column).toBe(columns[1]);
    expect(card.board).toBe(board2.boardId);
    expect(card.column).toBe(board2.columns[1]);
    expect(jsynq.crm.cardWrites).toEqual(['POST create subtask', `POST clone ${card._id}`, `POST move-to-board ${card._id}`]);
    expect(jsynq.crm.reads).toEqual([conv._id]);
    expect(jsynq.crm.assigns).toEqual([{ conversationId: conv._id, userId: member }]);
    // Assignment alone: the conversation keeps its state (an AI on it keeps answering).
    expect(jsynq.crm.transitions).toEqual([]);
  });

  it('create lead: links a conversation without a card, later steps act on the new card, and only that card is deleted', async () => {
    conv.linkedEntityId = null;
    conv.linkedEntityType = null;
    conv.crmProjectId = null;
    const id = await createAutomation({
      name: 'Novo lead',
      trigger: { kind: 'manual', dedupeDays: 0 },
      ...chain([
        { id: 'new', kind: 'create_card', projectId, boardId, columnId: columns[1], title: '{{lead.name}}', fields: [{ fieldId: 'phone', value: '{{lead.phone}}' }], ownerUserId: member },
        { id: 'note', kind: 'add_comment', text: 'Criado pela automação' },
        { id: 'bye', kind: 'delete_card', confirmed: true },
      ]),
    });
    const w = makeWorker();
    await connected(w);
    await w.automations!.runtime.startAutomation({ workspaceId, channel: 'whatsapp', conversationId: conv._id, sessionId, automationId: id });
    const created = jsynq.crm.cards.find((c) => c._id !== card._id)!;
    expect(created).toMatchObject({ title: 'Ana Souza', column: columns[1], assignedUsers: [member], customFields: [{ fieldId: 'phone', fieldType: 'text', value: '+5511999990000' }] });
    expect(jsynq.crm.conversationPatches).toEqual([{ conversationId: conv._id, body: { linkedEntityType: 'card', linkedEntityId: created._id } }]);
    expect(comments(created._id)).toEqual(['Criado pela automação']);
    expect(created.deleted).toBe(true);
    expect(card.deleted).toBeUndefined();

    // The gateway refuses to delete any other card (not linked, not created by the run).
    await expect(w.gateway.deleteCard({ workspaceId, channel: 'whatsapp', conversationId: conv._id }, { projectId, cardId: card._id }, { idempotencyKey: 'x' })).rejects.toThrow('NOT_THE_RUN_CARD');
    expect(card.deleted).toBeUndefined();
  });

  // --- CRM triggers ---------------------------------------------------------------------------------------------------

  it('CRM triggers from crm-dashboard events: created, moved to a stage, label added, won; the catch-up poll covers a dropped socket', async () => {
    const created = await createAutomation({ name: 'Criado', trigger: { kind: 'card_created', dedupeDays: 0, projectId, boardId }, ...chain([{ id: 'c', kind: 'add_comment', text: 'novo' }]) });
    const moved = await createAutomation({ name: 'Qualificado', trigger: { kind: 'card_stage_changed', dedupeDays: 0, projectId, boardId, columnId: columns[1] }, ...chain([{ id: 'c', kind: 'add_comment', text: 'qualificado' }]) });
    const labelled = await createAutomation({ name: 'VIP', trigger: { kind: 'card_label_added', dedupeDays: 0, labelText: 'vip' }, ...chain([{ id: 'c', kind: 'add_comment', text: 'vip' }]) });
    const won = await createAutomation({ name: 'Ganho', trigger: { kind: 'card_won', dedupeDays: 0, projectId, boardId }, ...chain([{ id: 'c', kind: 'add_comment', text: 'ganho' }]) });
    const w = makeWorker();
    await connected(w, [projectId]);

    // Moved into "Qualified": the lead has a conversation on the automation's channel, so the run is on it.
    move(card, columns[1]!);
    await waitFor(() => comments().includes('qualificado'), 'stage trigger');
    expect(await AutomationRunModel.findOne({ 'run.automationId': moved }).lean()).toMatchObject({ channel: 'whatsapp', conversationId: conv._id, run: { origin: { kind: 'trigger:card_stage_changed' } } });

    // A new card (no conversation): the run is on the lead alone.
    const fresh = jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column: columns[0]! });
    jsynq.crm.emitCard(fresh, 'created');
    await waitFor(() => comments(fresh._id).includes('novo'), 'created trigger');
    expect(await AutomationRunModel.findOne({ 'run.automationId': created }).lean()).toMatchObject(cardRunKey(workspaceId, { projectId, cardId: fresh._id }));

    // Label added (by name, any CRM project).
    const vip = { _id: hex('7'), project: projectId, text: 'VIP', color: '#000000' };
    jsynq.crm.labels.push(vip);
    card.labels = [vip._id];
    jsynq.crm.emitCard(card, 'updated', { labelIds: [vip._id] });
    await waitFor(() => comments().includes('vip'), 'label trigger');

    // Won: the column's status is `win`.
    move(card, columns[2]!);
    await waitFor(() => comments().includes('ganho'), 'won trigger');
    expect(await runsOf(labelled)).toBe(1);
    expect(await runsOf(won)).toBe(1);

    // Socket down: the catch-up poll sees the move.
    jsynq.muteSockets = true;
    const other = jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column: columns[0]!, title: 'Bruno' });
    await w.pollAll();
    other.column = columns[1]!;
    other.updatedAt = new Date(Date.now() + 1000).toISOString();
    await w.pollAll();
    jsynq.muteSockets = false;
    await waitFor(() => comments(other._id).includes('qualificado'), 'stage trigger from the poll');
    expect(comments(other._id)).toEqual(['novo', 'qualificado']);
    // Redelivered: nothing new.
    jsynq.crm.emitCard(other, 'moved');
    await settle();
    expect(comments(other._id)).toEqual(['novo', 'qualificado']);
  });

  it('filters, once per lead, and loop protection', async () => {
    const vipOnly = await createAutomation({
      name: 'Só VIP',
      trigger: { kind: 'card_stage_changed', dedupeDays: 0, projectId, boardId, columnId: columns[1], filters: { labels: ['VIP'] } },
      ...chain([{ id: 'c', kind: 'add_comment', text: 'vip qualificado' }]),
    });
    const once = await createAutomation({
      name: 'Uma vez',
      trigger: { kind: 'card_stage_changed', dedupeDays: 0, projectId, boardId, columnId: columns[1], oncePerLead: true },
      ...chain([{ id: 'c', kind: 'add_comment', text: 'primeira vez' }]),
    });
    // Would re-trigger itself forever: its copy is a new card on the same board.
    const loop = await createAutomation({ name: 'Copia', trigger: { kind: 'card_created', dedupeDays: 0, projectId, boardId }, ...chain([{ id: 'd', kind: 'duplicate_card' }]) });
    const vip = { _id: hex('7'), project: projectId, text: 'VIP', color: '#000000' };
    jsynq.crm.labels.push(vip);
    const w = makeWorker();
    await connected(w, [projectId]);

    move(card, columns[1]!);
    await waitFor(() => comments().includes('primeira vez'), 'once-per-lead first run');
    await settle();
    expect(comments()).toEqual(['primeira vez']); // not VIP
    move(card, columns[0]!);
    card.labels = [vip._id];
    move(card, columns[1]!);
    await waitFor(() => comments().includes('vip qualificado'), 'filtered run');
    await settle();
    expect(comments()).toEqual(['primeira vez', 'vip qualificado']);
    expect(await runsOf(once)).toBe(1);
    expect(await runsOf(vipOnly)).toBe(1);

    const seed = jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column: columns[0]!, title: 'Loop' });
    jsynq.crm.emitCard(seed, 'created');
    await waitFor(() => jsynq.crm.cardWrites.some((x) => x === `POST clone ${seed._id}`), 'the copy');
    await settle(500);
    expect(jsynq.crm.cardWrites.filter((x) => x.startsWith('POST clone'))).toEqual([`POST clone ${seed._id}`]);
    expect(await runsOf(loop)).toBe(1);
  });

  // --- conversation triggers -----------------------------------------------------------------------------------------

  it('conversation triggers: keyword, any message on a channel, assignment, handoff, contact silence', async () => {
    const kw = await createAutomation({ name: 'Preço', trigger: { kind: 'keyword', dedupeDays: 0, keywords: ['preço', 'orçamento'] }, ...chain([{ id: 'm', kind: 'send_message', text: 'Te mando os preços!', replyMode: 'none' }]) });
    const sms = await createAutomation({ name: 'SMS', trigger: { kind: 'any_message', dedupeDays: 0, filters: { channels: ['sms'] } }, ...chain([{ id: 'm', kind: 'send_message', text: 'nunca', replyMode: 'none' }]) });
    const assigned = await createAutomation({ name: 'Atribuída', trigger: { kind: 'conversation_assigned', dedupeDays: 0, userId: member }, ...chain([{ id: 'c', kind: 'add_comment', text: 'atribuída' }]) });
    const handed = await createAutomation({ name: 'Humano', trigger: { kind: 'handed_to_human', dedupeDays: 0 }, ...chain([{ id: 'c', kind: 'add_comment', text: 'humano' }]) });
    const silence = await createAutomation({ name: 'Sumiu', trigger: { kind: 'contact_no_reply', dedupeDays: 0, minutes: 60 }, ...chain([{ id: 'm', kind: 'send_message', text: 'Ainda por aí?', replyMode: 'none' }]) });
    const w = makeWorker();
    await connected(w);
    const outbound = () => jsynq.crm.messages.filter((m) => m.conversationId === conv._id && m.direction === 'outbound').map((m) => m.content);

    jsynq.crm.addMessage(conv, { direction: 'inbound', senderType: 'contact', content: 'Oi' });
    jsynq.crm.addMessage(conv, { direction: 'inbound', senderType: 'contact', content: 'Qual o PRECO do plano?' });
    await waitFor(() => outbound().includes('Te mando os preços!'), 'keyword run');
    expect(await runsOf(kw)).toBe(1);
    expect(await runsOf(sms)).toBe(0);

    jsynq.broadcast(workspaceId, 'messaging-inbox:conversation-updated', { workspaceId, channel: 'whatsapp', sessionId, conversationId: conv._id, assignedUserId: member });
    await waitFor(() => comments().includes('atribuída'), 'assignment run');

    conv.conversationState = 'human_handoff';
    conv.assignedUserId = member;
    conv.conversationStateHistory = [{ state: 'human_handoff', changedAt: new Date(Date.now() + 1000).toISOString() }];
    await w.pollAll();
    await waitFor(() => comments().includes('humano'), 'handoff run');
    await w.pollAll();
    expect(await runsOf(handed)).toBe(1);
    expect(await runsOf(assigned)).toBe(1);

    // The last message is ours and is now 2 h old: the contact is silent.
    const quiet: FakeConversation = { ...conv, _id: hex('e'), conversationState: undefined, conversationStateHistory: [], linkedEntityId: null, crmProjectId: null, lastMessageDirection: 'outbound', lastMessageAt: new Date(Date.now() + 1000).toISOString() };
    jsynq.crm.conversations.push(quiet);
    offsetMs = 2 * 3600_000;
    await w.pollAll();
    await waitFor(() => jsynq.crm.messages.some((m) => m.conversationId === quiet._id && m.content === 'Ainda por aí?'), 'silence run');
    await w.pollAll();
    // The first conversation's last message (the keyword reply) is ours too, and as old: it is silent as well.
    expect(await runsOf(silence)).toBe(2);
  });

  // --- time triggers --------------------------------------------------------------------------------------------------

  it('scheduled: reads the stage in capped pages per tick, then once per day; the per-minute cap holds the page', async () => {
    for (let i = 0; i < 210; i += 1) jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column: columns[1]!, title: `Lead ${i}`, updatedAt: new Date(Date.now() - (300 - i) * 1000).toISOString() });
    const id = await createAutomation({
      name: 'Diária',
      channels: [],
      trigger: { kind: 'scheduled', dedupeDays: 0, projectId, boardId, columnId: columns[1], schedule: { frequency: 'daily', time: '00:00' } },
      ...chain([{ id: 's', kind: 'stop' }]),
    });
    const w = makeWorker({ runsPerMinute: 1000 });
    await connected(w);
    const before = jsynq.crm.cardQueries.length;
    await w.tickSchedules();
    expect(jsynq.crm.cardQueries.length - before).toBe(4);
    expect(await AutomationScheduleStateModel.findById(id).lean()).toMatchObject({ page: 5, read: 200, done: false });
    expect(await runsOf(id)).toBe(200);
    await w.tickSchedules();
    expect(await AutomationScheduleStateModel.findById(id).lean()).toMatchObject({ read: 210, done: true });
    expect(await runsOf(id)).toBe(210);
    const after = jsynq.crm.cardQueries.length;
    await w.tickSchedules();
    expect(jsynq.crm.cardQueries.length).toBe(after); // done for today

    // Default cap: 30 runs a minute; the page is read again next tick.
    const capped = await createAutomation({
      name: 'Capada',
      channels: [],
      trigger: { kind: 'scheduled', dedupeDays: 0, projectId, boardId, columnId: columns[1], schedule: { frequency: 'daily', time: '00:00' } },
      ...chain([{ id: 's', kind: 'stop' }]),
    });
    const w2 = makeWorker();
    await w.stop();
    await connected(w2);
    await w2.tickSchedules();
    expect(await runsOf(capped)).toBe(30);
    expect(await AutomationScheduleStateModel.findById(capped).lean()).toMatchObject({ page: 1, done: false });
  });

  it('date field: X days before a date field of the lead', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const plus = (d: number) => new Date(Date.parse(`${today}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
    const due = jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column: columns[0]!, title: 'Renova', customFields: [{ fieldId: 'renewal', fieldType: 'date', value: plus(3) }] });
    jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column: columns[0]!, title: 'Depois', customFields: [{ fieldId: 'renewal', fieldType: 'date', value: plus(4) }] });
    const id = await createAutomation({
      name: 'Renovação',
      channels: [],
      trigger: { kind: 'date_field', dedupeDays: 0, projectId, boardId, dateField: { fieldId: 'renewal', offsetDays: -3, time: '00:00' } },
      ...chain([{ id: 'c', kind: 'add_comment', text: 'renova em 3 dias' }]),
    });
    const w = makeWorker();
    await connected(w);
    await w.tickSchedules();
    expect(comments(due._id)).toEqual(['renova em 3 dias']);
    expect(jsynq.crm.comments).toHaveLength(1);
    expect(await runsOf(id)).toBe(1);
  });

  // --- webhook ---------------------------------------------------------------------------------------------------------

  it('webhook: secret shown once and rotatable, wrong secret refused, lead matched by phone or created, idempotent, rate limited', async () => {
    const id = await createAutomation({
      name: 'Formulário',
      channels: [],
      trigger: { kind: 'webhook', dedupeDays: 0, projectId, boardId, columnId: columns[0] },
      ...chain([{ id: 'c', kind: 'add_comment', text: 'veio do site: {{webhook.utm}}' }]),
    });
    const hook = (secret?: string, body: Record<string, unknown> = { name: 'Carla', phone: '+55 11 98888-7777', email: 'carla@example.com', fields: { utm: 'google' } }, key?: string) => {
      const r = request(app()).post(`/api/automations/hooks/${id}`);
      if (secret) r.set('X-Attende-Secret', secret);
      if (key) r.set('Idempotency-Key', key);
      return r.send(body);
    };
    expect((await hook('anything')).status).toBe(404); // no secret yet
    const first = await request(app()).post(`/api/messaging-automations/advanced/${id}/webhook-secret`).set(auth());
    expect(first.status).toBe(200);
    const rotated = await request(app()).post(`/api/messaging-automations/advanced/${id}/webhook-secret`).set(auth());
    const secret = rotated.body.data.secret as string;
    expect(rotated.body.data).toMatchObject({ path: `/api/automations/hooks/${id}`, header: 'X-Attende-Secret' });
    const detail = await request(app()).get(`/api/messaging-automations/advanced/${id}`).set(auth());
    expect(detail.body.data.webhook).toMatchObject({ configured: true, path: `/api/automations/hooks/${id}` });
    expect(JSON.stringify(detail.body)).not.toContain(secret);
    expect(detail.body.data.webhookSecretHash).toBeUndefined();

    expect((await hook()).status).toBe(401);
    expect((await hook(first.body.data.secret)).status).toBe(401); // rotated away
    expect((await hook(secret, { name: 'Sem contato' })).status).toBe(400);

    const ok = await hook(secret, undefined, 'form-1');
    expect(ok.status).toBe(202);
    expect(ok.body.data).toMatchObject({ started: true, created: true });
    const lead = jsynq.crm.cards.find((c) => c._id === ok.body.data.cardId)!;
    expect(lead).toMatchObject({ title: 'Carla', column: columns[0] });
    expect(lead.customFields.map((f) => f.fieldId).sort()).toEqual(['contactName', 'email', 'phone', 'utm']);
    expect(comments(lead._id)).toEqual(['veio do site: google']);
    // Retried with the same key: nothing new starts.
    expect((await hook(secret, undefined, 'form-1')).body.data).toMatchObject({ started: false });

    // A known contact (by phone) with a deal on the board: that deal is the lead.
    jsynq.crm.contacts.push({ _id: hex('9'), workspaceId, fullName: 'Ana Souza', phone: '+5511999990000', email: 'ana@example.com' });
    card.contactIds = [hex('9')];
    const matched = await hook(secret, { phone: '(11) 99999-0000' }, 'form-2');
    expect(matched.body.data).toMatchObject({ started: true, created: false, cardId: card._id });

    // The shared per-automation limit.
    const bucket = Math.floor(Date.now() / 60_000);
    await AutomationCounterModel.updateOne({ _id: `hook:${id}:${bucket}` }, { $set: { n: 60, expireAt: new Date(Date.now() + 120_000) } }, { upsert: true });
    await AutomationCounterModel.updateOne({ _id: `hook:${id}:${bucket + 1}` }, { $set: { n: 60, expireAt: new Date(Date.now() + 180_000) } }, { upsert: true });
    expect((await hook(secret, undefined, 'form-3')).status).toBe(429);
  });

  // --- backward compatibility -------------------------------------------------------------------------------------------

  it('an automation saved before this pack loads, saves and activates unchanged', async () => {
    const raw = await AdvancedAutomationModel.create({
      workspaceId,
      name: 'Antiga',
      status: 'draft',
      channels: [{ channel: 'whatsapp', enabledSessionIds: [sessionId] }],
      trigger: { kind: 'new_conversation', dedupeDays: 0 },
      stopOnHumanReply: true,
      startNodeId: 'hi',
      nodes: [
        { id: 'hi', kind: 'send_message', x: 0, y: 0, text: 'Oi', replyMode: 'free', saveAnswerTo: 'budget' },
        { id: 'f', kind: 'set_field', x: 0, y: 100, fieldId: 'budget', value: 'x' },
      ],
      edges: [{ id: 'e1', from: 'hi', output: 'answered', to: 'f' }],
      createdBy: owner,
    });
    const id = String(raw._id);
    const got = await request(app()).get(`/api/messaging-automations/advanced/${id}`).set(auth());
    expect(got.status).toBe(200);
    expect(got.body.data).toMatchObject({ issues: [], trigger: { kind: 'new_conversation', dedupeDays: 0 }, webhook: { configured: false } });
    const active = await request(app()).patch(`/api/messaging-automations/advanced/${id}`).set(auth()).send({ status: 'active', trigger: got.body.data.trigger, nodes: got.body.data.nodes, edges: got.body.data.edges, startNodeId: 'hi' });
    expect(active.status).toBe(200);
    const stored = await AdvancedAutomationModel.findById(id).lean();
    expect(stored!.trigger).toEqual({ kind: 'new_conversation', dedupeDays: 0 });
    expect(stored!.nodes).toEqual(raw.toObject().nodes);
  });
});
