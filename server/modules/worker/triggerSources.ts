import 'server-only';
import type { JsynqCard, UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import type { BusinessHours } from '../automations/lib/conditions';
import { AdvancedAutomationModel, type IAdvancedAutomation } from '../automations/models';
import type { AutomationRuntime } from '../automations/runtime/runtime';
import type { TriggerEvent } from '../automations/runtime/triggers';
import { CRM_TRIGGER_KINDS, TRIGGER_LIMITS, type AdvancedAutomationTriggerKind } from '../automations/types';
import { stageKindOf } from '../funnel/board';
import type { WorkspaceClients } from './clients';
import { isChannel, type ConversationRef } from './events';
import type { JsynqConversationGateway } from './gateway';
import { AutomationScheduleStateModel, WorkerCardSnapshotModel, WorkerCrmCursorModel } from './models';
import { CRM_EVENTS, InboxSocket, type InboxSocketMessage } from './socket';

const AUTOMATIONS_TTL_MS = 30_000;
const COLUMNS_TTL_MS = 5 * 60_000;
const CRM_PAGE = 50;
const CRM_POLL_MAX_PAGES = 6;
const CRM_POLL_OVERLAP_MS = 2 * 60_000;
/** A project the worker starts watching: the most recently updated cards become the baseline (no triggers). */
const CRM_SEED_PAGES = 4;
const INBOX_PAGE = 50;
const SILENCE_MAX_PAGES = 10;
/** A silence that ended this long ago is history: the scan does not go further back. */
const SILENCE_LOOKBACK_MS = 6 * 3600_000;
/** Most CRM projects a workspace watches (JSYNQ lists at most 50 per page). */
const MAX_PROJECTS = 50;

type TriggerAutomation = Pick<IAdvancedAutomation, 'trigger'> & { id: string };
const refId = (v: unknown): string => String((v as { _id?: unknown })?._id ?? v ?? '');
const HEX24 = /^[0-9a-f]{24}$/i;
const date = (v: unknown): Date | null => {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export type TriggerSourceDeps = {
  clients: WorkspaceClients;
  gateway: JsynqConversationGateway;
  runtime: AutomationRuntime;
  now: () => Date;
  watchFrom: (workspaceId: string) => Promise<Date>;
  wsUrl: string;
  socket?: { refreshMs?: number; minBackoffMs?: number; maxBackoffMs?: number };
};

/** Local date, weekday and `HH:MM` of `at` in a time zone (UTC when it is unknown). */
export function localClock(at: Date, timeZone: string | undefined): { day: string; weekday: number; time: string } {
  const tz = timeZone?.trim() || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const hour = get('hour') === '24' ? '00' : get('hour');
    return { day: `${get('year')}-${get('month')}-${get('day')}`, weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), time: `${hour}:${get('minute')}` };
  } catch {
    return localClock(at, 'UTC');
  }
}

/** `YYYY-MM-DD` plus `days`. */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The calendar date of a card's date value (`YYYY-MM-DD`), or null. */
export function dateOfValue(value: unknown): string | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const s = value instanceof Date ? value.toISOString() : value.trim();
  const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (ymd) return ymd[1]!;
  const d = date(s);
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * Turns what JSYNQ reports into automation trigger events (`runtime.onTriggerEvent`):
 *
 * - CRM: one `crm-dashboard:<projectId>` socket per CRM project an active CRM trigger needs (same owner-token auth as
 *   the inbox socket), plus a catch-up poll of `GET /api/projects/:p/cards/paginated?orderBy=updatedAt:desc` every
 *   minute and after every reconnect. Both go through the card snapshots, so a change is reported once.
 * - Conversations: keyword / any message (the inbound stream), assignment (inbox socket), handoff and silences (poll).
 * - Time: scheduled and date-field triggers, read in pages of the card list, capped per tick and per day.
 */
export class TriggerSources {
  private automations = new Map<string, { at: number; list: TriggerAutomation[] }>();
  private crmSockets = new Map<string, Map<string, InboxSocket>>();
  private columnKinds = new Map<string, { at: number; kinds: Map<string, 'open' | 'won' | 'lost'> }>();
  private polling = new Map<string, Promise<void>>();

  constructor(private readonly deps: TriggerSourceDeps) {}

  // --- which automations need what -------------------------------------------------------------------------------

  /** Active automations of a workspace with a trigger other than "new conversation" / "manual" (cached 30 s). */
  async automationsOf(workspaceId: string): Promise<TriggerAutomation[]> {
    const hit = this.automations.get(workspaceId);
    if (hit && Date.now() - hit.at < AUTOMATIONS_TTL_MS) return hit.list;
    const docs = await AdvancedAutomationModel.find({ workspaceId, status: 'active', 'trigger.kind': { $nin: ['new_conversation', 'manual'] } })
      .select('trigger')
      .lean<Array<Pick<IAdvancedAutomation, '_id' | 'trigger'>>>();
    const list = docs.map((d) => ({ id: String(d._id), trigger: d.trigger }));
    this.automations.set(workspaceId, { at: Date.now(), list });
    return list;
  }

  forget(workspaceId: string) {
    this.automations.delete(workspaceId);
    for (const s of this.crmSockets.get(workspaceId)?.values() ?? []) s.stop();
    this.crmSockets.delete(workspaceId);
  }

  stopAll() {
    for (const w of [...this.crmSockets.keys()]) this.forget(w);
  }

  private async has(workspaceId: string, kinds: readonly AdvancedAutomationTriggerKind[]): Promise<TriggerAutomation[]> {
    return (await this.automationsOf(workspaceId)).filter((a) => kinds.includes(a.trigger.kind));
  }

  /** Hands an event to the runtime. Resolves with the per-automation outcome (`null` when the runtime failed). */
  private emit(event: TriggerEvent): Promise<{ started: string[]; skipped: Record<string, string> } | null> {
    return this.deps.runtime
      .onTriggerEvent(event)
      .then((r) => {
        if (r.started.length) log.info('worker.trigger_started', { workspaceId: event.workspaceId, kind: event.kind, automations: r.started.length });
        return r;
      })
      .catch((error) => {
        log.warn('worker.trigger_failed', { workspaceId: event.workspaceId, kind: event.kind, error: errMessage(error) });
        return null;
      });
  }

  // --- CRM: sockets ------------------------------------------------------------------------------------------------

  /** CRM projects the workspace's active CRM triggers need (all CRM projects when one trigger names none). */
  async crmProjects(workspaceId: string): Promise<string[]> {
    const crm = await this.has(workspaceId, CRM_TRIGGER_KINDS);
    if (!crm.length) return [];
    const named = new Set<string>();
    let all = false;
    for (const a of crm) {
      const p = a.trigger.projectId ?? a.trigger.filters?.projectId;
      if (p && HEX24.test(p)) named.add(p);
      else all = true;
    }
    if (all) {
      const client = await this.deps.clients.require(workspaceId);
      for (const p of await client.listProjects()) {
        const type = typeof p.projectType === 'string' ? p.projectType : p.projectType?.title;
        if (/crm/i.test(String(type ?? '')) || (p.tabs ?? []).some((t) => t.boardType === 'crm')) named.add(String(p._id));
      }
    }
    return [...named].slice(0, MAX_PROJECTS);
  }

  /** Opens / closes the `crm-dashboard:<projectId>` sockets so they match what the triggers need. */
  async refreshCrm(workspaceId: string): Promise<void> {
    const wanted = new Set(await this.crmProjects(workspaceId));
    const current = this.crmSockets.get(workspaceId) ?? new Map<string, InboxSocket>();
    for (const [projectId, socket] of current) {
      if (wanted.has(projectId)) continue;
      socket.stop();
      current.delete(projectId);
    }
    for (const projectId of wanted) {
      if (current.has(projectId)) continue;
      await this.seedProject(workspaceId, projectId).catch((error) => log.warn('worker.crm_seed_failed', { workspaceId, projectId, error: errMessage(error) }));
      const socket = new InboxSocket({
        url: this.deps.wsUrl,
        workspaceId,
        room: `crm-dashboard:${projectId}`,
        token: () => this.deps.clients.socketToken(workspaceId),
        onMessage: (m) => void this.queueCrm(workspaceId, projectId, m),
        onOpen: () => void this.pollProject(workspaceId, projectId),
        refreshMs: this.deps.socket?.refreshMs,
        minBackoffMs: this.deps.socket?.minBackoffMs,
        maxBackoffMs: this.deps.socket?.maxBackoffMs,
      });
      current.set(projectId, socket);
      socket.start();
      log.info('worker.crm_project_watched', { workspaceId, projectId });
    }
    this.crmSockets.set(workspaceId, current);
  }

  crmSocket(workspaceId: string, projectId: string): InboxSocket | undefined {
    return this.crmSockets.get(workspaceId)?.get(projectId);
  }

  private crmQueues = new Map<string, Promise<void>>();

  /** One project's events are handled in the order JSYNQ sent them (a quick move and move back must not swap). */
  queueCrm(workspaceId: string, projectId: string, m: InboxSocketMessage): Promise<void> {
    const key = `${workspaceId}:${projectId}`;
    const next = (this.crmQueues.get(key) ?? Promise.resolve()).then(() => this.onCrmMessage(workspaceId, projectId, m));
    this.crmQueues.set(key, next);
    void next.finally(() => {
      if (this.crmQueues.get(key) === next) this.crmQueues.delete(key);
    });
    return next;
  }

  async onCrmMessage(workspaceId: string, projectId: string, m: InboxSocketMessage): Promise<void> {
    const p = m.payload;
    if (String(p.projectId ?? projectId) !== projectId || typeof p.cardId !== 'string' || !HEX24.test(p.cardId)) return;
    const cardId = p.cardId;
    try {
      if (m.type === CRM_EVENTS.cardCreated) {
        if (p.parentId) return; // a checklist item, not a lead
        await this.cardSeen(workspaceId, projectId, cardId, {
          source: 'socket',
          createdAt: date(p.createdAt) ?? this.deps.now(),
          columnId: typeof p.columnId === 'string' && p.columnId !== 'backlog' ? p.columnId : null,
          boardId: typeof p.boardId === 'string' ? p.boardId : null,
          labels: [],
        });
      } else if (m.type === CRM_EVENTS.cardMoved) {
        if (typeof p.columnId !== 'string' || p.columnId === 'backlog') return;
        await this.cardSeen(workspaceId, projectId, cardId, { source: 'socket', columnId: p.columnId });
      } else if (m.type === CRM_EVENTS.cardUpdated) {
        if (!Array.isArray(p.labelIds)) return; // only label changes start anything
        await this.cardSeen(workspaceId, projectId, cardId, { source: 'socket', labels: p.labelIds.map(String) });
      }
    } catch (error) {
      log.warn('worker.crm_event_failed', { workspaceId, projectId, type: m.type, error: errMessage(error) });
    }
  }

  // --- CRM: one change, from the socket or the poll -----------------------------------------------------------------

  /**
   * Records what was seen of a card and reports what changed: created, moved (and won / lost by the stage's status),
   * labels added. The snapshot is updated atomically, so the socket and the poll seeing the same change report it once.
   * A card seen for the first time by the poll is a baseline (its past changes are unknown, nothing is reported).
   */
  async cardSeen(
    workspaceId: string,
    projectId: string,
    cardId: string,
    seen: { source: 'socket' | 'poll'; createdAt?: Date; columnId?: string | null; boardId?: string | null; labels?: string[] }
  ): Promise<void> {
    const _id = `${workspaceId}:${cardId}`;
    const set: Record<string, unknown> = { workspaceId, projectId, at: this.deps.now() };
    if (seen.columnId !== undefined) set.column = seen.columnId;
    if (seen.labels !== undefined) set.labels = seen.labels;
    const before = await WorkerCardSnapshotModel.findOneAndUpdate({ _id }, { $set: set, $inc: { rev: 1 } }, { upsert: true, new: false }).lean();
    const rev = (before?.rev ?? 0) + 1;
    const card = { projectId, cardId, ...(seen.boardId ? { boardId: seen.boardId } : {}), ...(seen.columnId ? { columnId: seen.columnId } : {}) };
    const watchFrom = await this.deps.watchFrom(workspaceId);

    if (!before && seen.createdAt && seen.createdAt >= watchFrom) {
      await this.emit({ workspaceId, kind: 'card_created', eventId: `created:${cardId}`, card });
      return;
    }
    if (seen.columnId && (before ? before.column !== seen.columnId : seen.source === 'socket')) {
      await this.emit({ workspaceId, kind: 'card_stage_changed', eventId: `moved:${cardId}:${rev}`, card });
      const kind = await this.columnKind(workspaceId, projectId, seen.columnId).catch(() => 'open' as const);
      if (kind === 'won' || kind === 'lost') await this.emit({ workspaceId, kind: kind === 'won' ? 'card_won' : 'card_lost', eventId: `${kind}:${cardId}:${rev}`, card });
    }
    if (seen.labels && before?.labels) {
      const had = new Set(before.labels);
      const added = seen.labels.filter((id) => !had.has(id));
      if (added.length) {
        const names = await this.deps.gateway.labelNamesOf(workspaceId, projectId).catch(() => new Map<string, string>());
        const labelsAdded = added.map((id) => names.get(id) ?? '').filter(Boolean);
        if (labelsAdded.length) await this.emit({ workspaceId, kind: 'card_label_added', eventId: `label:${cardId}:${rev}`, card, labelsAdded });
      }
    }
  }

  /** `open` / `won` / `lost` of a stage, from the project's boards (`GET .../boards`, `GET .../columns/kanban`), cached 5 min. */
  async columnKind(workspaceId: string, projectId: string, columnId: string): Promise<'open' | 'won' | 'lost'> {
    const key = `${workspaceId}:${projectId}`;
    let hit = this.columnKinds.get(key);
    if (!hit || Date.now() - hit.at > COLUMNS_TTL_MS || !hit.kinds.has(columnId)) {
      const client = await this.deps.clients.require(workspaceId);
      const kinds = new Map<string, 'open' | 'won' | 'lost'>();
      const boards = await client.listBoards(projectId).catch(() => [] as Array<{ _id: string }>);
      for (const boardId of boards.length ? boards.map((b) => b._id) : [undefined]) {
        const res = await client.kanbanColumns(projectId, boardId).catch(() => null);
        for (const c of res?.columns ?? []) kinds.set(String(c.columnId), stageKindOf(c.columnStatus));
      }
      hit = { at: Date.now(), kinds };
      this.columnKinds.set(key, hit);
    }
    return hit.kinds.get(columnId) ?? 'open';
  }

  // --- CRM: catch-up poll ------------------------------------------------------------------------------------------

  /** First watch of a project: the newest cards become the baseline, so their existing labels are not "added". */
  private async seedProject(workspaceId: string, projectId: string): Promise<void> {
    const _id = `${workspaceId}:${projectId}`;
    if (await WorkerCrmCursorModel.exists({ _id })) return;
    const client = await this.deps.clients.require(workspaceId);
    const now = this.deps.now();
    for (let page = 1; page <= CRM_SEED_PAGES; page += 1) {
      const { cards } = await client.listCardsPage(projectId, { orderBy: 'updatedAt:desc', page, limit: CRM_PAGE });
      for (const c of cards) {
        await WorkerCardSnapshotModel.updateOne(
          { _id: `${workspaceId}:${c._id}` },
          { $setOnInsert: { workspaceId, projectId, column: refId(c.column) || null, labels: (c.labels ?? []).map(refId), rev: 0, at: now } },
          { upsert: true }
        ).catch(() => undefined);
      }
      if (cards.length < CRM_PAGE) break;
    }
    await WorkerCrmCursorModel.updateOne({ _id }, { $setOnInsert: { workspaceId, cursor: now } }, { upsert: true });
  }

  pollCrm(workspaceId: string): Promise<void> {
    const projects = [...(this.crmSockets.get(workspaceId)?.keys() ?? [])];
    return projects.reduce((p, projectId) => p.then(() => this.pollProject(workspaceId, projectId)), Promise.resolve());
  }

  /** Cards updated since the cursor (newest first), through the same snapshots as the socket. Concurrent calls share one run. */
  pollProject(workspaceId: string, projectId: string): Promise<void> {
    const key = `${workspaceId}:${projectId}`;
    const running = this.polling.get(key);
    if (running) return running;
    const run = this.pollProjectOnce(workspaceId, projectId)
      .catch((error) => log.warn('worker.crm_poll_failed', { workspaceId, projectId, error: errMessage(error) }))
      .finally(() => this.polling.delete(key));
    this.polling.set(key, run);
    return run;
  }

  private async pollProjectOnce(workspaceId: string, projectId: string): Promise<void> {
    const _id = `${workspaceId}:${projectId}`;
    const startedAt = this.deps.now();
    const state = await WorkerCrmCursorModel.findById(_id).lean();
    if (!state) return this.seedProject(workspaceId, projectId);
    const since = new Date(new Date(state.cursor).getTime() - CRM_POLL_OVERLAP_MS);
    const client = await this.deps.clients.require(workspaceId);
    for (let page = 1; page <= CRM_POLL_MAX_PAGES; page += 1) {
      const { cards } = await client.listCardsPage(projectId, { orderBy: 'updatedAt:desc', page, limit: CRM_PAGE });
      let older = false;
      for (const c of cards) {
        const updated = date(c.updatedAt);
        if (updated && updated < since) {
          older = true;
          break;
        }
        await this.cardSeen(workspaceId, projectId, String(c._id), {
          source: 'poll',
          createdAt: date(c.createdAt) ?? undefined,
          columnId: refId(c.column) || null,
          boardId: refId(c.board) || null,
          labels: (c.labels ?? []).map(refId),
        });
      }
      if (older || cards.length < CRM_PAGE) break;
    }
    await WorkerCrmCursorModel.updateOne({ _id }, { $set: { cursor: startedAt } });
  }

  // --- conversations -----------------------------------------------------------------------------------------------

  /** The conversation's linked card, when an automation of these kinds needs it (filters, once per lead). */
  private async linkedCard(ref: ConversationRef, automations: TriggerAutomation[]): Promise<TriggerEvent['card'] | undefined> {
    const needs = automations.some((a) => a.trigger.oncePerLead || a.trigger.filters?.projectId || a.trigger.filters?.boardId || a.trigger.filters?.columnIds?.length || a.trigger.filters?.labels?.length);
    if (!needs) return undefined;
    const client = await this.deps.clients.require(ref.workspaceId);
    const row = await client.getInboxConversation(ref.workspaceId, ref.conversationId).catch(() => null);
    const c = row?.conversation;
    if (!c?.linkedEntityId || !c.crmProjectId || (c.linkedEntityType && !['card', 'lead'].includes(c.linkedEntityType))) return undefined;
    return { projectId: String(c.crmProjectId), cardId: String(c.linkedEntityId) };
  }

  /** An inbound message no running automation took: keyword and "any message" triggers. */
  async onInbound(ref: ConversationRef & { messageId: string; text: string }): Promise<void> {
    const automations = await this.has(ref.workspaceId, ['keyword', 'any_message']);
    if (!automations.length) return;
    const conversation = { channel: ref.channel, sessionId: ref.sessionId, conversationId: ref.conversationId };
    const card = await this.linkedCard(ref, automations);
    for (const kind of ['keyword', 'any_message'] as const) {
      if (!automations.some((a) => a.trigger.kind === kind)) continue;
      await this.emit({ workspaceId: ref.workspaceId, kind, eventId: `msg:${ref.channel}:${ref.messageId}`, conversation, ...(card ? { card } : {}), text: ref.text });
    }
  }

  /** `messaging-inbox:conversation-updated` with an assignee. */
  async onAssigned(ref: ConversationRef, userId: string): Promise<void> {
    const automations = await this.has(ref.workspaceId, ['conversation_assigned']);
    if (!automations.length) return;
    const bucket = Math.floor(this.deps.now().getTime() / (10 * 60_000));
    const card = await this.linkedCard(ref, automations);
    await this.emit({
      workspaceId: ref.workspaceId,
      kind: 'conversation_assigned',
      eventId: `assigned:${ref.conversationId}:${userId.toLowerCase()}:${bucket}`,
      conversation: { channel: ref.channel, sessionId: ref.sessionId, conversationId: ref.conversationId },
      ...(card ? { card } : {}),
      assignedUserId: userId,
    });
  }

  /** A conversation seen in `human_handoff` (poll, or the check after an AI reply). The handoff time keys the event. */
  async onHandoff(ref: ConversationRef, conversation: { conversationStateHistory?: Array<{ state?: string; changedAt?: string }> | null; linkedEntityId?: string | null; crmProjectId?: string | null }): Promise<void> {
    const automations = await this.has(ref.workspaceId, ['handed_to_human']);
    if (!automations.length) return;
    const last = [...(conversation.conversationStateHistory ?? [])].reverse().find((h) => h.state === 'human_handoff');
    const at = date(last?.changedAt);
    // Without a handoff time the occurrence cannot be told apart from an older one: not reported.
    if (!at || at < (await this.deps.watchFrom(ref.workspaceId))) return;
    const card = conversation.linkedEntityId && conversation.crmProjectId ? { projectId: String(conversation.crmProjectId), cardId: String(conversation.linkedEntityId) } : undefined;
    await this.emit({
      workspaceId: ref.workspaceId,
      kind: 'handed_to_human',
      eventId: `handoff:${ref.conversationId}:${at.toISOString()}`,
      conversation: { channel: ref.channel, sessionId: ref.sessionId, conversationId: ref.conversationId },
      ...(card ? { card } : {}),
    });
  }

  /** Handoffs (any assignee) and silences, every minute with the safety poll. */
  async pollConversations(workspaceId: string): Promise<void> {
    const automations = await this.has(workspaceId, ['handed_to_human', 'contact_no_reply', 'team_no_reply']);
    if (!automations.length) return;
    const client = await this.deps.clients.require(workspaceId);
    if (automations.some((a) => a.trigger.kind === 'handed_to_human')) {
      const res = await client.listInboxConversations(workspaceId, { conversationState: 'human_handoff', limit: INBOX_PAGE });
      for (const row of res.rows) {
        if (!isChannel(row.channel) || !row.conversation?._id) continue;
        await this.onHandoff({ workspaceId, channel: row.channel, sessionId: String(row.sessionId || row.conversation.sessionId), conversationId: String(row.conversation._id) }, row.conversation);
      }
    }
    const silences = automations.filter((a) => (a.trigger.kind === 'contact_no_reply' || a.trigger.kind === 'team_no_reply') && a.trigger.minutes);
    if (silences.length) await this.pollSilences(workspaceId, client, silences);
  }

  /**
   * "No reply for X": conversations whose last message is ours (contact silent) or the contact's (team silent) and is
   * older than X. Keyed by the conversation and its last message time, so one silence starts one run; a silence that
   * ended more than 6 h past X ago is history.
   */
  private async pollSilences(workspaceId: string, client: UserClient, automations: TriggerAutomation[]): Promise<void> {
    const now = this.deps.now().getTime();
    const watchFrom = (await this.deps.watchFrom(workspaceId)).getTime();
    const minMinutes = Math.min(...automations.map((a) => a.trigger.minutes!));
    const maxMinutes = Math.max(...automations.map((a) => a.trigger.minutes!));
    const oldest = now - maxMinutes * 60_000 - SILENCE_LOOKBACK_MS;
    let cursor: string | undefined;
    for (let page = 0; page < SILENCE_MAX_PAGES; page += 1) {
      const res = await client.listInboxConversations(workspaceId, { cursor, limit: INBOX_PAGE });
      let last = Infinity;
      for (const row of res.rows) {
        const c = row.conversation;
        const at = date(c?.lastMessageAt)?.getTime();
        if (!at || !isChannel(row.channel) || !c?._id) continue;
        last = Math.min(last, at);
        if (at > now - minMinutes * 60_000 || at < Math.max(oldest, watchFrom)) continue;
        const kind = c.lastMessageDirection === 'outbound' ? 'contact_no_reply' : c.lastMessageDirection === 'inbound' ? 'team_no_reply' : null;
        if (!kind) continue;
        const wanted = automations.filter((a) => a.trigger.kind === kind && at <= now - a.trigger.minutes! * 60_000 && at >= now - a.trigger.minutes! * 60_000 - SILENCE_LOOKBACK_MS);
        if (!wanted.length) continue;
        const card = c.linkedEntityId && c.crmProjectId ? { projectId: String(c.crmProjectId), cardId: String(c.linkedEntityId) } : undefined;
        await this.emit({
          workspaceId,
          kind,
          eventId: `silence:${c._id}:${new Date(at).toISOString()}`,
          at: new Date(at),
          conversation: { channel: row.channel, sessionId: String(row.sessionId || c.sessionId), conversationId: String(c._id) },
          ...(card ? { card } : {}),
        });
      }
      if (!res.hasMore || !res.nextCursor || last < oldest) break;
      cursor = res.nextCursor;
    }
  }

  // --- time ----------------------------------------------------------------------------------------------------------

  /** Scheduled and date-field triggers of these workspaces (the worker's `automation-schedules` job, every minute). */
  async tickSchedules(workspaceIds: string[]): Promise<void> {
    for (const workspaceId of workspaceIds) {
      const automations = await this.has(workspaceId, ['scheduled', 'date_field']);
      if (!automations.length) continue;
      const hours = (await this.deps.gateway.businessHours(workspaceId).catch(() => null)) as BusinessHours | null;
      for (const a of automations) {
        await this.tickSchedule(workspaceId, a, hours?.timezone).catch((error) => log.warn('worker.schedule_failed', { workspaceId, automationId: a.id, error: errMessage(error) }));
      }
    }
  }

  /** One automation: due today (local time of the workspace)? Then read the next pages of its leads, capped. */
  async tickSchedule(workspaceId: string, automation: TriggerAutomation, timeZone?: string): Promise<{ read: number; done: boolean } | null> {
    const t = automation.trigger;
    const clock = localClock(this.deps.now(), timeZone);
    const time = t.kind === 'scheduled' ? t.schedule?.time : t.dateField?.time;
    if (!time || !t.projectId || clock.time < time) return null;
    if (t.kind === 'scheduled') {
      if (!t.schedule || !t.columnId) return null;
      if (t.schedule.frequency === 'weekly' && !(t.schedule.weekdays ?? []).includes(clock.weekday)) return null;
    } else if (!t.dateField?.fieldId || !t.boardId) return null;

    const _id = automation.id;
    let state = await AutomationScheduleStateModel.findById(_id).lean();
    if (!state || state.slot !== clock.day) {
      await AutomationScheduleStateModel.updateOne({ _id }, { $set: { workspaceId, slot: clock.day, page: 1, done: false, read: 0, at: this.deps.now() } }, { upsert: true });
      state = await AutomationScheduleStateModel.findById(_id).lean();
    }
    if (!state || state.done) return null;

    const client = await this.deps.clients.require(workspaceId);
    let page = state.page;
    let read = state.read;
    let done = false;
    const query = (n: number) =>
      t.kind === 'scheduled'
        ? { boardId: t.boardId, columnId: t.columnId, orderBy: 'updatedAt:asc', page: n, limit: CRM_PAGE }
        : { boardId: t.boardId, orderBy: 'updatedAt:asc', page: n, limit: CRM_PAGE };
    const target = t.kind === 'date_field' ? addDays(clock.day, -t.dateField!.offsetDays) : null;
    let capped = false;
    for (let i = 0; i < TRIGGER_LIMITS.scheduledPagesPerTick && !capped; i += 1) {
      if (read >= TRIGGER_LIMITS.scheduledLeadsPerPass) {
        done = true;
        log.warn('worker.schedule_capped', { workspaceId, automationId: automation.id, read });
        break;
      }
      const { cards } = await client.listCardsPage(t.projectId, query(page));
      for (const c of cards) {
        if (c.parent) continue;
        if (target && this.dateValue(c, t.dateField!.fieldId) !== target) continue;
        const r = await this.emit({
          workspaceId,
          kind: t.kind,
          eventId: `${t.kind === 'scheduled' ? 'sched' : 'date'}:${clock.day}:${c._id}`,
          automationId: automation.id,
          card: { projectId: t.projectId, cardId: String(c._id), boardId: refId(c.board) || null, columnId: refId(c.column) || null },
        });
        // The automation's per-minute cap: this page is read again next tick (leads already started are deduped).
        if (r?.skipped[automation.id] === 'run_cap') {
          capped = true;
          break;
        }
      }
      if (capped) break;
      read += cards.length;
      page += 1;
      if (cards.length < CRM_PAGE) {
        done = true;
        break;
      }
    }
    await AutomationScheduleStateModel.updateOne({ _id, slot: clock.day }, { $set: { page, read, done, at: this.deps.now() } });
    return { read, done };
  }

  private dateValue(card: JsynqCard, fieldId: string): string | null {
    if (fieldId === 'card:date') return dateOfValue(card.date);
    return dateOfValue(card.customFields?.find((f) => f?.fieldId === fieldId)?.value);
  }
}
