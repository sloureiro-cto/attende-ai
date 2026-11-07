import 'server-only';
import type { Deps } from '../../deps';
import { AppError } from '../../lib/errors';
import { JsynqError, type JsynqCard, type JsynqInboxRow, type UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { buildBindingPolicy } from '../agents/lib/agentProfile';
import { AgentSetupModel, type IAgentSetup } from '../agents/models';
import type { BusinessHours } from '../automations/lib/conditions';
import {
  cardOfKey,
  isConversationKey,
  type ActionOpts,
  type CardRef,
  type ConversationContext,
  type ConversationGateway,
  type ConversationKey,
  type CreateCardInput,
  type HandoffAssign,
} from '../automations/runtime/ports';
import { assertCanSendOutbound, recordOutbound } from '../billing/usage';
import type { WorkspaceClients } from './clients';
import { AiHandoffModel, AutomationActionModel, AutomationSendModel } from './models';

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

const refId = (v: unknown): string => String((v as { _id?: unknown })?._id ?? v ?? '');
const HEX24 = /^[0-9a-f]{24}$/i;
/** The JSYNQ CRM fields every lead has (`crmBuiltinCustomFields` on staging), read into `{{lead.*}}`. */
const LEAD_VARS: Record<string, string> = { contactName: 'lead.name', email: 'lead.email', phone: 'lead.phone', company: 'lead.company', estimateRevenue: 'lead.value' };

/** `card:title` / `card:owner` go to the card itself; any other id is a (JSYNQ CRM or custom) field. */
export function cardUpdateBody(fields: Array<{ fieldId: string; value: string }>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const custom: Array<{ fieldId: string; value: string }> = [];
  for (const f of fields) {
    if (f.fieldId === 'card:title') body.title = f.value.trim().slice(0, 200);
    else if (f.fieldId === 'card:owner') {
      if (!HEX24.test(f.value.trim())) throw new Error('OWNER_NOT_A_MEMBER');
      body.assignedUsers = [f.value.trim()];
    } else custom.push({ fieldId: f.fieldId, value: f.value });
  }
  if (custom.length) body.customFields = custom;
  return body;
}

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
 * | lead steps (create, copy, delete, move board, fields, owner, labels, comment, checklist) | see `docs/jsynq-apis-used.md` ("Automations pack") |
 * | mark read / assign without a state change | `POST .../mark-read`, `PATCH .../assign {userId}` |
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
    if (!isConversationKey(key)) throw new Error('NO_CONVERSATION');
    const row = await client.getInboxConversation(key.workspaceId, key.conversationId);
    if (!row) throw new Error('conversation not visible to the workspace owner');
    return row;
  }

  private card(row: JsynqInboxRow): { projectId: string; cardId: string } | null {
    const c = row.conversation;
    if (!c.linkedEntityId || !c.crmProjectId || (c.linkedEntityType && !['card', 'lead'].includes(c.linkedEntityType))) return null;
    return { projectId: String(c.crmProjectId), cardId: String(c.linkedEntityId) };
  }

  /**
   * The card an action works on: the run's own card (`opts.card`: created by the run or the trigger's lead, set by the
   * runtime from the run state), the lead of a `card` run, else the conversation's linked card (fresh read).
   */
  private async cardFor(client: UserClient, key: ConversationKey, opts?: Pick<ActionOpts, 'card'>): Promise<CardRef | null> {
    if (opts?.card?.projectId && opts.card.cardId) return { projectId: opts.card.projectId, cardId: opts.card.cardId };
    const subject = cardOfKey(key);
    if (subject) return subject;
    return this.card(await this.row(client, key));
  }

  /** Runs a non-idempotent JSYNQ write once per step key (a retry returns what the first call returned). */
  private async once<T extends { projectId?: string; cardId?: string } | null>(key: ConversationKey, idempotencyKey: string, run: () => Promise<T>): Promise<T> {
    try {
      await AutomationActionModel.create({ _id: idempotencyKey, workspaceId: key.workspaceId, state: 'pending', at: this.deps.now() });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      const prior = await AutomationActionModel.findById(idempotencyKey).lean();
      if (prior?.state === 'done') return (prior.result ?? null) as T;
      throw new Error('ACTION_IN_FLIGHT');
    }
    try {
      const result = await run();
      await AutomationActionModel.updateOne({ _id: idempotencyKey }, { $set: { state: 'done', result: result ?? null } });
      return result;
    } catch (error) {
      await AutomationActionModel.deleteOne({ _id: idempotencyKey, state: 'pending' }).catch(() => undefined);
      throw error;
    }
  }

  private leadVars(card: JsynqCard | null, vars: Record<string, string>) {
    if (!card) return;
    if (card.title) vars['lead.title'] = card.title;
    for (const f of card.customFields ?? []) {
      const name = f?.fieldId ? LEAD_VARS[f.fieldId] : undefined;
      const value = f?.value;
      if (name && (typeof value === 'string' || typeof value === 'number') && String(value).trim() && !vars[name]) vars[name] = String(value);
    }
    if (!vars['lead.name'] && card.title) vars['lead.name'] = card.title;
    if (vars['lead.name'] && !vars['lead.first_name']) vars['lead.first_name'] = vars['lead.name'].split(/\s+/)[0] ?? vars['lead.name'];
  }

  async context(key: ConversationKey): Promise<ConversationContext> {
    const client = await this.clients.require(key.workspaceId);
    const subject = cardOfKey(key);
    if (subject) {
      const vars: Record<string, string> = {};
      this.leadVars(await client.getCard(subject.projectId, subject.cardId).catch(() => null), vars);
      return { ...(vars['lead.name'] ? { contactName: vars['lead.name'] } : {}), ...(vars['lead.phone'] ? { contactPhone: vars['lead.phone'] } : {}), linkedCardId: subject.cardId, card: subject, vars };
    }
    const row = await this.row(client, key);
    const c = row.conversation;
    const name = c.contactName ?? c.displayName ?? c.attendeeUsername ?? undefined;
    const phone = c.contactPhone ?? undefined;
    const card = this.card(row);
    const vars: Record<string, string> = {};
    if (name) Object.assign(vars, { 'lead.name': name, 'contact.name': name, 'lead.first_name': name.split(/\s+/)[0] ?? name });
    if (phone) Object.assign(vars, { 'lead.phone': phone, 'contact.phone': phone });
    if (card) this.leadVars(await client.getCard(card.projectId, card.cardId).catch(() => null), vars);
    return { ...(name ? { contactName: name } : {}), ...(phone ? { contactPhone: phone } : {}), ...(card ? { linkedCardId: card.cardId, card } : {}), vars };
  }

  async humanRepliedSince(key: ConversationKey, since: Date): Promise<boolean> {
    if (!isConversationKey(key)) return false;
    const client = await this.clients.require(key.workspaceId);
    const row = await this.row(client, key);
    const page = await client.listConversationMessages(key.channel, row.sessionId, key.conversationId, { limit: HUMAN_CHECK_PAGE });
    const human = page.filter((m) => m.direction === 'outbound' && m.senderType === 'user' && m.status !== 'failed' && m.createdAt && new Date(m.createdAt) >= since);
    if (!human.length) return false;
    const own = new Set((await AutomationSendModel.find({ messageId: { $in: human.map((m) => String(m._id)) } }).select('messageId').lean()).map((s) => String(s.messageId)));
    return human.some((m) => !own.has(String(m._id)));
  }

  async sendText(key: ConversationKey, text: string, opts: { idempotencyKey: string }): Promise<{ ok: boolean; error?: string }> {
    if (!isConversationKey(key)) return { ok: false, error: 'NO_CONVERSATION' };
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

  async moveCard(key: ConversationKey, input: { columnId: string; boardId?: string }, opts?: ActionOpts): Promise<{ ok: boolean; error?: string }> {
    try {
      const client = await this.clients.require(key.workspaceId);
      const card = await this.cardFor(client, key, opts);
      // No staging route finds-or-creates a card for a conversation: only a linked card moves.
      if (!card) return { ok: false, error: 'NO_LINKED_CARD' };
      await client.moveCard(card.projectId, card.cardId, input.columnId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: failure(error) };
    }
  }

  async addLabel(key: ConversationKey, cardId: string, text: string, color: string | undefined, opts?: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const card = await this.cardFor(client, key, opts);
    if (!card || card.cardId !== cardId) throw new Error('NO_LINKED_CARD');
    const wanted = text.trim().toLowerCase();
    const existing = (await client.listLabels(card.projectId)).find((l) => (l.text ?? '').trim().toLowerCase() === wanted);
    const labelId = existing?._id ?? (await client.createLabel(card.projectId, { text: text.trim(), color: color ?? DEFAULT_LABEL_COLOR }))._id;
    await client.updateCard(card.projectId, card.cardId, { addLabelIds: [String(labelId)] });
  }

  async setCardField(key: ConversationKey, cardId: string, fieldId: string, value: string, opts?: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const card = await this.cardFor(client, key, opts);
    if (!card || card.cardId !== cardId) throw new Error('NO_LINKED_CARD');
    await client.updateCard(card.projectId, card.cardId, cardUpdateBody([{ fieldId, value }]));
  }

  async updateCardFields(key: ConversationKey, card: CardRef, fields: Array<{ fieldId: string; value: string }>, opts?: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const target = await this.cardFor(client, key, opts);
    if (!target || target.cardId !== card.cardId) throw new Error('NO_LINKED_CARD');
    const body = cardUpdateBody(fields);
    if (Array.isArray(body.assignedUsers)) await this.assertMember(key.workspaceId, String(body.assignedUsers[0]));
    // JSYNQ merges `customFields` with the card's own (`mergeWithExisting`), so only these fields change.
    await client.updateCard(target.projectId, target.cardId, body);
  }

  private async assertMember(workspaceId: string, userId: string) {
    const members = (await this.clients.members(workspaceId))?.ids ?? new Set<string>();
    if (!members.has(userId.toLowerCase())) throw new Error('NOT_A_MEMBER');
  }

  async createCard(key: ConversationKey, input: CreateCardInput, opts: ActionOpts): Promise<CardRef> {
    const client = await this.clients.require(key.workspaceId);
    if (input.ownerUserId) await this.assertMember(key.workspaceId, input.ownerUserId);
    const created = await this.once(key, opts.idempotencyKey, async () => {
      const fields = cardUpdateBody(input.fields.filter((f) => f.fieldId !== 'card:owner'));
      const card = await client.createCard(input.projectId, {
        title: (typeof fields.title === 'string' && fields.title) || input.title,
        column: input.columnId,
        ...(input.boardId ? { board: input.boardId } : {}),
        ...(fields.customFields ? { customFields: fields.customFields } : {}),
        ...(input.ownerUserId ? { assignedUsers: [input.ownerUserId] } : {}),
      });
      return { projectId: input.projectId, cardId: card._id };
    });
    if (!created?.cardId) throw new Error('CARD_NOT_CREATED');
    // The conversation gets the new card when it has none (never replaces a card someone linked).
    if (input.linkConversation && isConversationKey(key)) {
      const row = await this.row(client, key);
      if (!this.card(row)) await client.linkConversationToCard(key.channel, row.sessionId, key.conversationId, created.cardId);
    }
    return { projectId: created.projectId!, cardId: created.cardId };
  }

  async duplicateCard(key: ConversationKey, card: CardRef, columnId: string | undefined, opts: ActionOpts): Promise<CardRef> {
    const client = await this.clients.require(key.workspaceId);
    const target = await this.cardFor(client, key, opts);
    if (!target || target.cardId !== card.cardId) throw new Error('NO_LINKED_CARD');
    const copy = await this.once(key, opts.idempotencyKey, async () => {
      const source = await client.getCard(target.projectId, target.cardId);
      if (!source) throw new Error('CARD_NOT_FOUND');
      const column = columnId || refId(source.column);
      if (!column) throw new Error('CARD_HAS_NO_STAGE');
      // Same project: every label maps to itself (JSYNQ drops unmapped labels on a clone).
      const labels = (source.labels ?? []).map(refId).filter(Boolean);
      const clone = await client.cloneCard(target.projectId, target.cardId, {
        targetProjectId: target.projectId,
        targetColumnId: column,
        labelMappings: labels.map((id) => ({ from: id, to: id })),
      });
      return { projectId: target.projectId, cardId: clone._id };
    });
    return { projectId: copy!.projectId!, cardId: copy!.cardId! };
  }

  /**
   * JSYNQ has no archive for cards: `DELETE` marks the card deleted. Only the conversation's linked card, the lead of
   * a `card` run, or a card this run created is ever deleted (checked against a fresh read).
   */
  async deleteCard(key: ConversationKey, card: CardRef, opts: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const subject = cardOfKey(key);
    const createdByRun = opts.card?.createdByRun === true && opts.card.cardId === card.cardId;
    const isSubject = !!subject && subject.cardId === card.cardId && subject.projectId === card.projectId;
    const linked = isConversationKey(key) ? this.card(await this.row(client, key)) : null;
    const isLinked = !!linked && linked.cardId === card.cardId;
    if (!createdByRun && !isSubject && !isLinked) throw new Error('NOT_THE_RUN_CARD');
    await client.deleteCard(card.projectId, card.cardId);
    log.info('worker.card_deleted', { workspaceId: key.workspaceId, cardId: card.cardId, by: createdByRun ? 'created_by_run' : isSubject ? 'trigger_lead' : 'linked' });
  }

  async moveCardToBoard(key: ConversationKey, card: CardRef, columnId: string, opts: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const target = await this.cardFor(client, key, opts);
    if (!target || target.cardId !== card.cardId) throw new Error('NO_LINKED_CARD');
    await client.moveCardToBoard(target.projectId, target.cardId, columnId);
  }

  async removeLabel(key: ConversationKey, card: CardRef, text: string, opts: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const target = await this.cardFor(client, key, opts);
    if (!target || target.cardId !== card.cardId) throw new Error('NO_LINKED_CARD');
    const wanted = text.trim().toLowerCase();
    const ids = new Set((await client.listLabels(target.projectId)).filter((l) => (l.text ?? '').trim().toLowerCase() === wanted).map((l) => String(l._id)));
    if (!ids.size) return;
    const current = await client.getCard(target.projectId, target.cardId);
    const labels = (current?.labels ?? []).map(refId).filter(Boolean);
    if (!labels.some((id) => ids.has(id))) return;
    await client.updateCard(target.projectId, target.cardId, { labels: labels.filter((id) => !ids.has(id)) });
  }

  async addComment(key: ConversationKey, card: CardRef, text: string, opts: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const target = await this.cardFor(client, key, opts);
    if (!target || target.cardId !== card.cardId) throw new Error('NO_LINKED_CARD');
    await this.once(key, opts.idempotencyKey, async () => {
      const current = await client.getCard(target.projectId, target.cardId);
      const boardId = refId(current?.board);
      if (!boardId) throw new Error('CARD_HAS_NO_BOARD');
      await client.addCardComment(target.projectId, boardId, target.cardId, text.slice(0, 4000));
      return null;
    });
  }

  /** A checklist item is a child card (`parent`) on the card's board and stage, done through `completed`. */
  async addChecklistItem(key: ConversationKey, card: CardRef, title: string, opts: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const target = await this.cardFor(client, key, opts);
    if (!target || target.cardId !== card.cardId) throw new Error('NO_LINKED_CARD');
    await this.once(key, opts.idempotencyKey, async () => {
      const parent = await client.getCard(target.projectId, target.cardId);
      if (!parent) throw new Error('CARD_NOT_FOUND');
      const item = await client.createCard(target.projectId, {
        title,
        parent: target.cardId,
        ...(refId(parent.board) ? { board: refId(parent.board) } : {}),
        ...(refId(parent.column) ? { column: refId(parent.column) } : {}),
      });
      return { projectId: target.projectId, cardId: item._id };
    });
  }

  async setChecklistItem(key: ConversationKey, card: CardRef, title: string, checked: boolean, opts: ActionOpts): Promise<void> {
    const client = await this.clients.require(key.workspaceId);
    const target = await this.cardFor(client, key, opts);
    if (!target || target.cardId !== card.cardId) throw new Error('NO_LINKED_CARD');
    const wanted = title.trim().toLowerCase();
    const item = (await client.listSubtasks(target.projectId, target.cardId)).find((c) => (c.title ?? '').trim().toLowerCase() === wanted);
    if (!item) throw new Error('CHECKLIST_ITEM_NOT_FOUND');
    if (!!item.completed === checked) return;
    await client.updateCard(target.projectId, item._id, { completed: checked });
  }

  async markRead(key: ConversationKey): Promise<void> {
    if (!isConversationKey(key)) return;
    const client = await this.clients.require(key.workspaceId);
    const row = await this.row(client, key);
    await client.markConversationRead(key.channel, row.sessionId, key.conversationId);
  }

  /** Assignment only: the conversation keeps its state, so an AI agent answering it keeps answering. */
  async assignConversation(key: ConversationKey, userId: string): Promise<void> {
    if (!isConversationKey(key)) return;
    await this.assertMember(key.workspaceId, userId);
    const client = await this.clients.require(key.workspaceId);
    const row = await this.row(client, key);
    if (row.conversation.assignedUserId && String(row.conversation.assignedUserId).toLowerCase() === userId.toLowerCase()) return;
    await client.assignConversation(key.channel, row.sessionId, key.conversationId, userId);
  }

  async handoff(key: ConversationKey, assign: HandoffAssign & { assignMode: NonNullable<HandoffAssign['assignMode']> }, reason: string, _opts?: ActionOpts): Promise<void> {
    if (!isConversationKey(key)) return;
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

  // --- trigger lookups (not part of ConversationGateway: the runtime gets them as `TriggerLookups`) ----------------

  private labelNames = new Map<string, { at: number; names: Map<string, string> }>();

  /** Label id -> name of a project (cached 60 s). */
  async labelNamesOf(workspaceId: string, projectId: string): Promise<Map<string, string>> {
    const hit = this.labelNames.get(`${workspaceId}:${projectId}`);
    if (hit && Date.now() - hit.at < 60_000) return hit.names;
    const client = await this.clients.require(workspaceId);
    const names = new Map((await client.listLabels(projectId)).map((l) => [String(l._id), (l.text ?? '').trim()]));
    this.labelNames.set(`${workspaceId}:${projectId}`, { at: Date.now(), names });
    return names;
  }

  /** `GET /api/projects/:p/cards/:id/{channel}-conversations`: the lead's newest conversation on one of these sessions. */
  async findCardConversation(
    workspaceId: string,
    card: CardRef,
    sessions: Array<{ channel: 'whatsapp' | 'instagram' | 'sms'; sessionId: string }>
  ): Promise<{ channel: 'whatsapp' | 'instagram' | 'sms'; sessionId: string; conversationId: string } | null> {
    const client = await this.clients.require(workspaceId);
    let best: { channel: 'whatsapp' | 'instagram' | 'sms'; sessionId: string; conversationId: string; at: number } | null = null;
    for (const channel of [...new Set(sessions.map((s) => s.channel))]) {
      const allowed = new Set(sessions.filter((s) => s.channel === channel).map((s) => s.sessionId.toLowerCase()));
      for (const c of await client.listCardConversations(card.projectId, card.cardId, channel)) {
        if (!c?._id || c.deletedAt || !c.sessionId || !allowed.has(String(c.sessionId).toLowerCase())) continue;
        const at = new Date(c.lastMessageAt ?? c.createdAt ?? 0).getTime() || 0;
        if (!best || at > best.at) best = { channel, sessionId: String(c.sessionId), conversationId: String(c._id), at };
      }
    }
    return best ? { channel: best.channel, sessionId: best.sessionId, conversationId: best.conversationId } : null;
  }

  /** The lead's board, stage and label names (`GET /api/projects/:p/cards/:id`, labels by name). */
  async cardFacts(workspaceId: string, card: CardRef): Promise<{ boardId: string | null; columnId: string | null; labels: string[] } | null> {
    const client = await this.clients.require(workspaceId);
    const current = await client.getCard(card.projectId, card.cardId);
    if (!current || current.deleted) return null;
    const names = await this.labelNamesOf(workspaceId, card.projectId).catch(() => new Map<string, string>());
    return {
      boardId: refId(current.board) || null,
      columnId: refId(current.column) || null,
      labels: (current.labels ?? []).map((l) => names.get(refId(l)) ?? '').filter(Boolean),
    };
  }

  async businessHours(workspaceId: string): Promise<BusinessHours | null> {
    const hours = (await this.clients.members(workspaceId))?.businessHours;
    return hours && typeof hours === 'object' ? (hours as BusinessHours) : null;
  }

  async handoffToAi(key: ConversationKey, agentId: string): Promise<void> {
    if (!isConversationKey(key)) return;
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
    if (!isConversationKey(key)) return;
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
