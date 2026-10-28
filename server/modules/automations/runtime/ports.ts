import 'server-only';
import type { EngineEffect } from '../lib/advancedAutomationEngine';
import type { BusinessHours } from '../lib/conditions';
import type { AdvancedAutomationChannel, AdvancedAutomationDefinition, AdvancedAutomationNode, AdvancedAutomationRunState } from '../types';

/** A conversation is identified by its workspace, channel and JSYNQ conversation id. */
export type ConversationKey = { workspaceId: string; channel: AdvancedAutomationChannel; conversationId: string };

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
  /** Conversations whose wake-up is due, oldest first. */
  findDue(now: Date, limit: number): Promise<ConversationKey[]>;
}

/** Lead/contact data for message variables and CRM effects. */
export type ConversationContext = {
  contactName?: string;
  contactPhone?: string;
  linkedCardId?: string;
  /** Flat template variables: `lead.name`, `lead.phone`, `contact.email`, card custom fields... */
  vars: Record<string, string>;
};

export type HandoffAssign = {
  assignMode?: Extract<AdvancedAutomationNode, { kind: 'handoff' }>['assignMode'];
  userIds?: string[];
  specificUserId?: string;
  workspaceRoleId?: string;
};

/** Per-step `Idempotency-Key` (`runId:nodeId:eventId`): a retry of the same step is a replay, a new step is new. */
export type ActionOpts = { idempotencyKey: string };

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
}

export type AutomationExecutionContext = {
  key: ConversationKey;
  conversation: AutomationConversation;
  automation: Pick<AdvancedAutomationDefinition, 'name'> & { id: string; createdBy: string };
  runId: string;
  /** The event that triggered this advance, if any (used for idempotent sends). */
  eventId?: string;
};

export type EffectExecutionResult = {
  /** The step whose message could not be delivered (the run takes its send_failed exit). */
  sendFailedNodeId?: string;
  /** An automation the run asked to enter (go-to-automation). */
  enterAutomationId?: string;
};

/** Carries out effects. Must never throw for one bad effect. */
export interface AutomationEffectExecutor {
  execute(ctx: AutomationExecutionContext, effects: EngineEffect[]): Promise<EffectExecutionResult>;
}
