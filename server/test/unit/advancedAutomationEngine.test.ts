import {
  advanceAutomationRun,
  BUSINESS_HOURS_RECHECK_MS,
  newRunState,
  type EngineEffect,
  type EnginePorts,
  type EngineEvent,
} from '../../modules/automations/lib/advancedAutomationEngine';
import type {
  AdvancedAutomationEdge,
  AdvancedAutomationNode,
  AdvancedAutomationRunState,
} from '../../modules/automations/types';
import { ADVANCED_AUTOMATION_LIMITS } from '../../modules/automations/types';

const T0 = new Date('2026-10-22T12:00:00Z');
const min = (n: number) => n * 60_000;

const pos = { x: 0, y: 0 };
const msg = (
  id: string,
  over: Record<string, unknown> = {}
): AdvancedAutomationNode =>
  ({
    id,
    kind: 'send_message',
    text: `hello ${id}`,
    replyMode: 'none',
    ...pos,
    ...over,
  }) as AdvancedAutomationNode;
const edge = (
  from: string,
  output: string,
  to: string
): AdvancedAutomationEdge => ({
  id: `${from}-${output}-${to}`.slice(0, 40),
  from,
  output,
  to,
});

const ports = (over: Partial<EnginePorts> = {}): EnginePorts => ({
  now: T0,
  evaluateCondition: async () => false,
  interpretAnswer: async () => ({ understood: false }),
  isWithinBusinessHours: () => true,
  bucket: () => 0,
  ...over,
});

const fresh = (): AdvancedAutomationRunState =>
  newRunState({
    automationId: 'b',
    runId: 'run1',
    automationVersion: 1,
    now: T0,
  });

async function step(
  automation: {
    nodes: AdvancedAutomationNode[];
    edges: AdvancedAutomationEdge[];
    startNodeId: string;
  },
  state: AdvancedAutomationRunState,
  event: EngineEvent,
  p: Partial<EnginePorts> = {}
) {
  return advanceAutomationRun({ automation, state, event, ports: ports(p) });
}

const sent = (effects: EngineEffect[]) =>
  effects.flatMap((e) => (e.type === 'send_message' ? [e] : []));
const stats = (effects: EngineEffect[]) =>
  effects.flatMap((e) =>
    e.type === 'stat' ? [`${e.nodeId}${e.exit ? `:${e.exit}` : ''}`] : []
  );

describe('advanceAutomationRun', () => {
  describe('linear flows', () => {
    it('sends messages in order and completes at the end of the flow', async () => {
      const automation = {
        startNodeId: 'a',
        nodes: [msg('a'), msg('b')],
        edges: [edge('a', 'next', 'b')],
      };
      const { state, effects } = await step(automation, fresh(), {
        type: 'start',
      });
      expect(sent(effects).map((s) => s.nodeId)).toEqual(['a', 'b']);
      expect(state.status).toBe('completed');
      expect(effects.at(-1)).toEqual({
        type: 'run_ended',
        status: 'completed',
      });
      expect(stats(effects)).toEqual([
        '__run__:started',
        'a',
        'a:next',
        'b',
        'b:next',
      ]);
    });

    it('fails (not loops) when the start step does not exist', async () => {
      const { state } = await step(
        { startNodeId: 'ghost', nodes: [msg('a')], edges: [] },
        fresh(),
        { type: 'start' }
      );
      expect(state.status).toBe('failed');
    });
  });

  describe('questions with options', () => {
    const automation = {
      startNodeId: 'ask',
      nodes: [
        msg('ask', {
          replyMode: 'list',
          options: [
            { id: 'quote', label: 'Cotação' },
            { id: 'human', label: 'Falar com atendente' },
            { id: 'info', label: 'Informações' },
            { id: 'cancel', label: 'Cancelar' },
          ],
          noReplyMinutes: 30,
        }),
        msg('q'),
        msg('h'),
        msg('o'),
        msg('nr'),
      ],
      edges: [
        edge('ask', 'quote', 'q'),
        edge('ask', 'human', 'h'),
        edge('ask', 'other', 'o'),
        edge('ask', 'no_reply', 'nr'),
      ],
    };

    it('a list of 4 options exposes 4 exits + other + no_reply, and waits', async () => {
      const { state, effects } = await step(automation, fresh(), {
        type: 'start',
      });
      expect(state.status).toBe('waiting');
      expect(state.wait).toMatchObject({ kind: 'reply', nodeId: 'ask' });
      expect(
        state.wait?.kind === 'reply' && state.wait.timeoutAt?.getTime()
      ).toBe(T0.getTime() + min(30));
      expect(sent(effects)[0]!.options).toHaveLength(4);
    });

    it('routes by interactive id, by number and by label', async () => {
      const waiting = (await step(automation, fresh(), { type: 'start' }))
        .state;
      for (const event of [
        { type: 'inbound', text: '', optionId: 'quote' },
        { type: 'inbound', text: '1' },
        { type: 'inbound', text: 'cotacao' },
      ] as EngineEvent[]) {
        const { effects } = await step(automation, waiting, event);
        expect(stats(effects)).toContain('ask:quote');
        expect(sent(effects).map((s) => s.nodeId)).toEqual(['q']);
      }
    });

    it('records the funnel: reached, exit taken, next step reached', async () => {
      const waiting = (await step(automation, fresh(), { type: 'start' }))
        .state;
      const { effects } = await step(automation, waiting, {
        type: 'inbound',
        text: '2',
      });
      expect(stats(effects)).toEqual(['ask:human', 'h', 'h:next']);
    });

    it('an unrecognised answer takes the other exit when connected', async () => {
      const waiting = (await step(automation, fresh(), { type: 'start' }))
        .state;
      const { state, effects } = await step(automation, waiting, {
        type: 'inbound',
        text: 'blablabla',
      });
      expect(sent(effects).map((s) => s.nodeId)).toEqual(['o']);
      expect(state.status).toBe('completed');
    });

    it('an unrecognised answer with no other path keeps waiting silently', async () => {
      const noOther = {
        ...automation,
        edges: automation.edges.filter((e) => e.output !== 'other'),
      };
      const waiting = (await step(noOther, fresh(), { type: 'start' })).state;
      const { state, effects } = await step(noOther, waiting, {
        type: 'inbound',
        text: 'blablabla',
      });
      expect(effects).toEqual([]);
      expect(state.status).toBe('waiting');
      expect(state.wait).toEqual(waiting.wait);
    });

    it('the no-reply timeout fires only when due', async () => {
      const waiting = (await step(automation, fresh(), { type: 'start' }))
        .state;
      const early = await step(
        automation,
        waiting,
        { type: 'timer' },
        { now: new Date(T0.getTime() + min(10)) }
      );
      expect(early.effects).toEqual([]);
      expect(early.state.status).toBe('waiting');

      const due = await step(
        automation,
        waiting,
        { type: 'timer' },
        { now: new Date(T0.getTime() + min(31)) }
      );
      expect(stats(due.effects)).toContain('ask:no_reply');
      expect(sent(due.effects).map((s) => s.nodeId)).toEqual(['nr']);
    });

    it('business-hours-only timeout is postponed while the business is closed', async () => {
      const closedAutomation = {
        ...automation,
        nodes: [
          msg('ask', {
            ...(automation.nodes[0] as object),
            noReplyBusinessHoursOnly: true,
          }),
          ...automation.nodes.slice(1),
        ],
      };
      const waiting = (await step(closedAutomation, fresh(), { type: 'start' }))
        .state;
      const now = new Date(T0.getTime() + min(31));
      const res = await step(
        closedAutomation,
        waiting,
        { type: 'timer' },
        { now, isWithinBusinessHours: () => false }
      );
      expect(res.state.status).toBe('waiting');
      expect(res.effects).toEqual([]);
      expect(
        res.state.wait?.kind === 'reply' && res.state.wait.timeoutAt?.getTime()
      ).toBe(now.getTime() + BUSINESS_HOURS_RECHECK_MS);

      const open = await step(
        closedAutomation,
        res.state,
        { type: 'timer' },
        { now: new Date(now.getTime() + BUSINESS_HOURS_RECHECK_MS) }
      );
      expect(sent(open.effects).map((s) => s.nodeId)).toEqual(['nr']);
    });

    it('a delivery failure takes the send_failed exit, or fails the run when it is not connected', async () => {
      const withFail = {
        ...automation,
        nodes: [...automation.nodes, msg('sf')],
        edges: [...automation.edges, edge('ask', 'send_failed', 'sf')],
      };
      const waiting = (await step(withFail, fresh(), { type: 'start' })).state;
      const routed = await step(withFail, waiting, { type: 'send_failed' });
      expect(sent(routed.effects).map((s) => s.nodeId)).toEqual(['sf']);

      const unrouted = await step(automation, waiting, { type: 'send_failed' });
      expect(unrouted.state.status).toBe('failed');
    });
  });

  describe('free-text questions', () => {
    const automation = {
      startNodeId: 'ask',
      nodes: [
        msg('ask', { replyMode: 'free', saveAnswerTo: 'cf_model' }),
        {
          id: 'ai',
          kind: 'ai_agent',
          instruction: 'car model',
          saveAnswerTo: 'cf_model',
          ...pos,
        } as AdvancedAutomationNode,
        msg('ok'),
        msg('retry'),
      ],
      edges: [
        edge('ask', 'answered', 'ai'),
        edge('ai', 'understood', 'ok'),
        edge('ai', 'not_understood', 'retry'),
      ],
    };

    it('saves the answer to the lead field and lets the AI step interpret it', async () => {
      const waiting = (await step(automation, fresh(), { type: 'start' }))
        .state;
      const interpretAnswer = jest.fn(async () => ({
        understood: true,
        value: 'Toyota Corolla',
      }));
      const { state, effects } = await step(
        automation,
        waiting,
        { type: 'inbound', text: 'um corola ai' },
        { interpretAnswer }
      );
      expect(effects).toContainEqual({
        type: 'set_field',
        nodeId: 'ask',
        fieldId: 'cf_model',
        value: 'um corola ai',
        literal: true,
      });
      expect(effects).toContainEqual({
        type: 'set_field',
        nodeId: 'ai',
        fieldId: 'cf_model',
        value: 'Toyota Corolla',
        literal: true,
      });
      expect(interpretAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ai' }),
        'um corola ai'
      );
      expect(sent(effects).map((s) => s.nodeId)).toEqual(['ok']);
      expect(state.vars.cf_model).toBe('Toyota Corolla');
    });

    it('a media reply ("" text) answers the question without blanking the field', async () => {
      const waiting = (await step(automation, fresh(), { type: 'start' })).state;
      const { effects } = await step(automation, waiting, { type: 'inbound', text: '' });
      expect(effects.some((e) => e.type === 'set_field')).toBe(false);
      expect(effects).toContainEqual({ type: 'stat', nodeId: 'ask', exit: 'answered' });
      expect(sent(effects).map((s) => s.nodeId)).toEqual(['retry']);
    });

    it('takes not_understood when the AI cannot read the answer or throws', async () => {
      const waiting = (await step(automation, fresh(), { type: 'start' }))
        .state;
      for (const interpretAnswer of [
        async () => ({ understood: false }),
        async () => {
          throw new Error('gateway down');
        },
      ]) {
        const { effects } = await step(
          automation,
          waiting,
          { type: 'inbound', text: 'asdf' },
          { interpretAnswer }
        );
        expect(sent(effects).map((s) => s.nodeId)).toEqual(['retry']);
      }
    });
  });

  describe('logic steps', () => {
    it('condition takes the first matching row, else none; a throwing condition counts as false', async () => {
      const automation = {
        startNodeId: 'c',
        nodes: [
          {
            id: 'c',
            kind: 'condition',
            rows: [
              {
                id: 'r1',
                name: 'a',
                condition: { type: 'contains', value: 'a' },
              },
              {
                id: 'r2',
                name: 'b',
                condition: { type: 'contains', value: 'b' },
              },
            ],
            ...pos,
          } as AdvancedAutomationNode,
          msg('x1'),
          msg('x2'),
          msg('xn'),
        ],
        edges: [
          edge('c', 'r1', 'x1'),
          edge('c', 'r2', 'x2'),
          edge('c', 'none', 'xn'),
        ],
      };
      const evaluate =
        (held: string) => async (c: { type: string; value?: string }) =>
          c.value === held;
      expect(
        sent(
          (
            await step(
              automation,
              fresh(),
              { type: 'start' },
              { evaluateCondition: evaluate('b') as never }
            )
          ).effects
        ).map((s) => s.nodeId)
      ).toEqual(['x2']);
      expect(
        sent(
          (
            await step(
              automation,
              fresh(),
              { type: 'start' },
              { evaluateCondition: evaluate('zzz') as never }
            )
          ).effects
        ).map((s) => s.nodeId)
      ).toEqual(['xn']);
      expect(
        sent(
          (
            await step(
              automation,
              fresh(),
              { type: 'start' },
              {
                evaluateCondition: async () => {
                  throw new Error('x');
                },
              }
            )
          ).effects
        ).map((s) => s.nodeId)
      ).toEqual(['xn']);
    });

    it('wait parks the run until due, then continues on next', async () => {
      const automation = {
        startNodeId: 'w',
        nodes: [
          {
            id: 'w',
            kind: 'wait',
            minutes: 60,
            ...pos,
          } as AdvancedAutomationNode,
          msg('after'),
        ],
        edges: [edge('w', 'next', 'after')],
      };
      const parked = await step(automation, fresh(), { type: 'start' });
      expect(parked.state.status).toBe('waiting');
      expect(parked.state.wait).toMatchObject({
        kind: 'timer',
        until: new Date(T0.getTime() + min(60)),
      });

      const tooEarly = await step(
        automation,
        parked.state,
        { type: 'timer' },
        { now: new Date(T0.getTime() + min(30)) }
      );
      expect(tooEarly.effects).toEqual([]);
      const due = await step(
        automation,
        parked.state,
        { type: 'timer' },
        { now: new Date(T0.getTime() + min(61)) }
      );
      expect(sent(due.effects).map((s) => s.nodeId)).toEqual(['after']);
    });

    it('an inbound message during a timer wait does not advance the run', async () => {
      const automation = {
        startNodeId: 'w',
        nodes: [
          {
            id: 'w',
            kind: 'wait',
            minutes: 60,
            ...pos,
          } as AdvancedAutomationNode,
          msg('after'),
        ],
        edges: [edge('w', 'next', 'after')],
      };
      const parked = (await step(automation, fresh(), { type: 'start' })).state;
      const res = await step(automation, parked, {
        type: 'inbound',
        text: 'hello?',
      });
      expect(res.effects).toEqual([]);
      expect(res.state.status).toBe('waiting');
    });

    it('A/B split is driven by the stable bucket', async () => {
      const automation = {
        startNodeId: 's',
        nodes: [
          {
            id: 's',
            kind: 'split',
            paths: [
              { id: 'a', name: 'A', percent: 30 },
              { id: 'b', name: 'B', percent: 30 },
            ],
            ...pos,
          } as AdvancedAutomationNode,
          msg('xa'),
          msg('xb'),
          msg('xe'),
        ],
        edges: [
          edge('s', 'a', 'xa'),
          edge('s', 'b', 'xb'),
          edge('s', 'else', 'xe'),
        ],
      };
      const pick = async (bucket: number) =>
        sent(
          (
            await step(
              automation,
              fresh(),
              { type: 'start' },
              { bucket: () => bucket }
            )
          ).effects
        ).map((s) => s.nodeId)[0];
      expect(await pick(0)).toBe('xa');
      expect(await pick(29)).toBe('xa');
      expect(await pick(30)).toBe('xb');
      expect(await pick(59)).toBe('xb');
      expect(await pick(60)).toBe('xe');
      expect(await pick(99)).toBe('xe');
    });
  });

  describe('actions and endings', () => {
    it('runs CRM actions in order and ends with handoff', async () => {
      const automation = {
        startNodeId: 'a',
        nodes: [
          {
            id: 'a',
            kind: 'add_label',
            labelText: 'hot',
            ...pos,
          } as AdvancedAutomationNode,
          {
            id: 'm',
            kind: 'move_stage',
            columnId: 'c'.repeat(24),
            ...pos,
          } as AdvancedAutomationNode,
          {
            id: 't',
            kind: 'create_task',
            title: 'Call',
            dueInHours: 2,
            ...pos,
          } as AdvancedAutomationNode,
          {
            id: 'h',
            kind: 'handoff',
            message: 'Um atendente vai continuar',
            ...pos,
          } as AdvancedAutomationNode,
        ],
        edges: [
          edge('a', 'next', 'm'),
          edge('m', 'next', 't'),
          edge('t', 'next', 'h'),
        ],
      };
      const { state, effects } = await step(automation, fresh(), {
        type: 'start',
      });
      expect(
        effects.filter((e) => e.type !== 'stat').map((e) => e.type)
      ).toEqual([
        'add_label',
        'move_stage',
        'create_task',
        'handoff',
        'run_ended',
      ]);
      expect(state.status).toBe('handed_off');
    });

    it('goto_automation ends this run and asks the runtime to enter the other automation', async () => {
      const automation = {
        startNodeId: 'g',
        nodes: [
          {
            id: 'g',
            kind: 'goto_automation',
            automationId: 'd'.repeat(24),
            ...pos,
          } as AdvancedAutomationNode,
        ],
        edges: [],
      };
      const { state, effects } = await step(automation, fresh(), {
        type: 'start',
      });
      expect(effects).toContainEqual({
        type: 'enter_automation',
        automationId: 'd'.repeat(24),
      });
      expect(state.status).toBe('completed');
    });

    it('stop completes the run', async () => {
      const { state } = await step(
        {
          startNodeId: 's',
          nodes: [{ id: 's', kind: 'stop', ...pos } as AdvancedAutomationNode],
          edges: [],
        },
        fresh(),
        { type: 'start' }
      );
      expect(state.status).toBe('completed');
    });
  });

  describe('safety: no infinite loops', () => {
    it('a loop with no waiting step fails after the per-advance limit instead of spinning', async () => {
      const automation = {
        startNodeId: 'a',
        nodes: [msg('a'), msg('b')],
        edges: [edge('a', 'next', 'b'), edge('b', 'next', 'a')],
      };
      const { state, effects } = await step(automation, fresh(), {
        type: 'start',
      });
      expect(state.status).toBe('failed');
      expect(
        effects.filter((e) => e.type === 'send_message').length
      ).toBeLessThanOrEqual(ADVANCED_AUTOMATION_LIMITS.stepsPerAdvance);
      expect(effects.at(-1)).toEqual({ type: 'run_ended', status: 'failed' });
    });

    it('a re-ask loop through a waiting question is allowed but capped over the whole run', async () => {
      const automation = {
        startNodeId: 'ask',
        nodes: [
          msg('ask', {
            replyMode: 'buttons',
            options: [{ id: 'again', label: 'Again' }],
          }),
        ],
        edges: [edge('ask', 'again', 'ask')],
      };
      let state = (await step(automation, fresh(), { type: 'start' })).state;
      let guard = 0;
      while (state.status === 'waiting' && guard < 1000) {
        state = (await step(automation, state, { type: 'inbound', text: '1' }))
          .state;
        guard += 1;
      }
      expect(state.status).toBe('failed');
      expect(state.steps).toBeLessThanOrEqual(
        ADVANCED_AUTOMATION_LIMITS.stepsPerRun
      );
      expect(guard).toBeLessThan(1000);
    });
  });

  describe('purity', () => {
    it('never mutates the state it was given', async () => {
      const automation = {
        startNodeId: 'ask',
        nodes: [msg('ask', { replyMode: 'free', saveAnswerTo: 'f' }), msg('n')],
        edges: [edge('ask', 'answered', 'n')],
      };
      const waiting = (await step(automation, fresh(), { type: 'start' }))
        .state;
      const snapshot = JSON.parse(JSON.stringify(waiting));
      await step(automation, waiting, { type: 'inbound', text: 'x' });
      expect(JSON.parse(JSON.stringify(waiting))).toEqual(snapshot);
    });

    it('events on a finished run change nothing', async () => {
      const automation = { startNodeId: 'a', nodes: [msg('a')], edges: [] };
      const done = (await step(automation, fresh(), { type: 'start' })).state;
      for (const event of [
        { type: 'inbound', text: 'hi' },
        { type: 'timer' },
        { type: 'send_failed' },
      ] as EngineEvent[]) {
        const res = await step(automation, done, event);
        expect(res.effects).toEqual([]);
        expect(res.state.status).toBe('completed');
      }
    });
  });
});
