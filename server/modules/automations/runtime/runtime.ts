import 'server-only';
import { advanceAutomationRun, newRunState, type EngineEffect, type EngineEvent } from '../lib/advancedAutomationEngine';
import { LOCAL_CONDITION_TYPES, evaluateLocalCondition, isWithinBusinessHours, splitBucket, type AutomationCondition } from '../lib/conditions';
import { ADVANCED_AUTOMATION_LIMITS, type AdvancedAutomationChannel, type AdvancedAutomationDefinition, type AdvancedAutomationRunState, type AdvancedAutomationTriggerKind } from '../types';
import { cardRunKey, type AutomationConversation, type AutomationEffectExecutor, type AutomationRunStore, type CardRef, type ConversationGateway, type ConversationKey } from './ports';
import { echoOfEvent, leadKeyOf, needsCardData, RUNS_PER_MINUTE, triggerMatches, type TriggerEvent, type TriggerGuards } from './triggers';

export type RuntimeAutomation = Pick<AdvancedAutomationDefinition, 'name' | 'status' | 'trigger' | 'stopOnHumanReply' | 'startNodeId' | 'nodes' | 'edges'> & {
  id: string;
  version: number;
  createdBy: string;
  /** Channels and sessions it runs on (trigger runs on conversations check them). */
  channels?: AdvancedAutomationDefinition['channels'];
};

/** What a lead's card looks like for trigger filters (board, stage, label names). */
export type CardFacts = { boardId?: string | null; columnId?: string | null; labels?: string[] };

export type RuntimeDeps = {
  store: AutomationRunStore;
  gateway: ConversationGateway;
  executor: AutomationEffectExecutor;
  loadAutomation: (workspaceId: string, automationId: string) => Promise<RuntimeAutomation | null>;
  /** Active automations with a `new_conversation` trigger that run on this session. */
  findEligibleAutomations: (workspaceId: string, channel: AdvancedAutomationChannel, sessionId: string) => Promise<RuntimeAutomation[]>;
  recordStats: (p: { workspaceId: string; automationId: string; effects: EngineEffect[]; at: Date }) => void;
  /** Active automations whose trigger is one of `kinds` (CRM, time, webhook and the other conversation triggers). */
  findTriggerAutomations?: (workspaceId: string, kinds: AdvancedAutomationTriggerKind[]) => Promise<RuntimeAutomation[]>;
  /** Dedupe, once per lead, per-minute caps and the anti-loop markers. */
  guards?: TriggerGuards;
  /** The newest conversation of a lead on one of these sessions, so a lead trigger can message the contact. */
  findCardConversation?: (workspaceId: string, card: CardRef, sessions: Array<{ channel: AdvancedAutomationChannel; sessionId: string }>) => Promise<{ channel: AdvancedAutomationChannel; sessionId: string; conversationId: string } | null>;
  /** Runs one automation may start per minute (default `TRIGGER_LIMITS.runsPerMinute`). */
  runsPerMinute?: number;
  /** The lead's board, stage and label names, for filters the event does not carry. */
  cardFacts?: (workspaceId: string, card: CardRef) => Promise<CardFacts | null>;
  now: () => Date;
  newId: () => string;
  log: (event: string, data?: Record<string, unknown>) => void;
};

/** One inbound message, as the phase-4 worker reads it from the JSYNQ websocket. */
export type InboundMessage = ConversationKey & {
  channel: AdvancedAutomationChannel;
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
    const automations = (await this.deps.findEligibleAutomations(conv.workspaceId, msg.channel, conv.sessionId || msg.sessionId)).filter(
      (a) => a.trigger.kind === 'new_conversation'
    );
    if (automations.length === 0) return { handled: false };
    return { handled: await this.tryStartForNewConversation(conv, automations, msg) };
  }

  /**
   * A trigger event (conversation, CRM, time or webhook). For every active automation with that trigger: the trigger's
   * settings and filters must match, then the protections apply in order (event dedupe, anti-loop, once per lead, the
   * per-minute cap, the conversation's own start limits) and the run starts on the conversation, or on the lead alone
   * when it has no conversation on the automation's channels. Shared by the worker and the webhook route.
   */
  async onTriggerEvent(event: TriggerEvent): Promise<{ started: string[]; skipped: Record<string, string> }> {
    const out = { started: [] as string[], skipped: {} as Record<string, string> };
    const find = this.deps.findTriggerAutomations;
    const guards = this.deps.guards;
    if (!find || !guards) return out;
    const now = this.deps.now();
    let automations = await find(event.workspaceId, [event.kind]);
    if (event.automationId) automations = automations.filter((a) => a.id === event.automationId);
    if (!automations.length) return out;
    const businessHours = event.kind === 'any_message' ? await this.deps.gateway.businessHours(event.workspaceId).catch(() => null) : null;
    let facts: CardFacts | null | undefined;
    for (const automation of automations) {
      const skip = (reason: string) => {
        out.skipped[automation.id] = reason;
        // Not matching is the normal case: only the protections are worth a log line.
        if (reason === 'no_match' || reason === 'session_not_enabled') return;
        this.deps.log('advanced_automation.trigger_skipped', { workspaceId: event.workspaceId, automationId: automation.id, kind: event.kind, eventId: event.eventId, reason });
      };
      // A conversation event only counts on the channels and sessions the automation runs on.
      if (event.conversation && !runsOnSession(automation, event.conversation.channel, event.conversation.sessionId)) {
        skip('session_not_enabled');
        continue;
      }
      let subject = event;
      if (event.card && needsCardData(automation.trigger) && this.deps.cardFacts) {
        facts ??= await this.deps.cardFacts(event.workspaceId, event.card).catch(() => null);
        if (facts) subject = { ...event, card: { ...event.card, boardId: event.card.boardId ?? facts.boardId, columnId: event.card.columnId ?? facts.columnId, labels: event.card.labels ?? facts.labels } };
      }
      if (!triggerMatches(automation.trigger, subject, { at: now, businessHours })) {
        skip('no_match');
        continue;
      }
      if (await anyEcho(guards, event, automation.id)) {
        skip('own_change');
        continue;
      }
      if (!(await guards.claimEvent(event.workspaceId, automation.id, event.eventId, now))) {
        skip('duplicate_event');
        continue;
      }
      const leadKey = automation.trigger.oncePerLead ? leadKeyOf(event) : null;
      if (leadKey && !(await guards.claimLead(event.workspaceId, automation.id, leadKey, now))) {
        skip('once_per_lead');
        continue;
      }
      if (!(await guards.takeSlot(`runs:${automation.id}`, this.deps.runsPerMinute ?? RUNS_PER_MINUTE, now))) {
        // Over the per-minute cap: nothing started, so the event may come back (a time trigger re-reads it).
        if (leadKey) await guards.releaseLead(automation.id, leadKey).catch(() => undefined);
        await guards.releaseEvent(automation.id, event.eventId).catch(() => undefined);
        skip('run_cap');
        continue;
      }
      const result = await this.startFromTrigger(automation, subject).catch((error) => {
        this.deps.log('advanced_automation.trigger_start_failed', { workspaceId: event.workspaceId, automationId: automation.id, error: (error as Error)?.message });
        return { started: false, reason: 'error' };
      });
      if (result.started) out.started.push(automation.id);
      else {
        if (leadKey) await guards.releaseLead(automation.id, leadKey).catch(() => undefined);
        // Not started for a reason that may pass (a run in flight, a transient error): the event may be retried.
        if (result.reason === 'already_running' || result.reason === 'error') await guards.releaseEvent(automation.id, event.eventId).catch(() => undefined);
        skip(result.reason ?? 'not_started');
      }
    }
    return out;
  }

  /** The run of a trigger: on its conversation, or the lead's conversation on the automation's sessions, or the lead alone. */
  private async startFromTrigger(automation: RuntimeAutomation, event: TriggerEvent): Promise<{ started: boolean; reason?: string }> {
    let conversation = event.conversation;
    if (!conversation && event.card && this.deps.findCardConversation) {
      const sessions = (automation.channels ?? []).flatMap((c) => c.enabledSessionIds.map((sessionId) => ({ channel: c.channel, sessionId })));
      if (sessions.length) conversation = (await this.deps.findCardConversation(event.workspaceId, event.card, sessions).catch(() => null)) ?? undefined;
    }
    const key: ConversationKey = conversation
      ? { workspaceId: event.workspaceId, channel: conversation.channel, conversationId: conversation.conversationId }
      : event.card
        ? cardRunKey(event.workspaceId, event.card)
        : (null as never);
    if (!conversation && !event.card) return { started: false, reason: 'no_subject' };
    await this.deps.store.ensure(key, conversation?.sessionId ?? '');
    const conv = await this.deps.store.find(key);
    if (!conv) return { started: false, reason: 'conversation_not_found' };
    return this.startOn(conv, automation, automation.trigger.kind !== 'new_conversation', 0, `trigger:${event.eventId}`.slice(0, 200), {
      origin: { kind: `trigger:${event.kind}`, eventId: event.eventId },
      ...(event.card ? { card: { projectId: event.card.projectId, cardId: event.card.cardId } } : {}),
      // Stored without dots (Mongo field names): `webhook.name` -> `webhook__name`; the executor maps them back.
      ...(event.vars ? { vars: Object.fromEntries(Object.entries(event.vars).map(([k, v]) => [k.replace(/\./g, '__'), v])) } : {}),
    });
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

  private async startOn(
    conv: AutomationConversation,
    automation: RuntimeAutomation,
    ignoreDedupe: boolean,
    depth: number,
    eventId?: string,
    seed: Pick<AdvancedAutomationRunState, 'origin' | 'card'> & { vars?: Record<string, string> } = {}
  ): Promise<{ started: boolean; reason?: string }> {
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
    const run: AdvancedAutomationRunState = {
      ...newRunState({ automationId: automation.id, runId: this.deps.newId(), automationVersion: automation.version, now }),
      origin: seed.origin ?? { kind: depth > 0 ? 'goto' : eventId ? 'trigger:new_conversation' : 'manual', ...(eventId ? { eventId } : {}) },
      ...(seed.card ? { card: seed.card } : {}),
      ...(seed.vars ? { vars: { ...seed.vars } } : {}),
    };
    const claimed = await this.deps.store.claimStart(keyOf(conv), run, { automationId: automation.id, at: now });
    if (!claimed) return { started: false, reason: 'already_running' };
    this.log('advanced_automation.started', conv, { automationId: automation.id, runId: run.runId });
    // The automation takes the conversation back from an AI it handed it to earlier.
    if (this.deps.gateway.releaseAi) {
      await this.deps.gateway.releaseAi(keyOf(conv)).catch((error) => this.log('advanced_automation.ai_release_failed', conv, { error: (error as Error)?.message }));
    }
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
        {
          key: keyOf(conv),
          conversation: conv,
          automation: { id: automation.id, name: automation.name, createdBy: automation.createdBy },
          runId: state.runId,
          eventId,
          ...(state.card ? { runCard: state.card } : {}),
          ...(state.lastAnswer !== undefined ? { lastAnswer: state.lastAnswer } : {}),
          ...(Object.keys(state.vars ?? {}).length ? { runVars: state.vars } : {}),
        },
        effects
      );
    } catch (error) {
      this.log('advanced_automation.executor_error', conv, { error: (error as Error)?.message }, eventId);
      return;
    }
    if (outcome.createdCard) {
      // Later steps (after a wait or a reply) act on the card this run created.
      await this.deps.store
        .setRunCard(keyOf(conv), state.runId, { ...outcome.createdCard, createdByRun: true })
        .catch((error) => this.log('advanced_automation.run_card_failed', conv, { error: (error as Error)?.message }));
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

function runsOnSession(automation: RuntimeAutomation, channel: AdvancedAutomationChannel, sessionId: string): boolean {
  if (!automation.channels) return true;
  return automation.channels.some((c) => c.channel === channel && c.enabledSessionIds.map((s) => s.toLowerCase()).includes(sessionId.toLowerCase()));
}

async function anyEcho(guards: TriggerGuards, event: TriggerEvent, automationId: string): Promise<boolean> {
  for (const change of echoOfEvent(event)) if (await guards.isEcho(event.workspaceId, change, automationId, event.at)) return true;
  return false;
}

const sameWait = (a: AdvancedAutomationRunState, b: AdvancedAutomationRunState) =>
  a.status === b.status && a.nodeId === b.nodeId && JSON.stringify(a.wait) === JSON.stringify(b.wait) && a.lastAnswer === b.lastAnswer;
