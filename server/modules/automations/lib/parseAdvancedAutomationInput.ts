import 'server-only';
import { badRequest } from '../../../lib/errors';
import {
  ADVANCED_AUTOMATION_LIMITS,
  type AdvancedAutomationEdge,
  type AdvancedAutomationNode,
  type AdvancedAutomationStatus,
  type AdvancedAutomationTrigger,
} from '../types';

export const AUTOMATION_CHANNELS = ['whatsapp', 'instagram', 'sms'] as const;
export type AutomationChannelBinding = { channel: (typeof AUTOMATION_CHANNELS)[number]; enabledSessionIds: string[] };

const bad = (message: string): never => {
  throw badRequest(message);
};
const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export const ADVANCED_AUTOMATION_NAME_MAX = 120;
export const ADVANCED_AUTOMATION_DEDUPE_DAYS_MAX = 365;

export function parseAutomationName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    return bad('name is required');
  if (value.trim().length > ADVANCED_AUTOMATION_NAME_MAX) {
    return bad(
      `name must have at most ${ADVANCED_AUTOMATION_NAME_MAX} characters`
    );
  }
  return value.trim();
}

export function parseAutomationStatus(
  value: unknown
): AdvancedAutomationStatus {
  if (value === 'draft' || value === 'active' || value === 'paused')
    return value;
  return bad('status must be draft, active or paused');
}

export function parseAutomationChannels(
  value: unknown
): AutomationChannelBinding[] {
  if (!Array.isArray(value)) return bad('channels must be an array');
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!isRecord(entry)) return bad('invalid channel entry');
    const channel = entry.channel;
    if (
      typeof channel !== 'string' ||
      !(AUTOMATION_CHANNELS as readonly string[]).includes(channel)
    ) {
      return bad('invalid channel');
    }
    if (seen.has(channel)) return bad(`duplicate channel ${channel}`);
    seen.add(channel);
    const ids = entry.enabledSessionIds;
    if (
      !Array.isArray(ids) ||
      ids.length > 50 ||
      ids.some((i) => typeof i !== 'string' || i.length > 64)
    ) {
      return bad(`enabledSessionIds for ${channel} must be an array of ids`);
    }
    return {
      channel: channel as AutomationChannelBinding['channel'],
      enabledSessionIds: ids as string[],
    };
  });
}

export function parseAutomationTrigger(
  value: unknown
): AdvancedAutomationTrigger {
  if (!isRecord(value)) return bad('trigger is required');
  const kind = value.kind;
  if (kind !== 'new_conversation' && kind !== 'manual')
    return bad('invalid trigger kind');
  const dedupe = value.dedupeDays === undefined ? 0 : value.dedupeDays;
  if (
    typeof dedupe !== 'number' ||
    !Number.isInteger(dedupe) ||
    dedupe < 0 ||
    dedupe > ADVANCED_AUTOMATION_DEDUPE_DAYS_MAX
  ) {
    return bad(
      `dedupeDays must be an integer between 0 and ${ADVANCED_AUTOMATION_DEDUPE_DAYS_MAX}`
    );
  }
  if (value.filter !== undefined && !isRecord(value.filter))
    return bad('trigger.filter must be a condition');
  return {
    kind,
    dedupeDays: dedupe,
    ...(value.filter ? { filter: value.filter as never } : {}),
  };
}

/** Shape-only check (the graph rules live in validateAdvancedAutomation). */
export function parseAutomationGraph(body: Record<string, unknown>): {
  startNodeId: string;
  nodes: AdvancedAutomationNode[];
  edges: AdvancedAutomationEdge[];
} {
  const { nodes, edges, startNodeId } = body;
  if (!Array.isArray(nodes) || !Array.isArray(edges))
    return bad('nodes and edges must be arrays');
  if (nodes.length > ADVANCED_AUTOMATION_LIMITS.nodes)
    return bad(`at most ${ADVANCED_AUTOMATION_LIMITS.nodes} steps`);
  if (edges.length > ADVANCED_AUTOMATION_LIMITS.edges)
    return bad(`at most ${ADVANCED_AUTOMATION_LIMITS.edges} connections`);
  if (nodes.some((n) => !isRecord(n)) || edges.some((e) => !isRecord(e)))
    return bad('invalid step or connection');
  if (typeof startNodeId !== 'string' || startNodeId.length > 40)
    return bad('startNodeId must be a step id');
  return {
    startNodeId,
    nodes: nodes as AdvancedAutomationNode[],
    edges: edges as AdvancedAutomationEdge[],
  };
}

export type ParsedAutomationCreate = {
  name: string;
  status: AdvancedAutomationStatus;
  channels: AutomationChannelBinding[];
  trigger: AdvancedAutomationTrigger;
  stopOnHumanReply: boolean;
  startNodeId: string;
  nodes: AdvancedAutomationNode[];
  edges: AdvancedAutomationEdge[];
};

export function parseAutomationCreate(body: unknown): ParsedAutomationCreate {
  if (!isRecord(body)) return bad('invalid body');
  return {
    name: parseAutomationName(body.name),
    status:
      body.status === undefined ? 'draft' : parseAutomationStatus(body.status),
    channels:
      body.channels === undefined ? [] : parseAutomationChannels(body.channels),
    trigger:
      body.trigger === undefined
        ? { kind: 'new_conversation', dedupeDays: 0 }
        : parseAutomationTrigger(body.trigger),
    stopOnHumanReply:
      body.stopOnHumanReply === undefined
        ? true
        : body.stopOnHumanReply === true,
    ...(body.nodes === undefined
      ? { startNodeId: '', nodes: [], edges: [] }
      : parseAutomationGraph(body)),
  };
}

export type ParsedAutomationPatch = Partial<ParsedAutomationCreate> & {
  expectedUpdatedAt?: string;
};

/** Whitelisted keys only; anything else in the body is ignored. */
export function parseAutomationPatch(body: unknown): ParsedAutomationPatch {
  if (!isRecord(body)) return bad('invalid body');
  const out: ParsedAutomationPatch = {};
  if (body.name !== undefined) out.name = parseAutomationName(body.name);
  if (body.status !== undefined)
    out.status = parseAutomationStatus(body.status);
  if (body.channels !== undefined)
    out.channels = parseAutomationChannels(body.channels);
  if (body.trigger !== undefined)
    out.trigger = parseAutomationTrigger(body.trigger);
  if (body.stopOnHumanReply !== undefined)
    out.stopOnHumanReply = body.stopOnHumanReply === true;
  if (
    body.nodes !== undefined ||
    body.edges !== undefined ||
    body.startNodeId !== undefined
  ) {
    Object.assign(out, parseAutomationGraph(body));
  }
  if (body.expectedUpdatedAt !== undefined) {
    if (
      typeof body.expectedUpdatedAt !== 'string' ||
      Number.isNaN(Date.parse(body.expectedUpdatedAt))
    ) {
      return bad('expectedUpdatedAt must be an ISO date');
    }
    out.expectedUpdatedAt = body.expectedUpdatedAt;
  }
  if (Object.keys(out).length === 0) return bad('nothing to update');
  return out;
}
