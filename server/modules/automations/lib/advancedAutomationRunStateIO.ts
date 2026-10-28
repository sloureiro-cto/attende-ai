import 'server-only';
import {
  ADVANCED_AUTOMATION_LIMITS,
  type AdvancedAutomationNode,
  type AdvancedAutomationRunState,
  type AdvancedAutomationRunStatus,
  type AdvancedAutomationWait,
} from '../types';

/** JSON-safe form of a run state (dates as ISO strings), used by the preview round trip. */
export type SerializedRunState = {
  automationId: string;
  runId: string;
  automationVersion: number;
  status: AdvancedAutomationRunStatus;
  nodeId: string | null;
  wait?:
    | { kind: 'reply'; nodeId: string; timeoutAt?: string }
    | { kind: 'timer'; nodeId: string; until: string };
  steps: number;
  vars: Record<string, string>;
  lastAnswer?: string;
  startedAt: string;
  updatedAt: string;
};

export function serializeRunState(
  state: AdvancedAutomationRunState
): SerializedRunState {
  const wait = state.wait;
  return {
    automationId: state.automationId,
    runId: state.runId,
    automationVersion: state.automationVersion,
    status: state.status,
    nodeId: state.nodeId,
    ...(wait
      ? {
          wait:
            wait.kind === 'reply'
              ? {
                  kind: 'reply' as const,
                  nodeId: wait.nodeId,
                  ...(wait.timeoutAt
                    ? { timeoutAt: wait.timeoutAt.toISOString() }
                    : {}),
                }
              : {
                  kind: 'timer' as const,
                  nodeId: wait.nodeId,
                  until: wait.until.toISOString(),
                },
        }
      : {}),
    steps: state.steps,
    vars: state.vars,
    ...(state.lastAnswer !== undefined ? { lastAnswer: state.lastAnswer } : {}),
    startedAt: state.startedAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  };
}

const STATUSES: AdvancedAutomationRunStatus[] = [
  'active',
  'waiting',
  'completed',
  'handed_off',
  'stopped',
  'failed',
];
const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const date = (v: unknown): Date | null =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v) : null;

/**
 * Strictly parses a run state sent back by a client. The client is not trusted: every field is
 * checked and a step id must exist in the automation, so a tampered state can't point the engine at
 * nothing or inflate counters. Returns null when anything is off.
 */
export function parseRunState(
  raw: unknown,
  nodes: AdvancedAutomationNode[]
): AdvancedAutomationRunState | null {
  if (!isRecord(raw)) return null;
  const ids = new Set(nodes.map((n) => n.id));
  const {
    automationId,
    runId,
    automationVersion,
    status,
    nodeId,
    wait,
    steps,
    vars,
    lastAnswer,
  } = raw;
  const startedAt = date(raw.startedAt);
  const updatedAt = date(raw.updatedAt);
  if (
    typeof automationId !== 'string' ||
    automationId.length > 64 ||
    typeof runId !== 'string' ||
    runId.length > 64 ||
    typeof automationVersion !== 'number' ||
    !Number.isInteger(automationVersion) ||
    automationVersion < 0 ||
    typeof status !== 'string' ||
    !STATUSES.includes(status as AdvancedAutomationRunStatus) ||
    !(nodeId === null || (typeof nodeId === 'string' && ids.has(nodeId))) ||
    typeof steps !== 'number' ||
    !Number.isInteger(steps) ||
    steps < 0 ||
    steps > ADVANCED_AUTOMATION_LIMITS.stepsPerRun ||
    !startedAt ||
    !updatedAt
  ) {
    return null;
  }

  const safeVars: Record<string, string> = {};
  if (vars !== undefined) {
    if (!isRecord(vars) || Object.keys(vars).length > 50) return null;
    for (const [k, v] of Object.entries(vars)) {
      if (k.length > 64 || typeof v !== 'string' || v.length > 2000)
        return null;
      safeVars[k] = v;
    }
  }
  if (
    lastAnswer !== undefined &&
    (typeof lastAnswer !== 'string' || lastAnswer.length > 4000)
  )
    return null;

  let parsedWait: AdvancedAutomationWait | undefined;
  if (wait !== undefined) {
    if (
      !isRecord(wait) ||
      typeof wait.nodeId !== 'string' ||
      !ids.has(wait.nodeId)
    )
      return null;
    if (wait.kind === 'reply') {
      const timeoutAt =
        wait.timeoutAt === undefined ? undefined : date(wait.timeoutAt);
      if (wait.timeoutAt !== undefined && !timeoutAt) return null;
      parsedWait = {
        kind: 'reply',
        nodeId: wait.nodeId,
        ...(timeoutAt ? { timeoutAt } : {}),
      };
    } else if (wait.kind === 'timer') {
      const until = date(wait.until);
      if (!until) return null;
      parsedWait = { kind: 'timer', nodeId: wait.nodeId, until };
    } else {
      return null;
    }
  }
  if (status === 'waiting' && !parsedWait) return null;

  return {
    automationId,
    runId,
    automationVersion,
    status: status as AdvancedAutomationRunStatus,
    nodeId: nodeId as string | null,
    ...(parsedWait ? { wait: parsedWait } : {}),
    steps,
    vars: safeVars,
    ...(lastAnswer !== undefined ? { lastAnswer: lastAnswer as string } : {}),
    startedAt,
    updatedAt,
  };
}
