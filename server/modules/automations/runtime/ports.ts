import 'server-only';
import type { EngineEffect } from '../lib/advancedAutomationEngine';
import type { BusinessHours } from '../lib/conditions';
import type { AdvancedAutomationChannel, AdvancedAutomationDefinition, AdvancedAutomationNode, AdvancedAutomationRunState } from '../types';

/**
 * What a run is attached to. A conversation: its workspace, channel and JSYNQ conversation id. A lead without a
 * conversation (CRM, time and webhook triggers): channel `card` and `conversationId` = `<projectId>:<cardId>`.
 */
export type RunChannel = AdvancedAutomationChannel | 'card';
export type ConversationKey = { workspaceId: string; channel: RunChannel; conversationId: string };

/** A JSYNQ card (lead/deal) by project. */
export type CardRef = { projectId: string; cardId: string };

export const cardRunKey = (workspaceId: string, card: CardRef): ConversationKey => ({
  workspaceId,
  channel: 'card',
  conversationId: `${card.projectId}:${card.cardId}`,
});

/** The card of a `card` run key, else null. */
export function cardOfKey(key: Pick<ConversationKey, 'channel' | 'conversationId'>): CardRef | null {
  if (key.channel !== 'card') return null;
  const [projectId, cardId] = key.conversationId.split(':');
  return projectId && cardId ? { projectId, cardId } : null;
}

/** A conversation key (not a lead-only run). */
export const isConversationKey = (key: ConversationKey): key is ConversationKey & { channel: AdvancedAutomationChannel } => key.channel !== 'card';

export type StoredRun = AdvancedAutomationRunState & {
  /** Bumped on every committed change; the compare-and-set token. */
  rev: number;
  /** Last event handled, so a redelivered event is a no-op. */
  lastEventId?: string;
};

/** What the runtime knows about a conversation: our run state (the conversation itself lives in JSYNQ). */
export type AutomationConversation = ConversationKey & {
  sessionId: string;
  run?: StoredRun;
  /** Automations started on this conversation, newest last (dedupe window, start rate limit). */
  history: Array<{ automationId: string; at: Date }>;
};

/** Persistence of run state (this service's `advanced_automation_runs` collection). */
export interface AutomationRunStore {
  find(key: ConversationKey): Promise<AutomationConversation | null>;
  /** Creates the row for a conversation seen for the first time (no-op when it exists). */
  ensure(key: ConversationKey, sessionId: string): Promise<void>;
  /** Start a run only if none is in flight (compare-and-set). False when someone else started one. */
  claimStart(key: ConversationKey, run: AdvancedAutomationRunState, history: { automationId: string; at: Date }): Promise<boolean>;
  /** Replace the run only if `rev` still matches. False on conflict. */
  commit(key: ConversationKey, expectedRev: number, run: AdvancedAutomationRunState, lastEventId?: string): Promise<boolean>;
  /** Records the card a run created (later steps act on it). No-op when the run is no longer `runId`. */
  setRunCard(key: ConversationKey, runId: string, card: CardRef & { createdByRun?: boolean }): Promise<void>;
  /** Conversations whose wake-up is due, oldest first. */
  findDue(now: Date, limit: number): Promise<ConversationKey[]>;
}

/** Lead/contact data for message variables and CRM effects. */
export type ConversationContext = {
  contactName?: string;
  contactPhone?: string;
  linkedCardId?: string;
  /** The conversation's linked card (or the run's lead for a `card` key), with its project. */
  card?: CardRef;
  /** Flat template variables: `lead.name`, `lead.phone`, `contact.email`, card custom fields... */
  vars: Record<string, string>;
};

export type HandoffAssign = {
  assignMode?: Extract<AdvancedAutomationNode, { kind: 'handoff' }>['assignMode'];
  userIds?: string[];
  specificUserId?: string;
  workspaceRoleId?: string;
};

/**
 * Per-step `Idempotency-Key` (`runId:nodeId:eventId`): a retry of the same step is a replay, a new step is new.
 * `card`: the card the run acts on when it is not the conversation's linked one (created by the run, or the
 * trigger's lead); only the runtime sets it, from the run state.
 */
export type ActionOpts = { idempotencyKey: string; card?: CardRef & { createdByRun?: boolean } };

export type CreateCardInput = {
  projectId: string;
  boardId?: string;
  columnId: string;
  title: string;
  fields: Array<{ fieldId: string; value: string }>;
  ownerUserId?: string;
  linkConversation: boolean;
};

/**
 * Everything the runtime does in JSYNQ. The phase-4 worker implements it on JSYNQ's existing user
 * routes (send message, card move, labels, assign) with a server-minted owner token; tests use a
 * fake. Every method may throw; the runtime and the executor contain failures.
 *
 * There is no remote condition evaluation or answer extraction: JSYNQ does not offer them, so
 * conditions that need JSYNQ data or a model do not match and the AI step is "not understood".
 */
export interface ConversationGateway {
  context(key: ConversationKey): Promise<ConversationContext>;
  humanRepliedSince(key: ConversationKey, since: Date): Promise<boolean>;
  sendText(key: ConversationKey, text: string, opts: { idempotencyKey: string }): Promise<{ ok: boolean; error?: string }>;
  sendTemplate(key: ConversationKey, templateId: string, opts: { idempotencyKey: string }): Promise<{ ok: boolean; error?: string }>;
  /** Moves the conversation's card (JSYNQ finds or creates it on WhatsApp). Body is `{columnId, boardId?}` only. */
  moveCard(key: ConversationKey, input: { columnId: string; boardId?: string }, opts: ActionOpts): Promise<{ ok: boolean; error?: string }>;
  addLabel(key: ConversationKey, cardId: string, text: string, color: string | undefined, opts: ActionOpts): Promise<void>;
  setCardField(key: ConversationKey, cardId: string, fieldId: string, value: string, opts: ActionOpts): Promise<void>;
  /** `assign.assignMode` is always set: JSYNQ distributes only when it is present. */
  handoff(key: ConversationKey, assign: HandoffAssign & { assignMode: NonNullable<HandoffAssign['assignMode']> }, reason: string, opts: ActionOpts): Promise<void>;
  /**
   * Hands this one conversation to a JSYNQ agent: a conversation-level automation binding (`targetType:
   * 'conversation'`) the gateway records so it can remove it later. Optional: a gateway without it refuses AI handoffs.
   */
  handoffToAi?(key: ConversationKey, agentId: string, opts: ActionOpts): Promise<void>;
  /** Removes the conversation binding a previous AI handoff created (an automation takes the conversation back). */
  releaseAi?(key: ConversationKey): Promise<void>;
  businessHours(workspaceId: string): Promise<BusinessHours | null>;

  // --- lead / deal, record and conversation actions (optional: a gateway without one logs `<action>_unavailable`) ---
  /** Creates a lead/deal and, when asked and the conversation has no card, links the conversation to it. */
  createCard?(key: ConversationKey, input: CreateCardInput, opts: ActionOpts): Promise<CardRef>;
  duplicateCard?(key: ConversationKey, card: CardRef, columnId: string | undefined, opts: ActionOpts): Promise<CardRef>;
  /** Deletes the run's card: only the conversation's linked card or one this run created (checked again here). */
  deleteCard?(key: ConversationKey, card: CardRef, opts: ActionOpts): Promise<void>;
  moveCardToBoard?(key: ConversationKey, card: CardRef, columnId: string, opts: ActionOpts): Promise<void>;
  /** Writes field values (standard `card:title` / `card:owner`, JSYNQ CRM fields, custom fields). */
  updateCardFields?(key: ConversationKey, card: CardRef, fields: Array<{ fieldId: string; value: string }>, opts: ActionOpts): Promise<void>;
  removeLabel?(key: ConversationKey, card: CardRef, text: string, opts: ActionOpts): Promise<void>;
  addComment?(key: ConversationKey, card: CardRef, text: string, opts: ActionOpts): Promise<void>;
  addChecklistItem?(key: ConversationKey, card: CardRef, title: string, opts: ActionOpts): Promise<void>;
  setChecklistItem?(key: ConversationKey, card: CardRef, title: string, checked: boolean, opts: ActionOpts): Promise<void>;
  markRead?(key: ConversationKey, opts: ActionOpts): Promise<void>;
  /** Assigns the conversation to a member without changing its state (an AI on it keeps answering). */
  assignConversation?(key: ConversationKey, userId: string, opts: ActionOpts): Promise<void>;
}

export type AutomationExecutionContext = {
  key: ConversationKey;
  conversation: AutomationConversation;
  automation: Pick<AdvancedAutomationDefinition, 'name'> & { id: string; createdBy: string };
  runId: string;
  /** The event that triggered this advance, if any (used for idempotent sends). */
  eventId?: string;
  /** The run's own card (created by it, or the trigger's lead); else the conversation's linked card is used. */
  runCard?: CardRef & { createdByRun?: boolean };
  /** The contact's latest answer (`{{answer}}`). */
  lastAnswer?: string;
  /** The run's own variables (`{{webhook.*}}` from a webhook trigger, saved answers). */
  runVars?: Record<string, string>;
};

export type EffectExecutionResult = {
  /** The step whose message could not be delivered (the run takes its send_failed exit). */
  sendFailedNodeId?: string;
  /** An automation the run asked to enter (go-to-automation). */
  enterAutomationId?: string;
  /** A card the run created: later steps act on it. */
  createdCard?: CardRef;
};

/** Carries out effects. Must never throw for one bad effect. */
export interface AutomationEffectExecutor {
  execute(ctx: AutomationExecutionContext, effects: EngineEffect[]): Promise<EffectExecutionResult>;
}
