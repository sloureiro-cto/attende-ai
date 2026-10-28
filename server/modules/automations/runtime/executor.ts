import 'server-only';
import type { EngineEffect } from '../lib/advancedAutomationEngine';
import { renderChoicesAsText } from '../lib/advancedAutomationChoices';
import { logAdvancedAutomation } from '../lib/advancedAutomationLogger';
import { postWebhook } from '../lib/safeWebhook';
import { ADVANCED_AUTOMATION_LIMITS } from '../types';
import type { AutomationEffectExecutor, AutomationExecutionContext, ConversationContext, ConversationGateway, EffectExecutionResult } from './ports';

/** `{{lead.name}}` / `{{contact.phone}}` from the conversation context; unknown variables render empty. */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.-]{1,80})\s*\}\}/g, (_m, name: string) => vars[name] ?? '');
}

type SendEffect = Extract<EngineEffect, { type: 'send_message' }>;

/** JSYNQ refuses longer texts (`422`); a longer composed message takes the step's send_failed exit. */
export const MAX_MESSAGE_CHARS = ADVANCED_AUTOMATION_LIMITS.textChars;
/** What a handoff step without a configured mode did in the JSYNQ-era runtime (JSYNQ no longer defaults it). */
export const DEFAULT_HANDOFF_ASSIGN_MODE = 'all_crm_members' as const;

/** Text that goes out: variables rendered, options as a numbered menu, attachment link last. */
export function composeMessage(effect: SendEffect, vars: Record<string, string>): string {
  const rendered = renderTemplate(effect.text, vars);
  const body = (effect.replyMode === 'buttons' || effect.replyMode === 'list') && effect.options?.length ? renderChoicesAsText(rendered, effect.options) : rendered;
  return [body, effect.attachmentUrl?.trim()].filter(Boolean).join('\n\n').trim();
}

/**
 * Carries out what a run decided, through the `ConversationGateway` (JSYNQ). Never throws: a
 * failing effect is logged and does not stop independent ones, except a failed message, which
 * stops this batch's later messages and is reported so a waiting step takes its send_failed exit.
 */
export class GatewayEffectExecutor implements AutomationEffectExecutor {
  constructor(
    private readonly gateway: ConversationGateway,
    private readonly log: (event: string, data?: Record<string, unknown>) => void = logAdvancedAutomation
  ) {}

  async execute(ctx: AutomationExecutionContext, effects: EngineEffect[]): Promise<EffectExecutionResult> {
    const out: EffectExecutionResult = {};
    const logFor = (event: string, data: Record<string, unknown> = {}) =>
      this.log(event, { workspaceId: ctx.key.workspaceId, channel: ctx.key.channel, conversationId: ctx.key.conversationId, automationId: ctx.automation.id, runId: ctx.runId, ...data });
    let context: ConversationContext | undefined;
    const contextOf = async () => (context ??= await this.gateway.context(ctx.key).catch(() => ({ vars: {} }) as ConversationContext));
    // Idempotency-Key per step: `runId:nodeId:eventId` (eventId = the inbound message id, or the
    // committed transition for timers/starts). A retried call replays; a later step is new. The
    // same node twice in one batch (a loop) gets a `:n` suffix.
    const seen = new Map<string, number>();
    const stepKey = (nodeId: string, action: string) => {
      const base = `${ctx.runId}:${nodeId}:${ctx.eventId ?? 'start'}${action ? `:${action}` : ''}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return { idempotencyKey: (n ? `${base}:${n}` : base).slice(0, 200) };
    };

    const send = async (effect: SendEffect, action = ''): Promise<boolean> => {
      const text = composeMessage(effect, (await contextOf()).vars);
      if (!text) return true;
      if (text.length > MAX_MESSAGE_CHARS) {
        logFor('send_failed', { nodeId: effect.nodeId, error: 'MESSAGE_TOO_LONG', chars: text.length });
        return false;
      }
      const res = await this.gateway.sendText(ctx.key, text, stepKey(effect.nodeId, action));
      if (!res.ok) logFor('send_failed', { nodeId: effect.nodeId, error: res.error });
      return res.ok;
    };

    for (const effect of effects) {
      try {
        switch (effect.type) {
          case 'send_message':
            if (out.sendFailedNodeId) break;
            if (!(await send(effect))) out.sendFailedNodeId = effect.nodeId;
            break;
          case 'send_meta_template': {
            if (out.sendFailedNodeId) break;
            const res = await this.gateway.sendTemplate(ctx.key, effect.templateId, stepKey(effect.nodeId, ''));
            if (!res.ok) logFor('send_failed', { nodeId: effect.nodeId, error: res.error });
            break;
          }
          case 'set_field': {
            const c = await contextOf();
            if (!c.linkedCardId) {
              logFor('set_field_no_card');
              break;
            }
            // Customer-provided values are data: never render `{{...}}` inside them.
            await this.gateway.setCardField(
              ctx.key,
              c.linkedCardId,
              effect.fieldId,
              effect.literal ? effect.value : renderTemplate(effect.value, c.vars),
              stepKey(effect.nodeId, `field:${effect.fieldId}`)
            );
            break;
          }
          case 'move_stage': {
            // JSYNQ resolves the card itself (linked card, or find-or-create on WhatsApp).
            const res = await this.gateway.moveCard(ctx.key, { columnId: effect.columnId, boardId: effect.boardId }, stepKey(effect.nodeId, ''));
            if (!res.ok) logFor('move_stage_failed', { nodeId: effect.nodeId, error: res.error });
            break;
          }
          case 'add_label': {
            const c = await contextOf();
            const text = renderTemplate(effect.labelText, c.vars).trim().slice(0, ADVANCED_AUTOMATION_LIMITS.labelChars);
            if (c.linkedCardId && text) await this.gateway.addLabel(ctx.key, c.linkedCardId, text, effect.labelColor, stepKey(effect.nodeId, ''));
            break;
          }
          case 'create_task':
            // No "create task on card" capability exists; never pretend it ran.
            logFor('create_task_unsupported');
            break;
          case 'webhook': {
            const c = await contextOf();
            const res = await postWebhook(effect.url, {
              event: 'advanced_automation.webhook',
              workspaceId: ctx.key.workspaceId,
              automationId: ctx.automation.id,
              automationName: ctx.automation.name,
              runId: ctx.runId,
              conversationId: ctx.key.conversationId,
              channel: ctx.key.channel,
              contact: { name: c.contactName ?? null, phone: c.contactPhone ?? null },
              cardId: c.linkedCardId ?? null,
            });
            logFor(res.ok ? 'webhook_ok' : 'webhook_failed', { status: res.ok ? res.status : res.error });
            break;
          }
          case 'handoff': {
            if (effect.message?.trim() && !(await send({ type: 'send_message', nodeId: effect.nodeId, text: effect.message, replyMode: 'none' }, 'message'))) {
              logFor('handoff_message_failed', { nodeId: effect.nodeId });
            }
            if (effect.to === 'ai') {
              if (!effect.agentId || !this.gateway.handoffToAi) {
                logFor('handoff_state_failed', { nodeId: effect.nodeId, error: 'AI_HANDOFF_UNAVAILABLE' });
                break;
              }
              await this.gateway
                .handoffToAi(ctx.key, effect.agentId, stepKey(effect.nodeId, 'ai'))
                .catch((error) => logFor('handoff_state_failed', { nodeId: effect.nodeId, error: (error as Error)?.message }));
              break;
            }
            const assign = { ...effect.assign, assignMode: effect.assign?.assignMode ?? DEFAULT_HANDOFF_ASSIGN_MODE };
            await this.gateway
              .handoff(ctx.key, assign, 'Advanced automation handoff', stepKey(effect.nodeId, ''))
              .catch((error) => logFor('handoff_state_failed', { nodeId: effect.nodeId, error: (error as Error)?.message }));
            break;
          }
          case 'enter_automation':
            out.enterAutomationId = effect.automationId;
            break;
          default:
            break; // stat / run_ended are bookkeeping for the runtime
        }
      } catch (error) {
        logFor('effect_failed', { type: effect.type, error: (error as Error)?.message });
      }
    }
    return out;
  }
}
