import 'server-only';
import type { Deps } from '../../deps';
import { AppError } from '../../lib/errors';
import { JsynqError, type JsynqInboxRow, type UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { buildBindingPolicy } from '../agents/lib/agentProfile';
import { AgentSetupModel, type IAgentSetup } from '../agents/models';
import type { BusinessHours } from '../automations/lib/conditions';
import type { ActionOpts, ConversationContext, ConversationGateway, ConversationKey, HandoffAssign } from '../automations/runtime/ports';
import { assertCanSendOutbound, recordOutbound } from '../billing/usage';
import type { WorkspaceClients } from './clients';
import { AiHandoffModel, AutomationSendModel } from './models';

const DEFAULT_LABEL_COLOR = '#6366f1';
/** Messages read to answer "did a person reply since the run started?". */
const HUMAN_CHECK_PAGE = 50;

/** Binding policy of an AI handoff to a JSYNQ agent that is not an Attende agent: answer this contact, nothing else. */
const SAFE_AI_POLICY = {
  sendReply: true,
  stopOnUserIntervention: true,
  workspaceAccess: 'none',
  allowMessagingOtherContacts: false,
  allowReadingOtherConversations: false,
  allowImageGeneration: false,
  allowHumanHandoff: true,
  autoCreateLead: false,
} as const;

const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;
const notFound = (error: unknown) => error instanceof JsynqError && error.status === 404;
const failure = (error: unknown): string =>
  error instanceof AppError ? (error.reference ?? error.message) : error instanceof JsynqError ? `JSYNQ_${error.status}${error.reference ? `_${error.reference}` : ''}` : errMessage(error);

/** Stable pick among members (the same conversation always lands on the same person). */
function pick<T>(items: T[], seed: string): T | undefined {
  if (!items.length) return undefined;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

/**
 * `ConversationGateway` on JSYNQ's existing user routes (origin/staging), acting as the workspace owner:
 *
 * | Action | JSYNQ route |
 * | --- | --- |
 * | conversation context (contact, linked card, state, assignee) | `GET /api/workspaces/:w/messaging/inbox/conversations?conversationId=` |
 * | text message | `POST /api/{channel}-lite/sessions/:s/conversations/:id/messages {text}` |
 * | move the linked card | `PUT /api/projects/:p/cards/:id {column}` |
 * | label | `GET /api/projects/:p/labels`, `POST /api/projects/:p/label {text,color}`, `PUT .../cards/:id {addLabelIds}` |
 * | card field | `PUT /api/projects/:p/cards/:id {customFields: [{fieldId, value}]}` (JSYNQ merges) |
 * | handoff to people | `POST /api/{channel}-lite/conversations/:id/state {newState: 'human_handoff'}`, then `PATCH .../assign {userId}` |
 * | handoff to AI | `POST /api/automation-bindings {targetType: 'conversation', targetId}`; `DELETE /api/automation-bindings/:id` to take it back |
 * | "did a person reply" | `GET /api/{channel}-lite/sessions/:s/conversations/:id/messages` |
 * | business hours | `GET /api/workspaces/:w` |
 *
 * JSYNQ's send route has no idempotency key: `automation_sends` records each step key before the call, so a retried
 * step never sends twice (a crash between the call and the record drops that message rather than repeating it).
 * Messages go out as the owner (`senderType: 'user'`); their ids are recorded so they never count as a human reply.
 */
export class JsynqConversationGateway implements ConversationGateway {
  constructor(
    private readonly clients: WorkspaceClients,
    private readonly deps: Pick<Deps, 'now'>
  ) {}

  private async row(client: UserClient, key: ConversationKey): Promise<JsynqInboxRow> {
    const row = await client.getInboxConversation(key.workspaceId, key.conversationId);
    if (!row) throw new Error('conversation not visible to the workspace owner');
    return row;
  }

  private card(row: JsynqInboxRow): { projectId: string; cardId: string } | null {
    const c = row.conversation;
    if (!c.linkedEntityId || !c.crmProjectId || (c.linkedEntityType && !['card', 'lead'].includes(c.linkedEntityType))) return null;
    return { projectId: String(c.crmProjectId), cardId: String(c.linkedEntityId) };
  }

  async context(key: ConversationKey): Promise<ConversationContext> {
    const row = await this.row(await this.clients.require(key.workspaceId), key);
    const c = row.conversation;
    const name = c.contactName ?? c.displayName ?? c.attendeeUsername ?? undefined;
    const phone = c.contactPhone ?? undefined;
    const card = this.card(row);
    const vars: Record<string, string> = {};
    if (name) Object.assign(vars, { 'lead.name': name, 'contact.name': name, 'lead.first_name': name.split(/\s+/)[0] ?? name });
    if (phone) Object.assign(vars, { 'lead.phone': phone, 'contact.phone': phone });
    return { ...(name ? { contactName: name } : {}), ...(phone ? { contactPhone: phone } : {}), ...(card ? { linkedCardId: card.cardId } : {}), vars };
  }

  async humanRepliedSince(key: ConversationKey, since: Date): Promise<boolean> {
    const client = await this.clients.require(key.workspaceId);
    const row = await this.row(client, key);
    const page = await client.listConversationMessages(key.channel, row.sessionId, key.conversationId, { limit: HUMAN_CHECK_PAGE });
    const human = page.filter((m) => m.direction === 'outbound' && m.senderType === 'user' && m.status !== 'failed' && m.createdAt && new Date(m.createdAt) >= since);
    if (!human.length) return false;
    const own = new Set((await AutomationSendModel.find({ messageId: { $in: human.map((m) => String(m._id)) } }).select('messageId').lean()).map((s) => String(s.messageId)));
    return human.some((m) => !own.has(String(m._id)));
  }

  async sendText(key: ConversationKey, text: string, opts: { idempotencyKey: string }): Promise<{ ok: boolean; error?: string }> {
    try {
      await AutomationSendModel.create({ _id: opts.idempotencyKey, workspaceId: key.workspaceId, conversationId: key.conversationId, state: 'pending', at: this.deps.now() });
    } catch (error) {
      // Already sent (or in flight, or crashed mid-call): never send a step twice.
      if (isDuplicate(error)) return { ok: true };
      throw error;
    }
    try {
      await assertCanSendOutbound(this.deps, key.workspaceId);
      const client = await this.clients.require(key.workspaceId);
      const row = await this.row(client, key);
      const sent = await client.sendConversationMessage(key.channel, row.sessionId, key.conversationId, text);
      await AutomationSendModel.updateOne({ _id: opts.idempotencyKey }, { $set: { state: 'sent', messageId: sent._id } });
      await recordOutbound(this.deps, key.workspaceId);
      return { ok: true };
    } catch (error) {
      // Not sent: the step may be retried.
      await AutomationSendModel.deleteOne({ _id: opts.idempotencyKey, state: 'pending' }).catch(() => undefined);
      return { ok: false, error: failure(error) };
    }
  }

  /** WhatsApp (Meta) templates are sent by JSYNQ's separate WhatsApp gateway, not by the JSYNQ API: no route to call. */
  async sendTemplate(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: 'TEMPLATE_SEND_UNAVAILABLE' };
  }

  async moveCard(key: ConversationKey, input: { columnId: string; boardId?: string }): Promise<{ ok: boolean; error?: string }> {
    try {
      const client = await this.clients.require(key.workspaceId);
      const card = this.card(await this.row(client, key));
      // No staging route finds-or-creates a card for a conversation: only a linked card moves.
      if (!card) return { ok: false, error: 'NO_LINKED_CARD' };
      await client.moveCard(card.projectId, card.cardId, input.columnId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: failure(error) };
    }
  }

  async addLabel(key: ConversationKey, cardId: string, text: string, color: string | undefined): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const card = this.card(await this.row(client, key));
    if (!card || card.cardId !== cardId) throw new Error('NO_LINKED_CARD');
    const wanted = text.trim().toLowerCase();
    const existing = (await client.listLabels(card.projectId)).find((l) => (l.text ?? '').trim().toLowerCase() === wanted);
    const labelId = existing?._id ?? (await client.createLabel(card.projectId, { text: text.trim(), color: color ?? DEFAULT_LABEL_COLOR }))._id;
    await client.updateCard(card.projectId, card.cardId, { addLabelIds: [String(labelId)] });
  }

  async setCardField(key: ConversationKey, cardId: string, fieldId: string, value: string): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const card = this.card(await this.row(client, key));
    if (!card || card.cardId !== cardId) throw new Error('NO_LINKED_CARD');
    await client.updateCard(card.projectId, card.cardId, { customFields: [{ fieldId, value }] });
  }

  async handoff(key: ConversationKey, assign: HandoffAssign & { assignMode: NonNullable<HandoffAssign['assignMode']> }, reason: string, _opts?: ActionOpts): Promise<void> {
    await this.releaseAi(key);
    const client = await this.clients.require(key.workspaceId);
    const row = await this.row(client, key);
    if (row.conversation.conversationState !== 'human_handoff') {
      await client.setConversationState(key.channel, key.conversationId, 'human_handoff', reason);
    }
    // Never overwrite a person already on the conversation.
    if (row.conversation.assignedUserId) return;
    const members = (await this.clients.members(key.workspaceId))?.ids ?? new Set<string>();
    let target: string | undefined;
    if (assign.assignMode === 'specific_user') target = assign.specificUserId;
    else if (assign.assignMode === 'member_list') target = pick((assign.userIds ?? []).filter((id) => members.has(id.toLowerCase())), key.conversationId);
    else if (assign.assignMode === 'by_workspace_role') {
      // No staging route lists members by role: the conversation stays with the team (unassigned).
      log.info('worker.handoff_role_unassigned', { workspaceId: key.workspaceId, conversationId: key.conversationId });
    }
    if (!target || !members.has(target.toLowerCase())) return;
    await client.assignConversation(key.channel, row.sessionId, key.conversationId, target);
  }

  async businessHours(workspaceId: string): Promise<BusinessHours | null> {
    const hours = (await this.clients.members(workspaceId))?.businessHours;
    return hours && typeof hours === 'object' ? (hours as BusinessHours) : null;
  }

  async handoffToAi(key: ConversationKey, agentId: string): Promise<void> {
    const where = { workspaceId: key.workspaceId, channel: key.channel, conversationId: key.conversationId };
    const current = await AiHandoffModel.findOne(where).lean();
    if (current?.agentId === agentId) return;
    if (current) await this.releaseAi(key);
    const client = await this.clients.require(key.workspaceId);
    const row = await this.row(client, key);
    const setup = await AgentSetupModel.findOne({ workspaceId: key.workspaceId, agentId, state: 'ready' }).lean<IAgentSetup | null>();
    const policy = setup ? buildBindingPolicy(setup.form) : SAFE_AI_POLICY;
    const binding = await client.createBinding({
      agentId,
      channel: key.channel,
      sessionId: row.sessionId,
      targetType: 'conversation',
      targetId: key.conversationId,
      mode: 'auto_reply',
      policy,
    });
    try {
      await AiHandoffModel.create({ ...where, sessionId: row.sessionId, agentId, bindingId: String(binding._id) });
    } catch (error) {
      // Lost a race with another handoff of the same conversation: undo ours.
      await client.deleteBinding(String(binding._id)).catch(() => undefined);
      if (!isDuplicate(error)) throw error;
    }
    log.info('worker.ai_handoff', { workspaceId: key.workspaceId, conversationId: key.conversationId, agentId });
  }

  async releaseAi(key: ConversationKey): Promise<void> {
    const where = { workspaceId: key.workspaceId, channel: key.channel, conversationId: key.conversationId };
    const current = await AiHandoffModel.findOne(where).lean();
    if (!current) return;
    const client = await this.clients.require(key.workspaceId);
    try {
      await client.deleteBinding(current.bindingId);
    } catch (error) {
      if (!notFound(error)) throw error;
    }
    await AiHandoffModel.deleteOne({ _id: current._id });
    log.info('worker.ai_released', { workspaceId: key.workspaceId, conversationId: key.conversationId });
  }
}
