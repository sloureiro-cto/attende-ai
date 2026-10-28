import {
  buildStatIncrements,
  sumStatsDocs,
  utcDay,
} from '../../modules/automations/lib/advancedAutomationStats';
import type { EngineEffect } from '../../modules/automations/lib/advancedAutomationEngine';

describe('buildStatIncrements', () => {
  it('counts steps reached, exits taken and run outcomes', () => {
    const effects: EngineEffect[] = [
      { type: 'stat', nodeId: '__run__', exit: 'started' },
      { type: 'stat', nodeId: 'ask' },
      { type: 'stat', nodeId: 'ask', exit: 'quote' },
      { type: 'stat', nodeId: 'q' },
      { type: 'stat', nodeId: 'q', exit: 'next' },
      { type: 'run_ended', status: 'completed' },
    ];
    expect(buildStatIncrements(effects)).toEqual({
      started: 1,
      'nodes.ask.reached': 1,
      'nodes.ask.exits.quote': 1,
      'nodes.q.reached': 1,
      'nodes.q.exits.next': 1,
      completed: 1,
    });
  });

  it('adds up repeated hits and maps every end status', () => {
    const inc = buildStatIncrements([
      { type: 'stat', nodeId: 'a' },
      { type: 'stat', nodeId: 'a' },
      { type: 'run_ended', status: 'handed_off' },
      { type: 'run_ended', status: 'failed' },
      { type: 'run_ended', status: 'stopped' },
    ]);
    expect(inc).toMatchObject({
      'nodes.a.reached': 2,
      handedOff: 1,
      failed: 1,
      stopped: 1,
    });
  });

  it('ignores effects that are not funnel data', () => {
    expect(
      buildStatIncrements([
        { type: 'add_label', nodeId: 'l', labelText: 'x' },
        { type: 'send_message', nodeId: 'a', text: 't', replyMode: 'none' },
      ])
    ).toEqual({});
  });
});

describe('sumStatsDocs', () => {
  it('sums buckets and derives the completion rate', () => {
    const s = sumStatsDocs([
      {
        started: 10,
        completed: 4,
        nodes: { ask: { reached: 10, exits: { yes: 6, no: 4 } } },
      },
      {
        started: 10,
        completed: 1,
        failed: 2,
        nodes: { ask: { reached: 10, exits: { yes: 5 } }, end: { reached: 5 } },
      },
    ]);
    expect(s).toMatchObject({
      started: 20,
      completed: 5,
      failed: 2,
      completionRate: 0.25,
    });
    expect(s.nodes.ask).toEqual({ reached: 20, exits: { yes: 11, no: 4 } });
    expect(s.nodes.end).toEqual({ reached: 5, exits: {} });
  });
  it('handles no data', () => {
    expect(sumStatsDocs([])).toMatchObject({
      started: 0,
      completionRate: 0,
      nodes: {},
    });
  });
});

describe('utcDay', () => {
  it('formats the UTC date', () => {
    expect(utcDay(new Date('2026-10-22T23:59:59Z'))).toBe('2026-10-22');
    expect(utcDay(new Date('2026-10-23T00:00:00Z'))).toBe('2026-10-23');
  });
});
