import 'server-only';
import { isWithinBusinessHours, type BusinessHours } from '../lib/conditions';
import { AutomationCounterModel, AutomationEchoModel, AutomationLeadStartModel, AutomationTriggerEventModel } from '../models';
import { TRIGGER_LIMITS, type AdvancedAutomationChannel, type AdvancedAutomationTrigger, type AdvancedAutomationTriggerKind } from '../types';
import type { CardRef } from './ports';

/**
 * Something that may start automations, as the worker (websocket, polls, schedules) or the webhook route sees it.
 * `eventId` is stable for the same occurrence (redeliveries, the socket and the poll seeing the same change), so an
 * automation handles each occurrence once.
 */
export type TriggerEvent = {
  workspaceId: string;
  kind: AdvancedAutomationTriggerKind;
  eventId: string;
  /** The conversation it happened in (conversation triggers; a lead's conversation when known). */
  conversation?: { channel: AdvancedAutomationChannel; sessionId: string; conversationId: string };
  /** The lead it is about (CRM, time and webhook triggers; a conversation's linked card when known). */
  card?: CardRef & {
    boardId?: string | null;
    columnId?: string | null;
    /** Label names of the card, when the event carries them (filters by label). */
    labels?: string[];
  };
  /** `keyword` / `any_message`: the contact's message. */
  text?: string;
  /** `card_label_added`: the names of the labels added. */
  labelsAdded?: string[];
  /** `conversation_assigned`: the member it was assigned to. */
  assignedUserId?: string;
  /** Webhook: values for the run's first steps (`{{webhook.<key>}}`). */
  vars?: Record<string, string>;
  /** Restrict to one automation (schedules and the webhook name theirs). */
  automationId?: string;
  /** When the occurrence happened (a silence: the last message's time). */
  at?: Date;
};

/** Accent- and case-insensitive text for keyword matching. */
export const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** A keyword matches as a whole word or phrase, anywhere in the message. */
export function keywordMatches(text: string, keywords: string[]): boolean {
  const hay = ` ${normalizeText(text).replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ')} `;
  return keywords.some((k) => {
    const needle = normalizeText(k).replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
    return !!needle && hay.includes(` ${needle} `);
  });
}

const lower = (s: string) => s.trim().toLowerCase();

/**
 * Whether one automation's trigger takes this event: its own settings (keyword, stage, label, member...) and the
 * common filters (channel, board/stage, label). Pure: the protections (dedupe, once per lead, caps, loops) come after.
 */
export function triggerMatches(trigger: AdvancedAutomationTrigger, event: TriggerEvent, env: { at: Date; businessHours: BusinessHours | null }): boolean {
  if (trigger.kind !== event.kind) return false;
  switch (trigger.kind) {
    case 'keyword':
      if (!trigger.keywords?.length || !keywordMatches(event.text ?? '', trigger.keywords)) return false;
      break;
    case 'any_message':
      if (trigger.outsideBusinessHoursOnly && (!env.businessHours || isWithinBusinessHours(env.businessHours, env.at))) return false;
      break;
    case 'conversation_assigned':
      if (!event.assignedUserId) return false;
      if (trigger.userId && lower(trigger.userId) !== lower(event.assignedUserId)) return false;
      break;
    case 'card_created':
    case 'card_won':
    case 'card_lost':
    case 'date_field':
    case 'scheduled':
    case 'webhook':
      if (trigger.projectId && event.card && trigger.projectId !== event.card.projectId) return false;
      if (trigger.boardId && event.card?.boardId && trigger.boardId !== event.card.boardId) return false;
      if (trigger.kind === 'scheduled' && trigger.columnId && event.card?.columnId && trigger.columnId !== event.card.columnId) return false;
      break;
    case 'card_stage_changed':
      if (!trigger.columnId || event.card?.columnId !== trigger.columnId) return false;
      if (trigger.projectId && event.card && trigger.projectId !== event.card.projectId) return false;
      break;
    case 'card_label_added':
      if (!trigger.labelText || !(event.labelsAdded ?? []).some((l) => lower(l) === lower(trigger.labelText!))) return false;
      if (trigger.projectId && event.card && trigger.projectId !== event.card.projectId) return false;
      break;
    default:
      break;
  }
  return filtersMatch(trigger, event);
}

/** Common filters. A filter on data the event does not carry (no card, no labels read) does not match. */
export function filtersMatch(trigger: AdvancedAutomationTrigger, event: TriggerEvent): boolean {
  const f = trigger.filters;
  if (!f) return true;
  if (f.channels?.length && (!event.conversation || !f.channels.includes(event.conversation.channel))) return false;
  if (f.projectId && event.card?.projectId !== f.projectId) return false;
  if (f.boardId && (!event.card?.boardId || event.card.boardId !== f.boardId)) return false;
  if (f.columnIds?.length && (!event.card?.columnId || !f.columnIds.includes(event.card.columnId))) return false;
  if (f.labels?.length) {
    const have = new Set((event.card?.labels ?? []).map(lower));
    if (!f.labels.some((l) => have.has(lower(l)))) return false;
  }
  return true;
}

/** Does any filter (or the trigger itself) need the lead's card data (board, stage, labels)? */
export const needsCardData = (trigger: AdvancedAutomationTrigger) =>
  !!(trigger.filters?.projectId || trigger.filters?.boardId || trigger.filters?.columnIds?.length || trigger.filters?.labels?.length);

/** Lead key for "only once per lead": the card, else the conversation. */
export function leadKeyOf(event: TriggerEvent): string | null {
  if (event.card) return `card:${event.card.cardId}`;
  if (event.conversation) return `conv:${event.conversation.channel}:${event.conversation.conversationId}`;
  return null;
}

const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

/** The protections of trigger starts, in this service's Mongo (shared by the worker and the webhook route). */
export type TriggerGuards = {
  /** False when this automation already took this event (dedupe by event id). */
  claimEvent(workspaceId: string, automationId: string, eventId: string, at: Date): Promise<boolean>;
  /** Releases a claimed event that did not start a run (it may be retried). */
  releaseEvent(automationId: string, eventId: string): Promise<void>;
  /** False when the automation already started on this lead ("only once per lead"). */
  claimLead(workspaceId: string, automationId: string, leadKey: string, at: Date): Promise<boolean>;
  releaseLead(automationId: string, leadKey: string): Promise<void>;
  /** False past `limit` starts of this automation in the current minute (shared across instances). */
  takeSlot(scope: string, limit: number, at: Date, windowMs?: number): Promise<boolean>;
  /** True when this change was made by this same automation a moment ago (anti-loop). `at`: when the change happened. */
  isEcho(workspaceId: string, change: string, automationId: string, at?: Date): Promise<boolean>;
  /** Records a change an automation made in JSYNQ (`change`: e.g. `card:<id>:moved:<columnId>`). */
  recordEcho(workspaceId: string, change: string, automationId: string, runId: string, at: Date): Promise<void>;
};

export const mongoTriggerGuards: TriggerGuards = {
  async claimEvent(workspaceId, automationId, eventId, at) {
    try {
      await AutomationTriggerEventModel.create({ _id: `${automationId}:${eventId}`.slice(0, 300), workspaceId, at });
      return true;
    } catch (error) {
      if (isDuplicate(error)) return false;
      throw error;
    }
  },
  async releaseEvent(automationId, eventId) {
    await AutomationTriggerEventModel.deleteOne({ _id: `${automationId}:${eventId}`.slice(0, 300) });
  },
  async claimLead(workspaceId, automationId, leadKey, at) {
    try {
      await AutomationLeadStartModel.create({ _id: `${automationId}:${leadKey}`, workspaceId, at });
      return true;
    } catch (error) {
      if (isDuplicate(error)) return false;
      throw error;
    }
  },
  async releaseLead(automationId, leadKey) {
    await AutomationLeadStartModel.deleteOne({ _id: `${automationId}:${leadKey}` });
  },
  async takeSlot(scope, limit, at, windowMs = 60_000) {
    const bucket = Math.floor(at.getTime() / windowMs);
    const row = await AutomationCounterModel.findOneAndUpdate(
      { _id: `${scope}:${bucket}` },
      { $inc: { n: 1 }, $setOnInsert: { expireAt: new Date((bucket + 2) * windowMs) } },
      { upsert: true, new: true }
    ).lean();
    return (row?.n ?? 1) <= limit;
  },
  async isEcho(workspaceId, change, automationId, at) {
    const row = await AutomationEchoModel.findById(`${workspaceId}:${change}`).lean();
    if (!row || row.automationId !== automationId) return false;
    const markedAt = new Date(row.at).getTime();
    // The automation's own message is the conversation's last one: a silence after it is the automation's echo.
    if (change.endsWith(':sent')) return !!at && markedAt >= at.getTime() - 5_000;
    // "This automation is creating a card in this project": only a short window around the call counts.
    if (change.endsWith(':creating')) return Date.now() - markedAt < CREATING_WINDOW_MS;
    return Date.now() - markedAt < ECHO_WINDOW_MS;
  },
  async recordEcho(workspaceId, change, automationId, runId, at) {
    await AutomationEchoModel.updateOne({ _id: `${workspaceId}:${change}` }, { $set: { workspaceId, automationId, runId, at } }, { upsert: true });
  },
};

/** Change keys shared by the executor (when it acts) and the triggers (when JSYNQ reports the change back). */
/** How long "an automation is creating a card in this project" covers the `card-created` it causes. */
const CREATING_WINDOW_MS = 30_000;
/** How long an automation's own change (move, label, assignment, handoff) counts as its echo. */
const ECHO_WINDOW_MS = 15 * 60_000;

export const ECHO = {
  created: (cardId: string) => `card:${cardId}:created`,
  /**
   * Set before a card is created or copied: JSYNQ broadcasts `card-created` before its HTTP answer gives us the new
   * id, so the exact `created` marker can come too late for that event.
   */
  creating: (projectId: string) => `project:${projectId}:creating`,
  moved: (cardId: string, columnId: string) => `card:${cardId}:moved:${columnId}`,
  label: (cardId: string, label: string) => `card:${cardId}:label:${lower(label)}`,
  assigned: (conversationId: string) => `conv:${conversationId}:assigned`,
  /** The automation that sent the conversation's latest message (silence triggers). */
  sent: (conversationId: string) => `conv:${conversationId}:sent`,
  handoff: (conversationId: string) => `conv:${conversationId}:handoff`,
} as const;

/** The echo a trigger event would be if an automation caused it. */
export function echoOfEvent(event: TriggerEvent): string[] {
  const card = event.card?.cardId;
  switch (event.kind) {
    case 'card_created':
      return card ? [ECHO.created(card), ECHO.creating(event.card!.projectId)] : [];
    case 'card_stage_changed':
    case 'card_won':
    case 'card_lost':
      return card && event.card?.columnId ? [ECHO.moved(card, event.card.columnId)] : [];
    case 'card_label_added':
      return card ? (event.labelsAdded ?? []).map((l) => ECHO.label(card, l)) : [];
    case 'conversation_assigned':
      return event.conversation ? [ECHO.assigned(event.conversation.conversationId)] : [];
    case 'handed_to_human':
      return event.conversation ? [ECHO.handoff(event.conversation.conversationId)] : [];
    case 'contact_no_reply':
      return event.conversation ? [ECHO.sent(event.conversation.conversationId)] : [];
    default:
      return [];
  }
}

export const RUNS_PER_MINUTE = TRIGGER_LIMITS.runsPerMinute;
