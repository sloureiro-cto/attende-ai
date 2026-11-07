import 'server-only';
import { badRequest } from '../../../lib/errors';
import {
  ADVANCED_AUTOMATION_LIMITS,
  TRIGGER_KINDS,
  TRIGGER_LIMITS,
  type AdvancedAutomationChannel,
  type AdvancedAutomationTriggerFilters,
  type AdvancedAutomationTriggerKind,
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

const HEX24 = /^[0-9a-f]{24}$/i;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const optHex = (v: unknown, name: string): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !HEX24.test(v)) return bad(`trigger.${name} must be an id`);
  return v;
};
const optText = (v: unknown, name: string, max: number): string | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string' || v.length > max) return bad(`trigger.${name} must be a text of at most ${max} characters`);
  return v.trim() || undefined;
};

function parseTriggerFilters(value: unknown): AdvancedAutomationTriggerFilters | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return bad('trigger.filters must be an object');
  const out: AdvancedAutomationTriggerFilters = {};
  if (value.channels !== undefined) {
    if (!Array.isArray(value.channels) || value.channels.some((c) => !(AUTOMATION_CHANNELS as readonly unknown[]).includes(c))) return bad('trigger.filters.channels is invalid');
    if (value.channels.length) out.channels = [...new Set(value.channels as AdvancedAutomationChannel[])];
  }
  const projectId = optHex(value.projectId, 'filters.projectId');
  const boardId = optHex(value.boardId, 'filters.boardId');
  if (projectId) out.projectId = projectId;
  if (boardId) out.boardId = boardId;
  if (value.columnIds !== undefined) {
    if (!Array.isArray(value.columnIds) || value.columnIds.length > 50 || value.columnIds.some((c) => typeof c !== 'string' || !HEX24.test(c))) return bad('trigger.filters.columnIds must be stage ids');
    if (value.columnIds.length) out.columnIds = value.columnIds as string[];
  }
  if (value.labels !== undefined) {
    if (!Array.isArray(value.labels) || value.labels.length > 20 || value.labels.some((l) => typeof l !== 'string' || l.length > ADVANCED_AUTOMATION_LIMITS.labelChars)) return bad('trigger.filters.labels must be label names');
    const labels = (value.labels as string[]).map((l) => l.trim()).filter(Boolean);
    if (labels.length) out.labels = labels;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Trigger of an automation. Old saved shapes (`{kind: 'new_conversation' | 'manual', dedupeDays, filter?}`) parse to
 * themselves; every newer field is optional, and what a kind does not use is dropped.
 */
export function parseAutomationTrigger(
  value: unknown
): AdvancedAutomationTrigger {
  if (!isRecord(value)) return bad('trigger is required');
  const kind = value.kind;
  if (typeof kind !== 'string' || !(TRIGGER_KINDS as readonly string[]).includes(kind))
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
  const out: AdvancedAutomationTrigger = {
    kind: kind as AdvancedAutomationTriggerKind,
    dedupeDays: dedupe,
    ...(value.filter ? { filter: value.filter as never } : {}),
  };
  const filters = parseTriggerFilters(value.filters);
  if (filters) out.filters = filters;
  if (value.oncePerLead === true) out.oncePerLead = true;

  switch (kind as AdvancedAutomationTriggerKind) {
    case 'keyword': {
      const raw = value.keywords ?? [];
      if (!Array.isArray(raw) || raw.length > TRIGGER_LIMITS.keywords || raw.some((k) => typeof k !== 'string' || k.length > TRIGGER_LIMITS.keywordChars)) {
        return bad(`trigger.keywords: at most ${TRIGGER_LIMITS.keywords} words of ${TRIGGER_LIMITS.keywordChars} characters`);
      }
      out.keywords = (raw as string[]).map((k) => k.trim()).filter(Boolean);
      break;
    }
    case 'any_message':
      if (value.outsideBusinessHoursOnly === true) out.outsideBusinessHoursOnly = true;
      break;
    case 'contact_no_reply':
    case 'team_no_reply': {
      const m = value.minutes;
      if (m !== undefined && (typeof m !== 'number' || !Number.isInteger(m) || m < TRIGGER_LIMITS.silenceMinutesMin || m > TRIGGER_LIMITS.silenceMinutesMax)) {
        return bad(`trigger.minutes must be between ${TRIGGER_LIMITS.silenceMinutesMin} and ${TRIGGER_LIMITS.silenceMinutesMax}`);
      }
      if (m !== undefined) out.minutes = m as number;
      break;
    }
    case 'conversation_assigned': {
      const userId = optHex(value.userId, 'userId');
      if (userId) out.userId = userId;
      break;
    }
    default:
      break;
  }
  if (kind.startsWith('card_') || kind === 'scheduled' || kind === 'date_field' || kind === 'webhook') {
    const projectId = optHex(value.projectId, 'projectId');
    const boardId = optHex(value.boardId, 'boardId');
    const columnId = optHex(value.columnId, 'columnId');
    if (projectId) out.projectId = projectId;
    if (boardId) out.boardId = boardId;
    if (columnId) out.columnId = columnId;
  }
  if (kind === 'card_label_added') {
    const labelText = optText(value.labelText, 'labelText', ADVANCED_AUTOMATION_LIMITS.labelChars);
    if (labelText) out.labelText = labelText;
  }
  if (kind === 'scheduled' && value.schedule !== undefined) {
    const s = value.schedule;
    if (!isRecord(s) || (s.frequency !== 'daily' && s.frequency !== 'weekly') || typeof s.time !== 'string' || !HHMM.test(s.time)) {
      return bad('trigger.schedule needs a frequency (daily / weekly) and a time HH:MM');
    }
    const weekdays = s.weekdays === undefined ? [] : s.weekdays;
    if (!Array.isArray(weekdays) || weekdays.some((d) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6)) return bad('trigger.schedule.weekdays must be 0-6');
    out.schedule = { frequency: s.frequency, time: s.time, ...(weekdays.length ? { weekdays: [...new Set(weekdays as number[])].sort() } : {}) };
  }
  if (kind === 'date_field' && value.dateField !== undefined) {
    const d = value.dateField;
    if (!isRecord(d) || typeof d.fieldId !== 'string' || d.fieldId.length > 80 || !Number.isInteger(d.offsetDays) || Math.abs(d.offsetDays as number) > 365 || typeof d.time !== 'string' || !HHMM.test(d.time)) {
      return bad('trigger.dateField needs a field, offsetDays between -365 and 365 and a time HH:MM');
    }
    out.dateField = { fieldId: d.fieldId, offsetDays: d.offsetDays as number, time: d.time };
  }
  return out;
}

/** What a trigger still needs before the automation can go active (same rules as the builder's `triggerIssues`). */
export function triggerCompletenessIssues(trigger: AdvancedAutomationTrigger): string[] {
  const out: string[] = [];
  switch (trigger.kind) {
    case 'keyword':
      if (!trigger.keywords?.length) out.push('add at least one keyword');
      break;
    case 'contact_no_reply':
    case 'team_no_reply':
      if (!trigger.minutes) out.push('choose how long the silence lasts');
      break;
    case 'card_created':
    case 'card_won':
    case 'card_lost':
      if (!trigger.projectId || !trigger.boardId) out.push('choose the board');
      break;
    case 'card_stage_changed':
    case 'webhook':
      if (!trigger.projectId || !trigger.columnId) out.push('choose the stage');
      break;
    case 'card_label_added':
      if (!trigger.labelText) out.push('choose the label');
      break;
    case 'scheduled':
      if (!trigger.projectId || !trigger.columnId) out.push('choose the stage');
      if (!trigger.schedule || (trigger.schedule.frequency === 'weekly' && !trigger.schedule.weekdays?.length)) out.push('choose when it runs');
      break;
    case 'date_field':
      if (!trigger.projectId || !trigger.boardId) out.push('choose the board');
      if (!trigger.dateField?.fieldId) out.push('choose the date field');
      break;
    default:
      break;
  }
  return out;
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
