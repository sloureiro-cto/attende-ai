import 'server-only';
import type { EngineEffect } from './advancedAutomationEngine';

export type StatIncrements = Record<string, number>;

export const utcDay = (d: Date): string => d.toISOString().slice(0, 10);

const RUN_COUNTER: Record<string, string> = {
  completed: 'completed',
  handed_off: 'handedOff',
  stopped: 'stopped',
  failed: 'failed',
};

/**
 * Turns the engine's funnel effects into `$inc` operands for the day bucket:
 * `nodes.<id>.reached`, `nodes.<id>.exits.<exit>`, and run-level counters. Pure.
 */
export function buildStatIncrements(effects: EngineEffect[]): StatIncrements {
  const inc: StatIncrements = {};
  const add = (key: string) => {
    inc[key] = (inc[key] ?? 0) + 1;
  };
  for (const effect of effects) {
    if (effect.type === 'stat') {
      if (effect.nodeId === '__run__') {
        if (effect.exit === 'started') add('started');
      } else if (effect.exit) {
        add(`nodes.${effect.nodeId}.exits.${effect.exit}`);
      } else {
        add(`nodes.${effect.nodeId}.reached`);
      }
    } else if (effect.type === 'run_ended') {
      const counter = RUN_COUNTER[effect.status];
      if (counter) add(counter);
    }
  }
  return inc;
}

export type AutomationStatsSummary = {
  started: number;
  completed: number;
  handedOff: number;
  stopped: number;
  failed: number;
  /** completed / started, 0-1 (0 when nothing started). */
  completionRate: number;
  nodes: Record<string, { reached: number; exits: Record<string, number> }>;
};

type StatsDoc = {
  started?: number;
  completed?: number;
  handedOff?: number;
  stopped?: number;
  failed?: number;
  nodes?: Record<string, { reached?: number; exits?: Record<string, number> }>;
};

/** Sums day buckets into one summary. `reachedPct` per step is derived by the caller from `started`. */
export function sumStatsDocs(docs: StatsDoc[]): AutomationStatsSummary {
  const out: AutomationStatsSummary = {
    started: 0,
    completed: 0,
    handedOff: 0,
    stopped: 0,
    failed: 0,
    completionRate: 0,
    nodes: {},
  };
  for (const doc of docs) {
    out.started += doc.started ?? 0;
    out.completed += doc.completed ?? 0;
    out.handedOff += doc.handedOff ?? 0;
    out.stopped += doc.stopped ?? 0;
    out.failed += doc.failed ?? 0;
    for (const [id, node] of Object.entries(doc.nodes ?? {})) {
      const target = (out.nodes[id] ??= { reached: 0, exits: {} });
      target.reached += node.reached ?? 0;
      for (const [exit, n] of Object.entries(node.exits ?? {})) {
        target.exits[exit] = (target.exits[exit] ?? 0) + n;
      }
    }
  }
  out.completionRate = out.started > 0 ? out.completed / out.started : 0;
  return out;
}
