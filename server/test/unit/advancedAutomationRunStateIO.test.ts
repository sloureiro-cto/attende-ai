import {
  parseRunState,
  serializeRunState,
} from '../../modules/automations/lib/advancedAutomationRunStateIO';
import { newRunState } from '../../modules/automations/lib/advancedAutomationEngine';
import type {
  AdvancedAutomationNode,
  AdvancedAutomationRunState,
} from '../../modules/automations/types';

const nodes = [
  { id: 'a', kind: 'stop', x: 0, y: 0 },
  { id: 'b', kind: 'stop', x: 0, y: 0 },
] as AdvancedAutomationNode[];
const T = new Date('2026-10-22T12:00:00Z');
const base = (): AdvancedAutomationRunState => ({
  ...newRunState({
    automationId: 'automation1',
    runId: 'run1',
    automationVersion: 3,
    now: T,
  }),
  status: 'waiting',
  nodeId: 'a',
  wait: {
    kind: 'reply',
    nodeId: 'a',
    timeoutAt: new Date(T.getTime() + 60_000),
  },
  steps: 2,
  vars: { f: 'x' },
  lastAnswer: 'hi',
});

describe('run state round trip', () => {
  it('serializes and parses back to an equal state', () => {
    const state = base();
    expect(
      parseRunState(JSON.parse(JSON.stringify(serializeRunState(state))), nodes)
    ).toEqual(state);
  });

  it('round-trips a timer wait', () => {
    const state: AdvancedAutomationRunState = {
      ...base(),
      wait: { kind: 'timer', nodeId: 'b', until: new Date(T.getTime() + 5000) },
    };
    expect(
      parseRunState(JSON.parse(JSON.stringify(serializeRunState(state))), nodes)
    ).toEqual(state);
  });

  it('rejects anything a client could tamper with', () => {
    const ok = JSON.parse(JSON.stringify(serializeRunState(base()))) as Record<string, unknown>;
    const cases: Array<[string, Record<string, unknown>]> = [
      ['unknown node', { nodeId: 'ghost' }],
      ['unknown wait node', { wait: { kind: 'reply', nodeId: 'ghost' } }],
      ['bad status', { status: 'hacked' }],
      ['waiting without wait', { wait: undefined }],
      ['steps over the cap', { steps: 10_000 }],
      ['negative steps', { steps: -1 }],
      ['fractional steps', { steps: 1.5 }],
      ['bad date', { startedAt: 'nope' }],
      [
        'too many vars',
        {
          vars: Object.fromEntries(
            Array.from({ length: 51 }, (_, i) => [`k${i}`, 'v'])
          ),
        },
      ],
      ['non-string var', { vars: { a: 1 } }],
      ['huge var', { vars: { a: 'x'.repeat(2001) } }],
      ['huge lastAnswer', { lastAnswer: 'x'.repeat(4001) }],
      ['bad wait kind', { wait: { kind: 'forever', nodeId: 'a' } }],
      [
        'bad timeout date',
        { wait: { kind: 'reply', nodeId: 'a', timeoutAt: 'x' } },
      ],
    ];
    for (const [label, patch] of cases) {
      expect({
        label,
        parsed: parseRunState({ ...ok, ...patch }, nodes),
      }).toEqual({ label, parsed: null });
    }
    expect(parseRunState(null, nodes)).toBeNull();
    expect(parseRunState([], nodes)).toBeNull();
    expect(parseRunState('x', nodes)).toBeNull();
  });
});
