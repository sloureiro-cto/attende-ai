import 'server-only';
import { advanceAutomationRun, newRunState, type EngineEffect, type EngineEvent } from '../lib/advancedAutomationEngine';
import { LOCAL_CONDITION_TYPES, evaluateLocalCondition, isWithinBusinessHours, splitBucket, type AutomationCondition } from '../lib/conditions';
import { ADVANCED_AUTOMATION_LIMITS, type AdvancedAutomationChannel, type AdvancedAutomationDefinition, type AdvancedAutomationRunState } from '../types';
import type { AutomationConversation, AutomationEffectExecutor, AutomationRunStore, ConversationGateway, ConversationKey } from './ports';

export type RuntimeAutomation = Pick<AdvancedAutomationDefinition, 'name' | 'status' | 'trigger' | 'stopOnHumanReply' | 'startNodeId' | 'nodes' | 'edges'> & {
  id: string;
  version: number;
  createdBy: string;
};

export type RuntimeDeps = {
  store: AutomationRunStore;
  gateway: ConversationGateway;
  executor: AutomationEffectExecutor;
  loadAutomation: (workspaceId: string, automationId: string) => Promise<RuntimeAutomation | null>;
  /** Active automations with a `new_conversation` trigger that run on this session. */
  findEligibleAutomations: (workspaceId: string, channel: AdvancedAutomationChannel, sessionId: string) => Promise<RuntimeAutomation[]>;
  recordStats: (p: { workspaceId: string; automationId: string; effects: EngineEffect[]; at: Date }) => void;
  now: () => Date;
  newId: () => string;
  log: (event: string, data?: Record<string, unknown>) => void;
};

/** One inbound message, as JSYNQ forwards it (see docs/jsynq-dependencies.md). */
export type InboundMessage = ConversationKey & {
  sessionId: string;
  /** JSYNQ message id; redeliveries carry the same id. */
  messageId: string;
  /** `""` for media without text. */
  text: string;
  /** Interactive reply id (button/list). JSYNQ never sends it: choices are read from `text`. */
  optionId?: string;
  /** True for the contact's first message in this conversation. */
  firstInbound: boolean;
};

const MAX_CAS_ATTEMPTS = 4;
const MAX_CHAIN_DEPTH = 5;
/** A conversation may (re)start automations at most this often (breaks trigger/goto loops). */
const MAX_STARTS_PER_WINDOW = 6;
const START_WINDOW_MS = 60 * 60_000;
const STUCK_ACTIVE_MS = ADVANCED_AUTOMATION_LIMITS.stuckActiveMs;

const inFlight = (run?: AutomationConversation['run']) => !!run && (run.status === 'active' || run.status === 'waiting');
const keyOf = (c: ConversationKey): ConversationKey => ({ workspaceId: c.workspaceId, channel: c.channel, conversationId: c.conversationId });

const isLocal = (c: AutomationCondition): boolean =>
  LOCAL_CONDITION_TYPES.has(c.type) && (c.type === 'all' || c.type === 'any' ? (c.clauses ?? []).every(isLocal) : true);

type AdvanceOutcome = 'yielded' | undefined;

/**
 * Orchestrates automation runs on conversations (ported from the JSYNQ runtime; state now lives
 * in this service, I/O goes through `ConversationGateway`).
 *
 * Order inside `advance`: compute (pure engine) -> commit state (CAS) -> execute effects. Effects
 * run only after the new state is committed, so a retried event never sends twice (a crash in
 * between drops that one message instead). Redelivered events are ignored via `lastEventId`.
 */
export class AutomationRuntime {
  constructor(private readonly deps: RuntimeDeps) {}

  /** An inbound message. `handled` = an automation owns it, so JSYNQ rules/AI must not also answer. */
  async onInboundMessage(msg: InboundMessage): Promise<{ handled: boolean }> {
    const key = keyOf(msg);
    let conv = await this.deps.store.find(key);
    if (!conv) {
      // Cheapest check first: most sessions have no automation, so do not even create a row.
      const automations = (await this.deps.findEligibleAutomations(msg.workspaceId, msg.channel, msg.sessionId)).filter((a) => a.trigger.kind === 'new_conversation');
      if (automations.length === 0 || !msg.firstInbound) return { handled: false };
      await this.deps.store.ensure(key, msg.sessionId);
      conv = await this.deps.store.find(key);
      if (!conv) return { handled: false };
      return { handled: await this.tryStartForNewConversation(conv, automations, msg) };
    }

    if (conv.run?.lastEventId === msg.messageId) return { handled: true };

    if (conv.run?.status === 'active' && this.deps.now().getTime() - conv.run.updatedAt.getTime() > STUCK_ACTIVE_MS) {
      await this.endRun(conv, 'failed', 'stuck_active');
      return { handled: false };
    }

    if (inFlight(conv.run)) {
      const outcome = await this.advance(conv, { type: 'inbound', text: msg.text, optionId: msg.optionId }, msg.messageId, 0, msg);
      return { handled: outcome !== 'yielded' };
    }

    if (!msg.firstInbound) return { handled: false };
    const automations = (await this.deps.findEligibleAutomations(conv.workspaceId, conv.channel, conv.sessionId || msg.sessionId)).filter(
      (a) => a.trigger.kind === 'new_conversation'
    );
    if (automations.length === 0) return { handled: false };
    return { handled: await this.tryStartForNewConversation(conv, automations, msg) };
  }

  /** Starts a specific automation on a conversation (manual / stage automation). */
  async startAutomation(params: ConversationKey & { sessionId: string; automationId: string; ignoreDedupe?: boolean }): Promise<{ started: boolean; reason?: string }> {
    const key = keyOf(params);
    await this.deps.store.ensure(key, params.sessionId);
    const conv = await this.deps.store.find(key);
    if (!conv) return { started: false, reason: 'conversation_not_found' };
    const automation = await this.deps.loadAutomation(conv.workspaceId, params.automationId);
    if (!automation) return { started: false, reason: 'automation_not_found' };
    if (automation.status !== 'active') return { started: false, reason: 'automation_not_active' };
    return this.startOn(conv, automation, params.ignoreDedupe === true, 0);
  }

  /** A scheduled wake-up (wait elapsed / no-reply timeout / stuck claim). Safe to deliver twice. */
  async handleTimer(key: ConversationKey): Promise<void> {
    const conv = await this.deps.store.find(key);
    if (!conv?.run) return;
    if (conv.run.status === 'active') {
      if (this.deps.now().getTime() - conv.run.updatedAt.getTime() > STUCK_ACTIVE_MS) await this.endRun(conv, 'failed', 'stuck_active');
      return;
    }
    if (conv.run.status !== 'waiting') return;
    await this.advance(conv, { type: 'timer' }, undefined, 0);
  }

  private log(event: string, conv: AutomationConversation, extra: Record<string, unknown> = {}, eventId?: string) {
    this.deps.log(event, {
      workspaceId: conv.workspaceId,
      channel: conv.channel,
      conversationId: conv.conversationId,
      ...(conv.run ? { automationId: conv.run.automationId, runId: conv.run.runId } : {}),
      ...(eventId ? { eventId } : {}),
      ...extra,
    });
  }

  private async tryStartForNewConversation(conv: AutomationConversation, automations: RuntimeAutomation[], msg: InboundMessage): Promise<boolean> {
    const now = this.deps.now();
    for (const automation of automations) {
      if (!automation.trigger.dedupeDays && conv.history.some((h) => h.automationId === automation.id)) continue;
      if (this.withinDedupeWindow(conv, automation, now)) continue;
      if (automation.trigger.filter && !(await this.safeCondition(conv, automation.trigger.filter, msg.text, now, msg.firstInbound))) continue;
      const result = await this.startOn(conv, automation, false, 0, msg.messageId);
      // A lost race means another event just started a run: the conversation is owned either way.
      if (result.started || result.reason === 'already_running') return true;
    }
    return false;
  }

  private withinDedupeWindow(conv: AutomationConversation, automation: RuntimeAutomation, now: Date): boolean {
    const days = automation.trigger.dedupeDays;
    if (!days || days <= 0) return false;
    const cutoff = now.getTime() - days * 86_400_000;
    return conv.history.some((h) => h.automationId === automation.id && h.at.getTime() >= cutoff);
  }

  private async startOn(conv: AutomationConversation, automation: RuntimeAutomation, ignoreDedupe: boolean, depth: number, eventId?: string): Promise<{ started: boolean; reason?: string }> {
    const now = this.deps.now();
    if (depth > MAX_CHAIN_DEPTH) {
      this.log('advanced_automation.chain_depth_exceeded', conv);
      return { started: false, reason: 'chain_depth_exceeded' };
    }
    const recentStarts = conv.history.filter((h) => now.getTime() - h.at.getTime() < START_WINDOW_MS).length;
    if (recentStarts >= MAX_STARTS_PER_WINDOW) {
      this.log('advanced_automation.start_rate_limited', conv, { automationId: automation.id });
      return { started: false, reason: 'start_rate_limited' };
    }
    if (!ignoreDedupe && this.withinDedupeWindow(conv, automation, now)) return { started: false, reason: 'within_dedupe_window' };
    const run = newRunState({ automationId: automation.id, runId: this.deps.newId(), automationVersion: automation.version, now });
    const claimed = await this.deps.store.claimStart(keyOf(conv), run, { automationId: automation.id, at: now });
    if (!claimed) return { started: false, reason: 'already_running' };
    this.log('advanced_automation.started', conv, { automationId: automation.id, runId: run.runId });
    const fresh = await this.deps.store.find(keyOf(conv));
    if (!fresh?.run) return { started: true };
    await this.advance(fresh, { type: 'start' }, eventId, depth);
    return { started: true };
  }

  private async safeHumanReplied(conv: AutomationConversation, since: Date): Promise<boolean> {
    try {
      return await this.deps.gateway.humanRepliedSince(keyOf(conv), since);
    } catch (error) {
      // If we can't tell, keep running: stopping a healthy automation on a lookup error is worse.
      this.log('advanced_automation.human_check_error', conv, { error: (error as Error)?.message });
      return false;
    }
  }

  /**
   * Conditions are evaluated here only. Types that need JSYNQ data or a model (`llm_*`, CRM, ads,
   * dates) have no JSYNQ endpoint: those clauses never match (inside `any`, the other clauses still can).
   */
  private async safeCondition(conv: AutomationConversation, condition: AutomationCondition, text: string, now: Date, firstInbound?: boolean): Promise<boolean> {
    try {
      if (!isLocal(condition)) this.log('advanced_automation.condition_unavailable', conv, { type: condition.type });
      const businessHours = await this.deps.gateway.businessHours(conv.workspaceId);
      return evaluateLocalCondition(condition, { text, at: now, businessHours, firstInbound });
    } catch (error) {
      this.log('advanced_automation.condition_error', conv, { error: (error as Error)?.message });
      return false;
    }
  }

  private async advance(conv: AutomationConversation, event: EngineEvent, eventId: string | undefined, depth: number, inbound?: InboundMessage): Promise<AdvanceOutcome> {
    if (depth > MAX_CHAIN_DEPTH) {
      this.log('advanced_automation.chain_depth_exceeded', conv);
      await this.endRun(conv, 'failed', 'chain_depth_exceeded');
      return;
    }
    let current: AutomationConversation | null = conv;
    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS && current; attempt += 1) {
      const run = current.run;
      if (!run || !inFlight(run)) return;
      if (eventId && run.lastEventId === eventId) return;

      const automation = await this.deps.loadAutomation(current.workspaceId, run.automationId);
      if (!automation) {
        await this.endRun(current, 'failed', 'automation_missing');
        return 'yielded';
      }
      if (automation.status !== 'active') {
        await this.endRun(current, 'stopped', 'automation_not_active');
        return 'yielded';
      }
      if (run.nodeId && run.automationVersion !== automation.version && !automation.nodes.some((n) => n.id === run.nodeId)) {
        await this.endRun(current, 'stopped', 'automation_changed');
        return 'yielded';
      }
      if (automation.stopOnHumanReply && (await this.safeHumanReplied(current, run.startedAt))) {
        await this.endRun(current, 'stopped', 'human_replied');
        return 'yielded';
      }
      const now = this.deps.now();
      const hours = await this.deps.gateway.businessHours(current.workspaceId).catch(() => null);
      const lastText = event.type === 'inbound' ? event.text : (run.lastAnswer ?? '');
      const target = current;

      const result = await advanceAutomationRun({
        automation,
        state: run,
        event,
        ports: {
          now,
          evaluateCondition: (c) => this.safeCondition(target, c, lastText, now, inbound?.firstInbound),
          // No answer extraction exists in JSYNQ: the AI step always takes its "not understood" exit.
          interpretAnswer: async (node) => {
            this.log('advanced_automation.ai_step_unavailable', target, { nodeId: node.id });
            return { understood: false };
          },
          isWithinBusinessHours: (at) => isWithinBusinessHours(hours, at),
          bucket: splitBucket,
        },
      });

      if (result.effects.length === 0 && sameWait(run, result.state)) return;

      const committed = await this.deps.store.commit(keyOf(current), run.rev, result.state, eventId ?? run.lastEventId);
      if (!committed) {
        current = await this.deps.store.find(keyOf(current));
        continue;
      }
      this.deps.recordStats({ workspaceId: current.workspaceId, automationId: automation.id, effects: result.effects, at: now });
      // Timers and starts have no event id: the committed revision identifies this transition.
      await this.runEffects(current, automation, result.state, result.effects, depth, eventId ?? `rev${run.rev + 1}`);
      return;
    }
    this.log('advanced_automation.cas_exhausted', conv, { attempts: MAX_CAS_ATTEMPTS }, eventId);
  }

  private async runEffects(conv: AutomationConversation, automation: RuntimeAutomation, state: AdvancedAutomationRunState, effects: EngineEffect[], depth: number, eventId?: string) {
    let outcome;
    try {
      outcome = await this.deps.executor.execute(
        { key: keyOf(conv), conversation: conv, automation: { id: automation.id, name: automation.name, createdBy: automation.createdBy }, runId: state.runId, eventId },
        effects
      );
    } catch (error) {
      this.log('advanced_automation.executor_error', conv, { error: (error as Error)?.message }, eventId);
      return;
    }
    if (outcome.sendFailedNodeId) {
      const fresh = await this.deps.store.find(keyOf(conv));
      if (fresh) await this.advance(fresh, { type: 'send_failed' }, undefined, depth + 1);
      return;
    }
    if (outcome.enterAutomationId) {
      const target = await this.deps.loadAutomation(conv.workspaceId, outcome.enterAutomationId);
      const fresh = await this.deps.store.find(keyOf(conv));
      if (target && target.status === 'active' && fresh) await this.startOn(fresh, target, true, depth + 1);
    }
  }

  private async endRun(conv: AutomationConversation, status: 'failed' | 'stopped', reason: string) {
    const run = conv.run;
    if (!run) return;
    const now = this.deps.now();
    const ended: AdvancedAutomationRunState = { ...run, status, wait: undefined, updatedAt: now };
    if (await this.deps.store.commit(keyOf(conv), run.rev, ended)) {
      this.deps.recordStats({ workspaceId: conv.workspaceId, automationId: run.automationId, effects: [{ type: 'run_ended', status }], at: now });
      this.log('advanced_automation.ended', conv, { status, reason });
    }
  }
}

const sameWait = (a: AdvancedAutomationRunState, b: AdvancedAutomationRunState) =>
  a.status === b.status && a.nodeId === b.nodeId && JSON.stringify(a.wait) === JSON.stringify(b.wait) && a.lastAnswer === b.lastAnswer;
