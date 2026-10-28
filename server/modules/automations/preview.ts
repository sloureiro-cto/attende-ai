import 'server-only';
import { randomUUID } from 'crypto';
import { badRequest } from '../../lib/errors';
import { advanceAutomationRun, newRunState, type EngineEffect } from './lib/advancedAutomationEngine';
import { planChoiceDelivery, renderChoicesAsText, type ChoiceDelivery } from './lib/advancedAutomationChoices';
import { parseRunState, serializeRunState, type SerializedRunState } from './lib/advancedAutomationRunStateIO';
import { automationRegexIssues } from './lib/automationRegexIssues';
import { LOCAL_CONDITION_TYPES, evaluateLocalCondition, isWithinBusinessHours, splitBucket, type AutomationCondition, type BusinessHours } from './lib/conditions';
import { blockingIssues, validateAdvancedAutomation } from './lib/validateAdvancedAutomation';
import type { AdvancedAutomationChannel, AdvancedAutomationDefinition } from './types';

export type PreviewEvent = { type: 'start' } | { type: 'inbound'; text: string; optionId?: string } | { type: 'timer' };

export type PreviewEffect = EngineEffect & { delivery?: { kind: ChoiceDelivery['kind']; warnings: string[]; text?: string } };

/** A step the preview (and production) cannot run for real: JSYNQ has no endpoint for it. */
export type PreviewUnavailable = { kind: 'condition'; type: string } | { kind: 'ai_step'; nodeId: string };

/**
 * Runs the real engine on an automation (saved or draft) without sending or storing anything; the
 * state travels through the client. Same answers as production for what JSYNQ cannot do: the AI
 * step is "not understood" and conditions that need JSYNQ data or a model (`llm_*`, CRM, ads, dates)
 * do not match. `unavailable` lists the ones this event hit, so the UI can say they are not available.
 */
export async function previewAutomation(params: {
  automation: Pick<AdvancedAutomationDefinition, 'nodes' | 'edges' | 'startNodeId'>;
  automationId: string;
  channel: AdvancedAutomationChannel;
  event: PreviewEvent;
  rawState?: unknown;
  now?: Date;
  whatsappInteractive?: boolean;
  businessHours: BusinessHours | null;
}): Promise<{ state: SerializedRunState; effects: PreviewEffect[]; finished: boolean; unavailable: PreviewUnavailable[] }> {
  const issues = [...blockingIssues(validateAdvancedAutomation(params.automation)), ...automationRegexIssues({ nodes: params.automation.nodes })];
  if (issues.length) throw badRequest('Invalid automation', { issues });
  const now = params.now ?? new Date();

  const state =
    params.event.type === 'start'
      ? newRunState({ automationId: params.automationId, runId: randomUUID(), automationVersion: 0, now })
      : parseRunState(params.rawState, params.automation.nodes);
  if (!state || state.automationId !== params.automationId) throw badRequest('Invalid preview state; start the preview again');

  const lastText = params.event.type === 'inbound' ? params.event.text : (state.lastAnswer ?? '');
  const unavailable: PreviewUnavailable[] = [];
  const note = (u: PreviewUnavailable) => {
    if (!unavailable.some((x) => JSON.stringify(x) === JSON.stringify(u))) unavailable.push(u);
  };
  const walk = (c: AutomationCondition) => {
    if (c.type === 'all' || c.type === 'any') (c.clauses ?? []).forEach(walk);
    else if (!LOCAL_CONDITION_TYPES.has(c.type)) note({ kind: 'condition', type: c.type });
  };
  const result = await advanceAutomationRun({
    automation: params.automation,
    state,
    event: params.event,
    ports: {
      now,
      evaluateCondition: async (condition) => {
        walk(condition);
        return evaluateLocalCondition(condition, { text: lastText.slice(0, 8000), at: now, businessHours: params.businessHours, firstInbound: true });
      },
      interpretAnswer: async (node) => {
        note({ kind: 'ai_step', nodeId: node.id });
        return { understood: false };
      },
      isWithinBusinessHours: (at) => isWithinBusinessHours(params.businessHours, at),
      bucket: splitBucket,
    },
  });

  const effects: PreviewEffect[] = result.effects.map((effect) => {
    if (effect.type !== 'send_message' || (effect.replyMode !== 'buttons' && effect.replyMode !== 'list')) return effect;
    const plan = planChoiceDelivery(params.channel, effect.replyMode, effect.options ?? [], { whatsappInteractive: params.whatsappInteractive === true });
    return {
      ...effect,
      delivery: {
        kind: plan.delivery.kind,
        warnings: plan.warnings,
        ...(plan.delivery.kind === 'text' ? { text: renderChoicesAsText(effect.text, effect.options ?? []) } : {}),
      },
    };
  });
  return { state: serializeRunState(result.state), effects, finished: !['active', 'waiting'].includes(result.state.status), unavailable };
}
