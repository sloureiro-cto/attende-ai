import 'server-only';
import type { EngineEffect } from '../lib/advancedAutomationEngine';
import { renderChoicesAsText } from '../lib/advancedAutomationChoices';
import { logAdvancedAutomation } from '../lib/advancedAutomationLogger';
import { postWebhook } from '../lib/safeWebhook';
import { ADVANCED_AUTOMATION_LIMITS } from '../types';
import { ECHO } from './triggers';
import { isConversationKey, type ActionOpts, type AutomationEffectExecutor, type AutomationExecutionContext, type CardRef, type ConversationContext, type ConversationGateway, type EffectExecutionResult } from './ports';

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
    private readonly log: (event: string, data?: Record<string, unknown>) => void = logAdvancedAutomation,
    /** Anti-loop: records a change this run made in JSYNQ (see `ECHO`), so the trigger it causes skips this automation. */
    private readonly echo: (ctx: AutomationExecutionContext, change: string) => Promise<void> = async () => undefined
  ) {}

  async execute(ctx: AutomationExecutionContext, effects: EngineEffect[]): Promise<EffectExecutionResult> {
    const out: EffectExecutionResult = {};
    const logFor = (event: string, data: Record<string, unknown> = {}) =>
      this.log(event, { workspaceId: ctx.key.workspaceId, channel: ctx.key.channel, conversationId: ctx.key.conversationId, automationId: ctx.automation.id, runId: ctx.runId, ...data });
    let context: ConversationContext | undefined;
    const contextOf = async () => {
      if (!context) {
        context = await this.gateway.context(ctx.key).catch(() => ({ vars: {} }) as ConversationContext);
        // The run's own variables (webhook data) under the conversation's; `{{answer}}`: the contact's latest reply.
        const runVars = Object.fromEntries(Object.entries(ctx.runVars ?? {}).map(([k, v]) => [k.replace(/__/g, '.'), v]));
        context.vars = { ...runVars, ...context.vars, ...(ctx.lastAnswer !== undefined ? { answer: ctx.lastAnswer } : {}) };
      }
      return context;
    };
    // The card later steps act on: the run's own (created by it, or the trigger's lead), else the linked one.
    let runCard = ctx.runCard;
    const targetCard = async (): Promise<(CardRef & { createdByRun?: boolean }) | undefined> => {
      if (runCard) return runCard;
      const c = await contextOf();
      if (c.card) return c.card;
      return c.linkedCardId ? { projectId: '', cardId: c.linkedCardId } : undefined;
    };
    const cardOpts = (nodeId: string, action: string) => ({ ...stepKey(nodeId, action), ...(runCard ? { card: runCard } : {}) });
    const conversation = isConversationKey(ctx.key);
    const mark = (change: string) => this.echo(ctx, change).catch((error) => logFor('echo_failed', { error: (error as Error)?.message }));
    /** Runs a lead action on the target card; logs when there is none or the gateway cannot do it. */
    const onCard = async (nodeId: string, action: string, available: unknown, run: (card: CardRef, opts: ActionOpts) => Promise<unknown>) => {
      if (!available) return logFor(`${action}_unavailable`, { nodeId });
      const card = await targetCard();
      if (!card?.projectId) return logFor(`${action}_no_card`, { nodeId });
      await run(card, cardOpts(nodeId, action));
    };
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
      // A run on a lead without a conversation has nobody to write to: the message step is skipped, not failed.
      if (!conversation) {
        logFor('message_skipped_no_conversation', { nodeId: effect.nodeId });
        return true;
      }
      const text = composeMessage(effect, (await contextOf()).vars);
      if (!text) return true;
      if (text.length > MAX_MESSAGE_CHARS) {
        logFor('send_failed', { nodeId: effect.nodeId, error: 'MESSAGE_TOO_LONG', chars: text.length });
        return false;
      }
      const res = await this.gateway.sendText(ctx.key, text, stepKey(effect.nodeId, action));
      if (!res.ok) logFor('send_failed', { nodeId: effect.nodeId, error: res.error });
      else await mark(ECHO.sent(ctx.key.conversationId));
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
            const card = await targetCard();
            if (!card) {
              logFor('set_field_no_card');
              break;
            }
            // Customer-provided values are data: never render `{{...}}` inside them.
            const value = effect.literal ? effect.value : renderTemplate(effect.value, c.vars);
            const opts = cardOpts(effect.nodeId, `field:${effect.fieldId}`);
            if (this.gateway.updateCardFields && card.projectId) await this.gateway.updateCardFields(ctx.key, card, [{ fieldId: effect.fieldId, value }], opts);
            else await this.gateway.setCardField(ctx.key, card.cardId, effect.fieldId, value, opts);
            break;
          }
          case 'move_stage': {
            // The run's card when it has one, else the conversation's linked card.
            const moved = await targetCard().catch(() => undefined);
            if (moved) await mark(ECHO.moved(moved.cardId, effect.columnId));
            const res = await this.gateway.moveCard(ctx.key, { columnId: effect.columnId, boardId: effect.boardId }, cardOpts(effect.nodeId, ''));
            if (!res.ok) logFor('move_stage_failed', { nodeId: effect.nodeId, error: res.error });
            break;
          }
          case 'add_label': {
            const c = await contextOf();
            const card = await targetCard();
            const text = renderTemplate(effect.labelText, c.vars).trim().slice(0, ADVANCED_AUTOMATION_LIMITS.labelChars);
            if (card && text) {
              await mark(ECHO.label(card.cardId, text));
              await this.gateway.addLabel(ctx.key, card.cardId, text, effect.labelColor, cardOpts(effect.nodeId, ''));
            }
            break;
          }
          case 'create_card': {
            if (!this.gateway.createCard) {
              logFor('create_card_unavailable', { nodeId: effect.nodeId });
              break;
            }
            const c = await contextOf();
            await mark(ECHO.creating(effect.projectId));
            const created = await this.gateway.createCard(
              ctx.key,
              {
                projectId: effect.projectId,
                boardId: effect.boardId,
                columnId: effect.columnId,
                title: (renderTemplate(effect.title, c.vars).trim() || c.contactName || c.contactPhone || 'Lead').slice(0, 200),
                fields: (effect.fields ?? []).map((f) => ({ fieldId: f.fieldId, value: renderTemplate(f.value, c.vars) })).filter((f) => f.value.trim()),
                ...(effect.ownerUserId ? { ownerUserId: effect.ownerUserId } : {}),
                linkConversation: effect.linkConversation,
              },
              stepKey(effect.nodeId, 'create')
            );
            await mark(ECHO.created(created.cardId));
            runCard = { ...created, createdByRun: true };
            out.createdCard = created;
            break;
          }
          case 'duplicate_card':
            await onCard(effect.nodeId, 'duplicate_card', this.gateway.duplicateCard, async (card, opts) => {
              await mark(ECHO.creating(card.projectId));
              const copy = await this.gateway.duplicateCard!(ctx.key, card, effect.columnId, opts);
              await mark(ECHO.created(copy.cardId));
            });
            break;
          case 'delete_card':
            await onCard(effect.nodeId, 'delete_card', this.gateway.deleteCard, (card, opts) => this.gateway.deleteCard!(ctx.key, card, opts));
            break;
          case 'move_board':
            await onCard(effect.nodeId, 'move_board', this.gateway.moveCardToBoard, async (card, opts) => {
              await mark(ECHO.moved(card.cardId, effect.columnId));
              await this.gateway.moveCardToBoard!(ctx.key, card, effect.columnId, opts);
            });
            break;
          case 'set_value': {
            const value = renderTemplate(effect.value, (await contextOf()).vars).trim();
            if (!value) break;
            await onCard(effect.nodeId, 'set_value', this.gateway.updateCardFields, (card, opts) => this.gateway.updateCardFields!(ctx.key, card, [{ fieldId: 'estimateRevenue', value }], opts));
            break;
          }
          case 'set_owner':
            await onCard(effect.nodeId, 'set_owner', this.gateway.updateCardFields, (card, opts) => this.gateway.updateCardFields!(ctx.key, card, [{ fieldId: 'card:owner', value: effect.userId }], opts));
            break;
          case 'remove_label': {
            const text = renderTemplate(effect.labelText, (await contextOf()).vars).trim();
            if (!text) break;
            await onCard(effect.nodeId, 'remove_label', this.gateway.removeLabel, (card, opts) => this.gateway.removeLabel!(ctx.key, card, text, opts));
            break;
          }
          case 'add_comment': {
            const text = renderTemplate(effect.text, (await contextOf()).vars).trim();
            if (!text) break;
            await onCard(effect.nodeId, 'add_comment', this.gateway.addComment, (card, opts) => this.gateway.addComment!(ctx.key, card, text, opts));
            break;
          }
          case 'add_checklist_item': {
            const title = renderTemplate(effect.title, (await contextOf()).vars).trim().slice(0, 200);
            if (!title) break;
            await onCard(effect.nodeId, 'add_checklist_item', this.gateway.addChecklistItem, (card, opts) => this.gateway.addChecklistItem!(ctx.key, card, title, opts));
            break;
          }
          case 'check_checklist_item': {
            const title = renderTemplate(effect.title, (await contextOf()).vars).trim();
            if (!title) break;
            await onCard(effect.nodeId, 'check_checklist_item', this.gateway.setChecklistItem, (card, opts) =>
              this.gateway.setChecklistItem!(ctx.key, card, title, effect.checked, opts)
            );
            break;
          }
          case 'mark_read':
            if (!conversation || !this.gateway.markRead) logFor('mark_read_skipped', { nodeId: effect.nodeId });
            else await this.gateway.markRead(ctx.key, stepKey(effect.nodeId, ''));
            break;
          case 'assign_conversation':
            if (!conversation || !this.gateway.assignConversation) logFor('assign_conversation_skipped', { nodeId: effect.nodeId });
            else {
              await mark(ECHO.assigned(ctx.key.conversationId));
              await this.gateway.assignConversation(ctx.key, effect.userId, stepKey(effect.nodeId, ''));
            }
            break;
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
            if (!conversation) {
              logFor('handoff_skipped_no_conversation', { nodeId: effect.nodeId });
              break;
            }
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
            await mark(ECHO.handoff(ctx.key.conversationId));
            await mark(ECHO.assigned(ctx.key.conversationId));
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
