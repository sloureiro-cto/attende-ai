import { advanceAutomationRun, newRunState, type EnginePorts } from '../../modules/automations/lib/advancedAutomationEngine';
import { nodeOutputs } from '../../modules/automations/lib/advancedAutomationGraph';
import { parseAutomationTrigger, triggerCompletenessIssues } from '../../modules/automations/lib/parseAdvancedAutomationInput';
import { blockingIssues, validateAdvancedAutomation } from '../../modules/automations/lib/validateAdvancedAutomation';
import { previewAutomation } from '../../modules/automations/preview';
import { GatewayEffectExecutor } from '../../modules/automations/runtime/executor';
import { cardOfKey, cardRunKey, type AutomationExecutionContext, type ConversationGateway } from '../../modules/automations/runtime/ports';
import { echoOfEvent, filtersMatch, keywordMatches, triggerMatches, type TriggerEvent } from '../../modules/automations/runtime/triggers';
import type { AdvancedAutomationNode, AdvancedAutomationTrigger } from '../../modules/automations/types';
import { cardUpdateBody } from '../../modules/worker/gateway';
import { addDays, dateOfValue, localClock } from '../../modules/worker/triggerSources';

const hex = (c: string) => c.repeat(24);
const W = hex('w');
const P = hex('a');
const B = hex('b');
const C1 = hex('1');
const C2 = hex('2');

const ports = (over: Partial<EnginePorts> = {}): EnginePorts => ({
  now: new Date('2026-11-07T12:00:00Z'),
  evaluateCondition: async () => false,
  interpretAnswer: async () => ({ understood: false }),
  isWithinBusinessHours: () => true,
  bucket: () => 0,
  ...over,
});

/** A graph saved before this pack (old node shapes, old trigger). */
const OLD_GRAPH = {
  startNodeId: 'hello',
  nodes: [
    { id: 'hello', kind: 'send_message', x: 0, y: 0, text: 'Oi {{lead.name}}', replyMode: 'free', noReplyMinutes: 10, saveAnswerTo: 'budget' },
    { id: 'pause', kind: 'wait', x: 0, y: 100, minutes: 5 },
    { id: 'field', kind: 'set_field', x: 0, y: 200, fieldId: 'budget', value: '{{lead.name}}' },
    { id: 'move', kind: 'move_stage', x: 0, y: 300, columnId: C2, projectId: P },
    { id: 'tag', kind: 'add_label', x: 0, y: 400, labelText: 'Quente' },
    { id: 'human', kind: 'handoff', x: 0, y: 500, message: 'Vou chamar alguém.' },
  ] as AdvancedAutomationNode[],
  edges: [
    { id: 'e1', from: 'hello', output: 'answered', to: 'pause' },
    { id: 'e2', from: 'pause', output: 'next', to: 'field' },
    { id: 'e3', from: 'field', output: 'next', to: 'move' },
    { id: 'e4', from: 'move', output: 'next', to: 'tag' },
    { id: 'e5', from: 'tag', output: 'next', to: 'human' },
    { id: 'e6', from: 'hello', output: 'no_reply', to: 'human' },
  ],
};

describe('backward compatibility of saved automations', () => {
  it('an old trigger parses to itself', () => {
    expect(parseAutomationTrigger({ kind: 'new_conversation', dedupeDays: 0 })).toEqual({ kind: 'new_conversation', dedupeDays: 0 });
    const filter = { type: 'contains', value: 'preço' };
    expect(parseAutomationTrigger({ kind: 'manual', dedupeDays: 3, filter })).toEqual({ kind: 'manual', dedupeDays: 3, filter });
    expect(triggerCompletenessIssues({ kind: 'new_conversation', dedupeDays: 0 })).toEqual([]);
  });

  it('an old graph keeps its exits and validates with no issue', () => {
    expect(validateAdvancedAutomation(OLD_GRAPH)).toEqual([]);
    expect(OLD_GRAPH.nodes.map((n) => nodeOutputs(n))).toEqual([['answered', 'no_reply', 'send_failed'], ['next'], ['next'], ['next'], ['next'], []]);
  });

  it('an old graph runs as before', async () => {
    const state = newRunState({ automationId: 'a', runId: 'r', automationVersion: 1, now: ports().now });
    const started = await advanceAutomationRun({ automation: OLD_GRAPH, state, event: { type: 'start' }, ports: ports() });
    expect(started.state).toMatchObject({ status: 'waiting', nodeId: 'hello' });
    const answered = await advanceAutomationRun({ automation: OLD_GRAPH, state: started.state, event: { type: 'inbound', text: '5 mil' }, ports: ports() });
    expect(answered.effects.filter((e) => e.type === 'set_field')).toEqual([{ type: 'set_field', nodeId: 'hello', fieldId: 'budget', value: '5 mil', literal: true }]);
    expect(answered.state.wait).toMatchObject({ kind: 'timer', nodeId: 'pause' });
  });
});

describe('new steps: graph, validation, engine', () => {
  const node = (n: Partial<AdvancedAutomationNode> & { kind: AdvancedAutomationNode['kind'] }) => ({ id: 's', x: 0, y: 0, ...n }) as AdvancedAutomationNode;

  it('exits', () => {
    expect(nodeOutputs(node({ kind: 'wait_reply', minutes: 30 } as never))).toEqual(['answered', 'no_reply']);
    for (const kind of ['create_card', 'duplicate_card', 'delete_card', 'move_board', 'set_value', 'set_owner', 'remove_label', 'add_comment', 'add_checklist_item', 'check_checklist_item', 'mark_read', 'assign_conversation', 'save_reply'] as const) {
      expect(nodeOutputs(node({ kind } as never))).toEqual(['next']);
    }
  });

  it('validation: completeness is not blocking, bad ids and sizes are', () => {
    const issues = (n: Record<string, unknown>) => validateAdvancedAutomation({ startNodeId: 's', nodes: [node(n as never)], edges: [] });
    expect(issues({ kind: 'delete_card' })).toEqual([{ path: 'nodes[s]', message: 'confirm that this step deletes the lead' }]);
    expect(issues({ kind: 'delete_card', confirmed: true })).toEqual([]);
    expect(issues({ kind: 'create_card', projectId: P, columnId: C1, title: '{{lead.name}}', fields: [{ fieldId: 'email', value: '{{lead.email}}' }] })).toEqual([]);
    expect(issues({ kind: 'create_card', projectId: '', columnId: '', title: '' })[0]).toMatchObject({ message: 'needs a board and a stage' });
    expect(blockingIssues(issues({ kind: 'create_card', projectId: P, columnId: C1, title: 'x', ownerUserId: 'nope' }))).toHaveLength(1);
    expect(blockingIssues(issues({ kind: 'set_field', fieldId: 'card:owner', value: 'not-a-member' }))).toHaveLength(1);
    expect(issues({ kind: 'set_field', fieldId: 'card:owner', value: hex('e') })).toEqual([]);
    expect(issues({ kind: 'set_owner', userId: '' })[0]).toMatchObject({ message: 'needs a member' });
    expect(issues({ kind: 'wait_reply', minutes: 0 })[0]).toMatchObject({ blocking: true });
    expect(issues({ kind: 'check_checklist_item', title: 'Contrato', checked: true })).toEqual([]);
  });

  it('wait_reply: answered (saving the answer) or no_reply', async () => {
    const graph = {
      startNodeId: 'w',
      nodes: [node({ id: 'w', kind: 'wait_reply', minutes: 60, saveAnswerTo: 'note' } as never), node({ id: 'yes', kind: 'mark_read' } as never), node({ id: 'no', kind: 'add_comment', text: 'Sem resposta' } as never)],
      edges: [
        { id: 'e1', from: 'w', output: 'answered', to: 'yes' },
        { id: 'e2', from: 'w', output: 'no_reply', to: 'no' },
      ],
    };
    const state = newRunState({ automationId: 'a', runId: 'r', automationVersion: 1, now: ports().now });
    const waiting = await advanceAutomationRun({ automation: graph, state, event: { type: 'start' }, ports: ports() });
    expect(waiting.state.wait).toEqual({ kind: 'reply', nodeId: 'w', timeoutAt: new Date('2026-11-07T13:00:00Z') });
    const answered = await advanceAutomationRun({ automation: graph, state: waiting.state, event: { type: 'inbound', text: 'Pode ser amanhã' }, ports: ports() });
    expect(answered.effects.filter((e) => e.type !== 'stat')).toEqual([
      { type: 'set_field', nodeId: 'w', fieldId: 'note', value: 'Pode ser amanhã', literal: true },
      { type: 'mark_read', nodeId: 'yes' },
      { type: 'run_ended', status: 'completed' },
    ]);
    const late = await advanceAutomationRun({ automation: graph, state: waiting.state, event: { type: 'timer' }, ports: ports({ now: new Date('2026-11-07T13:01:00Z') }) });
    expect(late.effects.filter((e) => e.type !== 'stat')).toEqual([{ type: 'add_comment', nodeId: 'no', text: 'Sem resposta' }, { type: 'run_ended', status: 'completed' }]);
    // A failed earlier message does not end the wait.
    const failed = await advanceAutomationRun({ automation: graph, state: waiting.state, event: { type: 'send_failed' }, ports: ports() });
    expect(failed.effects).toEqual([]);
  });

  it('every new step emits its effect; save_reply writes the latest answer as data', async () => {
    const steps = [
      node({ id: 'c', kind: 'create_card', projectId: P, boardId: B, columnId: C1, title: '{{lead.name}}' } as never),
      node({ id: 'd', kind: 'duplicate_card' } as never),
      node({ id: 'mb', kind: 'move_board', projectId: P, boardId: B, columnId: C2 } as never),
      node({ id: 'v', kind: 'set_value', value: '1500' } as never),
      node({ id: 'o', kind: 'set_owner', userId: hex('e') } as never),
      node({ id: 'rl', kind: 'remove_label', labelText: 'Frio' } as never),
      node({ id: 'cm', kind: 'add_comment', text: 'Nota' } as never),
      node({ id: 'ci', kind: 'add_checklist_item', title: 'Enviar proposta' } as never),
      node({ id: 'ck', kind: 'check_checklist_item', title: 'Enviar proposta', checked: true } as never),
      node({ id: 'ac', kind: 'assign_conversation', userId: hex('e') } as never),
      node({ id: 'sr', kind: 'save_reply', fieldId: 'note' } as never),
      node({ id: 'del', kind: 'delete_card', confirmed: true } as never),
    ];
    const graph = { startNodeId: 'c', nodes: steps, edges: steps.slice(1).map((n, i) => ({ id: `e${i}`, from: steps[i]!.id, output: 'next', to: n.id })) };
    const state = { ...newRunState({ automationId: 'a', runId: 'r', automationVersion: 1, now: ports().now }), lastAnswer: '{{x}} 42' };
    const out = await advanceAutomationRun({ automation: graph, state, event: { type: 'start' }, ports: ports() });
    expect(out.effects.filter((e) => e.type !== 'stat').map((e) => e.type)).toEqual([
      'create_card',
      'duplicate_card',
      'move_board',
      'set_value',
      'set_owner',
      'remove_label',
      'add_comment',
      'add_checklist_item',
      'check_checklist_item',
      'assign_conversation',
      'set_field',
      'delete_card',
      'run_ended',
    ]);
    expect(out.effects.find((e) => e.type === 'set_field')).toEqual({ type: 'set_field', nodeId: 'sr', fieldId: 'note', value: '{{x}} 42', literal: true });
    expect(out.effects.find((e) => e.type === 'create_card')).toMatchObject({ linkConversation: true });
  });

  it('the preview never carries out a delete, and says so', async () => {
    const graph = { startNodeId: 'del', nodes: [node({ id: 'del', kind: 'delete_card', confirmed: true } as never)], edges: [] };
    const res = await previewAutomation({ automation: graph, automationId: 'draft', channel: 'whatsapp', event: { type: 'start' }, businessHours: null });
    expect(res.effects.find((e) => e.type === 'delete_card')).toMatchObject({ refused: true });
    expect(res.unavailable).toEqual([{ kind: 'refused_in_preview', nodeId: 'del' }]);
  });
});

describe('triggers: parsing and matching', () => {
  it('parses each new kind and drops what a kind does not use', () => {
    expect(parseAutomationTrigger({ kind: 'keyword', dedupeDays: 0, keywords: [' Preço ', ''], minutes: 30, oncePerLead: true })).toEqual({ kind: 'keyword', dedupeDays: 0, keywords: ['Preço'], oncePerLead: true });
    expect(parseAutomationTrigger({ kind: 'card_stage_changed', dedupeDays: 0, projectId: P, boardId: B, columnId: C1, keywords: ['x'] })).toEqual({ kind: 'card_stage_changed', dedupeDays: 0, projectId: P, boardId: B, columnId: C1 });
    expect(parseAutomationTrigger({ kind: 'scheduled', dedupeDays: 0, projectId: P, columnId: C1, schedule: { frequency: 'weekly', time: '09:30', weekdays: [5, 1, 1] } })).toMatchObject({ schedule: { frequency: 'weekly', time: '09:30', weekdays: [1, 5] } });
    expect(parseAutomationTrigger({ kind: 'date_field', dedupeDays: 0, projectId: P, boardId: B, dateField: { fieldId: 'renewal', offsetDays: -3, time: '08:00' } })).toMatchObject({ dateField: { fieldId: 'renewal', offsetDays: -3, time: '08:00' } });
    expect(parseAutomationTrigger({ kind: 'any_message', dedupeDays: 0, filters: { channels: ['sms', 'sms'], labels: [' VIP '], columnIds: [] } })).toEqual({ kind: 'any_message', dedupeDays: 0, filters: { channels: ['sms'], labels: ['VIP'] } });
    expect(() => parseAutomationTrigger({ kind: 'nope', dedupeDays: 0 })).toThrow('invalid trigger kind');
    expect(() => parseAutomationTrigger({ kind: 'contact_no_reply', dedupeDays: 0, minutes: 1 })).toThrow();
    expect(() => parseAutomationTrigger({ kind: 'scheduled', dedupeDays: 0, schedule: { frequency: 'daily', time: '25:00' } })).toThrow();
    expect(triggerCompletenessIssues({ kind: 'webhook', dedupeDays: 0 })).toEqual(['choose the stage']);
    expect(triggerCompletenessIssues({ kind: 'card_label_added', dedupeDays: 0, labelText: 'VIP' })).toEqual([]);
  });

  it('keywords match whole words, without accents or case', () => {
    expect(keywordMatches('Qual o PRECO do plano?', ['preço'])).toBe(true);
    expect(keywordMatches('quero falar com um atendente', ['falar com'])).toBe(true);
    expect(keywordMatches('apreçar', ['preço'])).toBe(false);
  });

  const env = { at: new Date('2026-11-07T12:00:00Z'), businessHours: null };
  const t = (over: Partial<AdvancedAutomationTrigger>): AdvancedAutomationTrigger => ({ kind: 'card_stage_changed', dedupeDays: 0, ...over }) as AdvancedAutomationTrigger;
  const card = { projectId: P, cardId: hex('c'), boardId: B, columnId: C1, labels: ['VIP'] };

  it('trigger settings', () => {
    const moved: TriggerEvent = { workspaceId: W, kind: 'card_stage_changed', eventId: 'e', card };
    expect(triggerMatches(t({ columnId: C1, projectId: P }), moved, env)).toBe(true);
    expect(triggerMatches(t({ columnId: C2 }), moved, env)).toBe(false);
    expect(triggerMatches(t({ kind: 'card_created' }), moved, env)).toBe(false);
    const label: TriggerEvent = { workspaceId: W, kind: 'card_label_added', eventId: 'e', card, labelsAdded: ['Vip'] };
    expect(triggerMatches(t({ kind: 'card_label_added', labelText: 'VIP' }), label, env)).toBe(true);
    expect(triggerMatches(t({ kind: 'card_label_added', labelText: 'Frio' }), label, env)).toBe(false);
    const assigned: TriggerEvent = { workspaceId: W, kind: 'conversation_assigned', eventId: 'e', assignedUserId: hex('e') };
    expect(triggerMatches(t({ kind: 'conversation_assigned' }), assigned, env)).toBe(true);
    expect(triggerMatches(t({ kind: 'conversation_assigned', userId: hex('f') }), assigned, env)).toBe(false);
    // "Outside business hours" never matches without business hours to be outside of.
    const msg: TriggerEvent = { workspaceId: W, kind: 'any_message', eventId: 'e', text: 'oi' };
    expect(triggerMatches(t({ kind: 'any_message', outsideBusinessHoursOnly: true }), msg, env)).toBe(false);
    const closed = { enabled: true, timezone: 'UTC', schedule: [{ day: 1 as const, windows: [{ start: '09:00', end: '18:00' }] }] };
    expect(triggerMatches(t({ kind: 'any_message', outsideBusinessHoursOnly: true }), msg, { ...env, businessHours: closed })).toBe(true);
  });

  it('common filters: channel, board / stage, label', () => {
    const ev: TriggerEvent = { workspaceId: W, kind: 'keyword', eventId: 'e', conversation: { channel: 'whatsapp', sessionId: 's', conversationId: 'c' }, card };
    expect(filtersMatch(t({ filters: { channels: ['whatsapp'] } }), ev)).toBe(true);
    expect(filtersMatch(t({ filters: { channels: ['sms'] } }), ev)).toBe(false);
    expect(filtersMatch(t({ filters: { boardId: B, columnIds: [C1] } }), ev)).toBe(true);
    expect(filtersMatch(t({ filters: { columnIds: [C2] } }), ev)).toBe(false);
    expect(filtersMatch(t({ filters: { labels: ['vip'] } }), ev)).toBe(true);
    expect(filtersMatch(t({ filters: { labels: ['frio'] } }), ev)).toBe(false);
    // A filter on data the event does not have does not match.
    expect(filtersMatch(t({ filters: { labels: ['vip'] } }), { ...ev, card: undefined })).toBe(false);
  });

  it('echo keys of events (anti-loop)', () => {
    expect(echoOfEvent({ workspaceId: W, kind: 'card_won', eventId: 'e', card })).toEqual([`card:${card.cardId}:moved:${C1}`]);
    expect(echoOfEvent({ workspaceId: W, kind: 'card_label_added', eventId: 'e', card, labelsAdded: ['VIP'] })).toEqual([`card:${card.cardId}:label:vip`]);
  });
});

describe('lead runs and the executor', () => {
  it('card run keys', () => {
    const key = cardRunKey(W, { projectId: P, cardId: hex('c') });
    expect(key).toEqual({ workspaceId: W, channel: 'card', conversationId: `${P}:${hex('c')}` });
    expect(cardOfKey(key)).toEqual({ projectId: P, cardId: hex('c') });
    expect(cardOfKey({ channel: 'whatsapp', conversationId: 'x' })).toBeNull();
  });

  it('standard fields go to the card itself, the rest to customFields', () => {
    expect(cardUpdateBody([{ fieldId: 'card:title', value: ' Ana ' }, { fieldId: 'email', value: 'a@b.co' }, { fieldId: 'card:owner', value: hex('e') }])).toEqual({
      title: 'Ana',
      assignedUsers: [hex('e')],
      customFields: [{ fieldId: 'email', value: 'a@b.co' }],
    });
    expect(() => cardUpdateBody([{ fieldId: 'card:owner', value: 'x' }])).toThrow('OWNER_NOT_A_MEMBER');
  });

  function gateway() {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const rec =
      (method: string, result?: unknown) =>
      async (...args: unknown[]) => {
        calls.push({ method, args });
        return result;
      };
    const g: ConversationGateway = {
      context: async () => ({ vars: { 'lead.name': 'Ana' } }),
      humanRepliedSince: async () => false,
      sendText: rec('sendText', { ok: true }) as never,
      sendTemplate: rec('sendTemplate', { ok: true }) as never,
      moveCard: rec('moveCard', { ok: true }) as never,
      addLabel: rec('addLabel') as never,
      setCardField: rec('setCardField') as never,
      handoff: rec('handoff') as never,
      businessHours: async () => null,
      createCard: rec('createCard', { projectId: P, cardId: hex('3') }) as never,
      duplicateCard: rec('duplicateCard', { projectId: P, cardId: hex('4') }) as never,
      deleteCard: rec('deleteCard') as never,
      updateCardFields: rec('updateCardFields') as never,
      addComment: rec('addComment') as never,
      markRead: rec('markRead') as never,
      assignConversation: rec('assignConversation') as never,
    };
    return { g, calls };
  }
  const ctx = (over: Partial<AutomationExecutionContext> = {}): AutomationExecutionContext => ({
    key: { workspaceId: W, channel: 'whatsapp', conversationId: 'conv' },
    conversation: { workspaceId: W, channel: 'whatsapp', conversationId: 'conv', sessionId: 's', history: [] },
    automation: { id: 'auto', name: 'A', createdBy: 'u' },
    runId: 'run',
    eventId: 'e1',
    ...over,
  });

  it('a created card is the target of the later steps, and the anti-loop marker is recorded', async () => {
    const { g, calls } = gateway();
    const echoes: string[] = [];
    const exec = new GatewayEffectExecutor(g, () => undefined, async (_c, change) => void echoes.push(change));
    const out = await exec.execute(ctx({ lastAnswer: 'quinta' }), [
      { type: 'create_card', nodeId: 'c', projectId: P, columnId: C1, title: '{{lead.name}}', fields: [{ fieldId: 'note', value: '{{answer}}' }], linkConversation: true },
      { type: 'set_value', nodeId: 'v', value: '1.500,00' },
      { type: 'add_comment', nodeId: 'cm', text: 'Lead de {{lead.name}}' },
      { type: 'delete_card', nodeId: 'del' },
      { type: 'mark_read', nodeId: 'mr' },
    ]);
    expect(out.createdCard).toEqual({ projectId: P, cardId: hex('3') });
    expect(calls.map((c) => c.method)).toEqual(['createCard', 'updateCardFields', 'addComment', 'deleteCard', 'markRead']);
    expect(calls[0]!.args[1]).toMatchObject({ title: 'Ana', fields: [{ fieldId: 'note', value: 'quinta' }] });
    expect(calls[1]!.args.slice(1, 3)).toEqual([{ projectId: P, cardId: hex('3'), createdByRun: true }, [{ fieldId: 'estimateRevenue', value: '1.500,00' }]]);
    expect((calls[3]!.args[2] as { card?: unknown }).card).toEqual({ projectId: P, cardId: hex('3'), createdByRun: true });
    expect(echoes).toEqual([`project:${P}:creating`, `card:${hex("3")}:created`]);
  });

  it('a lead run without a conversation skips messages, mark-read and assignment, but runs lead steps', async () => {
    const { g, calls } = gateway();
    const log = jest.fn();
    const card = { projectId: P, cardId: hex('c') };
    const exec = new GatewayEffectExecutor(g, log);
    const out = await exec.execute(ctx({ key: cardRunKey(W, card), runCard: card }), [
      { type: 'send_message', nodeId: 'm', text: 'Oi', replyMode: 'none' },
      { type: 'mark_read', nodeId: 'mr' },
      { type: 'assign_conversation', nodeId: 'as', userId: hex('e') },
      { type: 'set_owner', nodeId: 'ow', userId: hex('e') },
      { type: 'duplicate_card', nodeId: 'dup', columnId: C2 },
    ]);
    expect(out.sendFailedNodeId).toBeUndefined();
    expect(calls.map((c) => c.method)).toEqual(['updateCardFields', 'duplicateCard']);
    expect(calls[0]!.args.slice(1, 3)).toEqual([card, [{ fieldId: 'card:owner', value: hex('e') }]]);
    expect(log).toHaveBeenCalledWith('message_skipped_no_conversation', expect.objectContaining({ nodeId: 'm' }));
  });

  it('a step whose action the gateway lacks is logged, never pretended', async () => {
    const { g, calls } = gateway();
    const log = jest.fn();
    await new GatewayEffectExecutor({ ...g, removeLabel: undefined }, log).execute(ctx({ runCard: { projectId: P, cardId: hex('c') } }), [{ type: 'remove_label', nodeId: 'rl', labelText: 'Frio' }]);
    expect(calls).toEqual([]);
    expect(log).toHaveBeenCalledWith('remove_label_unavailable', expect.objectContaining({ nodeId: 'rl' }));
  });
});

describe('time helpers', () => {
  it('local clock, day arithmetic and date values', () => {
    expect(localClock(new Date('2026-11-07T02:30:00Z'), 'America/Sao_Paulo')).toEqual({ day: '2026-11-06', weekday: 5, time: '23:30' });
    expect(localClock(new Date('2026-11-07T02:30:00Z'), undefined)).toEqual({ day: '2026-11-07', weekday: 6, time: '02:30' });
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(dateOfValue('2026-11-10')).toBe('2026-11-10');
    expect(dateOfValue('2026-11-10T15:00:00.000Z')).toBe('2026-11-10');
    expect(dateOfValue(null)).toBeNull();
  });
});
