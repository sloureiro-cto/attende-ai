import { GatewayEffectExecutor, MAX_MESSAGE_CHARS } from '../../modules/automations/runtime/executor';
import type { AutomationExecutionContext, ConversationGateway } from '../../modules/automations/runtime/ports';

type Call = { method: string; args: unknown[] };

function fakeGateway(linkedCardId: string | undefined = 'card1') {
  const calls: Call[] = [];
  const rec =
    (method: string, result?: unknown) =>
    async (...args: unknown[]) => {
      calls.push({ method, args });
      return result;
    };
  const gateway: ConversationGateway = {
    context: async () => ({ linkedCardId, vars: { 'lead.name': 'Ana' } }),
    humanRepliedSince: async () => false,
    sendText: rec('sendText', { ok: true }) as never,
    sendTemplate: rec('sendTemplate', { ok: true }) as never,
    moveCard: rec('moveCard', { ok: true }) as never,
    addLabel: rec('addLabel') as never,
    setCardField: rec('setCardField') as never,
    handoff: rec('handoff') as never,
    businessHours: async () => null,
  };
  return { gateway, calls };
}

const ctx = (eventId?: string): AutomationExecutionContext => ({
  key: { workspaceId: 'w'.repeat(24), channel: 'whatsapp', conversationId: 'conv1' },
  conversation: { workspaceId: 'w'.repeat(24), channel: 'whatsapp', conversationId: 'conv1', sessionId: 's', history: [] },
  automation: { id: 'auto1', name: 'A', createdBy: 'u' },
  runId: 'run1',
  eventId,
});

const keyOf = (c: Call) => (c.args.at(-1) as { idempotencyKey: string }).idempotencyKey;

describe('GatewayEffectExecutor', () => {
  it('keys every action by run, step and event, never by time or a constant', async () => {
    const { gateway, calls } = fakeGateway();
    const executor = new GatewayEffectExecutor(gateway, () => undefined);
    const effects = [
      { type: 'send_message' as const, nodeId: 'ask', text: 'Oi {{lead.name}}', replyMode: 'none' as const },
      { type: 'move_stage' as const, nodeId: 'mv', columnId: 'col1', boardId: 'b1', projectId: 'p1' },
      { type: 'add_label' as const, nodeId: 'lb', labelText: 'Quente' },
      { type: 'set_field' as const, nodeId: 'sf', fieldId: 'f1', value: '{{lead.name}}' },
      { type: 'handoff' as const, nodeId: 'ho', message: 'Vou chamar alguém.' },
    ];
    await executor.execute(ctx('msg-1'), effects);
    expect(calls.map((c) => [c.method, keyOf(c)])).toEqual([
      ['sendText', 'run1:ask:msg-1'],
      ['moveCard', 'run1:mv:msg-1'],
      ['addLabel', 'run1:lb:msg-1'],
      ['setCardField', 'run1:sf:msg-1:field:f1'],
      ['sendText', 'run1:ho:msg-1:message'],
      ['handoff', 'run1:ho:msg-1'],
    ]);

    // The same step retried gives the same keys (a replay in JSYNQ); another event gives new ones.
    const again = fakeGateway();
    await new GatewayEffectExecutor(again.gateway, () => undefined).execute(ctx('msg-1'), effects);
    expect(again.calls.map(keyOf)).toEqual(calls.map(keyOf));
    const next = fakeGateway();
    await new GatewayEffectExecutor(next.gateway, () => undefined).execute(ctx('rev7'), effects);
    expect(next.calls.map(keyOf).every((k) => k.includes(':rev7'))).toBe(true);
  });

  it('a node reached twice in one batch gets a distinct key', async () => {
    const { gateway, calls } = fakeGateway();
    const send = { type: 'send_message' as const, nodeId: 'loop', text: 'x', replyMode: 'none' as const };
    await new GatewayEffectExecutor(gateway, () => undefined).execute(ctx('e'), [send, send]);
    expect(calls.map(keyOf)).toEqual(['run1:loop:e', 'run1:loop:e:1']);
  });

  it('moveCard sends only {columnId, boardId?}: JSYNQ resolves the card', async () => {
    const { gateway, calls } = fakeGateway(undefined);
    await new GatewayEffectExecutor(gateway, () => undefined).execute(ctx('e'), [{ type: 'move_stage', nodeId: 'mv', columnId: 'col1', projectId: 'p1' }]);
    expect(calls[0]!.args[1]).toEqual({ columnId: 'col1', boardId: undefined });
  });

  it('handoff always sends assignMode: the configured one, else all CRM members', async () => {
    const { gateway, calls } = fakeGateway();
    const executor = new GatewayEffectExecutor(gateway, () => undefined);
    await executor.execute(ctx('e1'), [{ type: 'handoff', nodeId: 'h1', assign: { assignMode: 'specific_user', specificUserId: 'u'.repeat(24) } }]);
    await executor.execute(ctx('e2'), [{ type: 'handoff', nodeId: 'h2' }]);
    expect(calls.map((c) => c.args[1])).toEqual([{ assignMode: 'specific_user', specificUserId: 'u'.repeat(24) }, { assignMode: 'all_crm_members' }]);
  });

  it('a composed message over 4096 chars is not sent and takes the send_failed exit', async () => {
    const log = jest.fn();
    const { gateway, calls } = fakeGateway();
    const out = await new GatewayEffectExecutor(gateway, log).execute(ctx('e'), [
      { type: 'send_message', nodeId: 'big', text: 'a'.repeat(MAX_MESSAGE_CHARS - 10), replyMode: 'none', attachmentUrl: 'https://cdn.example/file.pdf' },
      { type: 'send_message', nodeId: 'after', text: 'later', replyMode: 'none' },
    ]);
    expect(out.sendFailedNodeId).toBe('big');
    expect(calls).toEqual([]);
    expect(log).toHaveBeenCalledWith('send_failed', expect.objectContaining({ nodeId: 'big', error: 'MESSAGE_TOO_LONG' }));

    const exact = fakeGateway();
    const ok = await new GatewayEffectExecutor(exact.gateway, () => undefined).execute(ctx('e'), [{ type: 'send_message', nodeId: 'max', text: 'a'.repeat(MAX_MESSAGE_CHARS), replyMode: 'none' }]);
    expect(ok.sendFailedNodeId).toBeUndefined();
    expect(exact.calls).toHaveLength(1);
  });
});
