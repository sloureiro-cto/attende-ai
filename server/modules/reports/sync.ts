import 'server-only';
import type { ReportChannel } from '../../../lib/attende/reports/types';
import type { Deps } from '../../deps';
import type { JsynqInboxRow, JsynqMessage, UserClient } from '../../lib/jsynq';
import { JsynqError } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { decideAccess } from '../billing/deriveEntitlements';
import { workspaceClient } from '../billing/enforcement';
import { EntitlementModel } from '../billing/models';
import {
  addDays,
  addLatencySample,
  classifyConversation,
  DAY_MS,
  dayStart,
  emptyLatency,
  normalizeReason,
  REPORT_CHANNELS,
  topReasons,
  utcDayKey,
  type DailyStatsRow,
} from './lib';
import { ReportConversationModel, ReportDailyStatsModel, ReportSyncStateModel, type DayActivity, type IReportConversation, type IReportSyncState } from './models';

/** How far back the first run reads. */
export const BACKFILL_DAYS = 90;
/** Each scan re-reads a little before the previous one ended (clock skew between JSYNQ writes and our cursor). */
const SCAN_OVERLAP_MS = 5 * 60_000;
const INBOX_PAGE = 50;
const MESSAGE_PAGE = 100;
/** One sync reads at most this many messages of a conversation (newest first); older ones are left out (`truncated`). */
export const MAX_MESSAGES_PER_CONVERSATION = 2000;
/** A run never holds a workspace longer than this. */
const LEASE_MS = 3 * 60_000;
/** A conversation counts as a new lead when its card was created this close to it (the reference's window). */
const LEAD_WINDOW_BEFORE_MS = 5 * 60_000;
const LEAD_WINDOW_AFTER_MS = 48 * 3_600_000;
/** The cohort (first response, outcome counts) looks at the creation day and the next one. */
const COHORT_WINDOW_MS = 2 * DAY_MS;
/** Cohort outcomes settle over ~48 h: the last days are rebuilt on every run. */
const RECENT_DAYS = 3;
/** Safety valve: a day slice never loads more conversations than this. */
const MAX_CONVERSATIONS_PER_DAY = 50_000;

export type SyncOptions = {
  /** Wall-clock budget of this call; it stops between conversations and resumes on the next run. */
  budgetMs?: number;
  /** Conversations whose messages are read, per workspace and run. */
  maxConversations?: number;
  /** Minimum gap between two JSYNQ calls of a workspace (rate limit). */
  callGapMs?: number;
  now?: () => Date;
};

export type WorkspaceSyncResult = { conversations: number; messages: number; days: number; done: boolean; skipped?: 'locked' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const date = (v: unknown): Date | null => {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** One JSYNQ call at a time per workspace, spaced by `gapMs`. */
function pacer(gapMs: number) {
  let last = 0;
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const wait = last + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      last = Date.now();
    }
  };
}

/** What one message adds to the counters (ported from the reference aggregator's message grouping). */
export function classifyMessage(m: JsynqMessage): 'inbound' | 'ai' | 'aiFailed' | 'automation' | 'human' | null {
  const failed = m.status === 'failed';
  if (m.direction === 'inbound') return m.senderType === 'contact' ? 'inbound' : null;
  if (m.direction !== 'outbound') return null;
  if (m.senderType === 'user') return failed ? null : 'human';
  if (m.senderType === 'agent') {
    // An agent message without an execution, or one JSYNQ labels as a template rule, is an automation.
    const ai = !!m.agentExecutionId && m.senderAgent?.source !== 'inbound_rule';
    if (ai) return failed ? 'aiFailed' : 'ai';
    return failed ? null : 'automation';
  }
  return null;
}

type Ctx = { client: UserClient; workspaceId: string; call: ReturnType<typeof pacer>; now: Date; state: IReportSyncState; bindingAgents: Map<string, string> };

/** Messages newer than the conversation's sync edge, newest first, at most MAX_MESSAGES_PER_CONVERSATION. */
async function newMessages(ctx: Ctx, row: JsynqInboxRow, stopAt: Date, edgeIds: Set<string>): Promise<{ messages: JsynqMessage[]; truncated: boolean }> {
  const out: JsynqMessage[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let before: string | undefined;
  for (;;) {
    const page = await ctx.call(() =>
      ctx.client.listConversationMessages(row.channel, row.sessionId || String(row.conversation.sessionId ?? ''), String(row.conversation._id), { limit: MESSAGE_PAGE, offset, before })
    );
    let reachedEdge = false;
    for (const m of page) {
      const at = date(m.createdAt);
      if (!at) continue;
      if (at < stopAt || (at.getTime() === stopAt.getTime() && edgeIds.has(String(m._id)))) {
        reachedEdge = true;
        continue;
      }
      if (seen.has(String(m._id))) continue;
      seen.add(String(m._id));
      out.push(m);
      if (out.length >= MAX_MESSAGES_PER_CONVERSATION) return { messages: out, truncated: true };
    }
    if (reachedEdge || page.length < MESSAGE_PAGE) return { messages: out, truncated: false };
    offset += page.length;
    before = page[page.length - 1]?.createdAt ?? undefined;
  }
}

/** Reads one conversation's news and folds it into its `report_conversations` summary. Returns the days it touched. */
async function syncConversation(ctx: Ctx, row: JsynqInboxRow): Promise<{ days: Set<string>; messages: number; fetched: boolean }> {
  const conv = row.conversation;
  const channel = row.channel as ReportChannel;
  const key = { workspaceId: ctx.workspaceId, channel, conversationId: String(conv._id) };
  const existing = await ReportConversationModel.findOne(key).lean<IReportConversation | null>();
  const createdAt = date(conv.createdAt) ?? existing?.createdAt ?? date(conv.lastMessageAt) ?? ctx.now;
  const lastMessageAt = date(conv.lastMessageAt);
  const touched = new Set<string>();

  const handoffs = new Map((existing?.handoffs ?? []).map((h) => [new Date(h.at).toISOString(), h]));
  for (const h of conv.conversationStateHistory ?? []) {
    const at = date(h.changedAt);
    if (h.state !== 'human_handoff' || !at || handoffs.has(at.toISOString())) continue;
    const entry = { at, day: utcDayKey(at), reason: normalizeReason(h.reason) };
    handoffs.set(at.toISOString(), entry);
    touched.add(entry.day);
  }

  const doc: IReportConversation = existing
    ? { ...existing, days: existing.days.map((d) => ({ ...d })) }
    : {
        ...key,
        sessionId: row.sessionId || String(conv.sessionId ?? ''),
        agentId: null,
        createdAt,
        createdDay: utcDayKey(createdAt),
        lastMessageAt: null,
        lastMessageDirection: null,
        syncedUntil: null,
        syncedIdsAtEdge: [],
        firstInboundAt: null,
        firstAiAt: null,
        firstHumanAt: null,
        cohortAiReplies: 0,
        cohortHumanReplies: 0,
        handedOff: false,
        handoffs: [],
        days: [],
        activeDays: [],
        linkedCardId: null,
        leadChecked: false,
        leadCreated: false,
        truncated: false,
      };
  if (!existing) touched.add(doc.createdDay);

  const bindingAgent = conv.automationBindingId ? ctx.bindingAgents.get(String(conv.automationBindingId)) : undefined;
  doc.agentId = bindingAgent ?? (conv.activeAgent?._id ? String(conv.activeAgent._id) : null) ?? existing?.agentId ?? null;
  doc.handoffs = [...handoffs.values()].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  doc.handedOff = doc.handedOff || doc.handoffs.length > 0;
  doc.lastMessageDirection = conv.lastMessageDirection ?? doc.lastMessageDirection;

  let read = 0;
  // `lastMessageAt` as of the previous sync: unchanged means nothing new (JSYNQ can bump it past the newest message
  // it lists, so the message edge is not compared).
  const behind = !existing?.lastMessageAt || (lastMessageAt !== null && lastMessageAt > new Date(existing.lastMessageAt));
  if (behind) {
    const stopAt = doc.syncedUntil ? new Date(doc.syncedUntil) : ctx.state.backfillFrom;
    const { messages, truncated } = await newMessages(ctx, row, stopAt, new Set(doc.syncedIdsAtEdge));
    read = messages.length;
    doc.truncated = doc.truncated || truncated;
    const cohortStart = dayStart(doc.createdDay).getTime();
    const byDay = new Map(doc.days.map((d) => [d.day, d]));
    let edge = doc.syncedUntil ? new Date(doc.syncedUntil) : null;
    let edgeIds = new Set(doc.syncedIdsAtEdge);
    for (const m of messages) {
      const at = date(m.createdAt)!;
      const day = utcDayKey(at);
      const kind = classifyMessage(m);
      let d = byDay.get(day);
      if (!d) {
        d = { day, inbound: 0, ai: 0, automation: 0, human: 0, aiFailed: 0 } satisfies DayActivity;
        byDay.set(day, d);
      }
      touched.add(day);
      if (kind) d[kind === 'aiFailed' ? 'aiFailed' : kind] += 1;
      const inCohort = at.getTime() >= cohortStart && at.getTime() < cohortStart + COHORT_WINDOW_MS;
      if (inCohort) {
        const earlier = (prev: Date | null) => !prev || at < new Date(prev);
        if (kind === 'inbound' && earlier(doc.firstInboundAt)) doc.firstInboundAt = at;
        if (kind === 'ai') {
          doc.cohortAiReplies += 1;
          if (earlier(doc.firstAiAt)) doc.firstAiAt = at;
        }
        if (kind === 'human') {
          doc.cohortHumanReplies += 1;
          if (earlier(doc.firstHumanAt)) doc.firstHumanAt = at;
        }
      }
      if (!edge || at > edge) {
        edge = at;
        edgeIds = new Set([String(m._id)]);
      } else if (at.getTime() === edge.getTime()) edgeIds.add(String(m._id));
    }
    doc.days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
    doc.activeDays = doc.days.map((d) => d.day);
    doc.syncedUntil = edge ?? lastMessageAt ?? doc.syncedUntil;
    doc.syncedIdsAtEdge = [...edgeIds].slice(0, 50);
  }
  doc.lastMessageAt = lastMessageAt ?? doc.lastMessageAt;

  // A lead: the conversation's CRM card was created with it. One card read per linked conversation, once.
  const cardId = conv.linkedEntityType === 'card' && conv.linkedEntityId ? String(conv.linkedEntityId) : null;
  if (cardId && (!doc.leadChecked || doc.linkedCardId !== cardId) && conv.crmProjectId) {
    try {
      const card = await ctx.call(() => ctx.client.getCard(String(conv.crmProjectId), cardId));
      const cardAt = date(card?.createdAt);
      const t0 = new Date(doc.createdAt).getTime();
      doc.leadCreated = !!cardAt && cardAt.getTime() >= t0 - LEAD_WINDOW_BEFORE_MS && cardAt.getTime() <= t0 + LEAD_WINDOW_AFTER_MS;
      doc.leadChecked = true;
      doc.linkedCardId = cardId;
      touched.add(doc.createdDay);
    } catch (error) {
      // A card the owner cannot read (or that is gone) never becomes a lead; anything else is retried next time.
      if (error instanceof JsynqError && (error.status === 403 || error.status === 404)) {
        doc.leadChecked = true;
        doc.linkedCardId = cardId;
      }
    }
  }

  const { _id: _ignored, updatedAt: _u, ...fields } = doc as IReportConversation & { _id?: unknown };
  await ReportConversationModel.updateOne(key, { $set: fields }, { upsert: true });
  return { days: touched, messages: read, fetched: behind };
}

// --- daily rows -------------------------------------------------------------------------------------------

type MutableRow = Omit<DailyStatsRow, 'handoffReasons'> & { reasonCounts: Map<string, number> };
const emptyRow = (day: string, channel: ReportChannel, agentId: string | null): MutableRow => ({
  day,
  channel,
  agentId,
  inboundMessages: 0,
  aiReplies: 0,
  automationReplies: 0,
  humanReplies: 0,
  aiFailed: 0,
  conversationsActive: 0,
  conversationsStarted: 0,
  handoffEvents: 0,
  outcomeResolvedByAi: 0,
  outcomeHandedOff: 0,
  outcomeHumanHandled: 0,
  outcomeAbandoned: 0,
  outcomeOpen: 0,
  leadsCreated: 0,
  frAi: emptyLatency(),
  frHuman: emptyLatency(),
  reasonCounts: new Map(),
});

const OUTCOME_FIELD = {
  resolved_by_ai: 'outcomeResolvedByAi',
  handed_off: 'outcomeHandedOff',
  human_handled: 'outcomeHumanHandled',
  abandoned: 'outcomeAbandoned',
  open: 'outcomeOpen',
} as const;

/**
 * The rows of one (workspace, UTC day) from the conversation summaries, with the reference's attribution: activity
 * (inbound, human, automation, active conversations) on the "no agent" row, AI replies on the conversation's agent,
 * cohort metrics on the agent that answered (null when no AI replied), handoffs on the conversation's agent.
 */
export function buildDayRows(day: string, conversations: IReportConversation[], now: Date): DailyStatsRow[] {
  const rows = new Map<string, MutableRow>();
  const row = (channel: ReportChannel, agentId: string | null) => {
    const k = `${channel}:${agentId ?? 'null'}`;
    let r = rows.get(k);
    if (!r) rows.set(k, (r = emptyRow(day, channel, agentId)));
    return r;
  };
  for (const c of conversations) {
    const act = c.days.find((d) => d.day === day);
    if (act) {
      const none = row(c.channel, null);
      none.inboundMessages += act.inbound;
      none.humanReplies += act.human;
      none.automationReplies += act.automation;
      none.conversationsActive += 1;
      if (act.ai || act.aiFailed) {
        const agent = row(c.channel, c.agentId);
        agent.aiReplies += act.ai;
        agent.aiFailed += act.aiFailed;
      }
    }
    if (c.createdDay === day) {
      const r = row(c.channel, c.firstAiAt ? c.agentId : null);
      r.conversationsStarted += 1;
      const outcome = classifyConversation(
        {
          handedOff: c.handedOff,
          aiReplyCount: c.cohortAiReplies,
          humanReplyCount: c.cohortHumanReplies,
          lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : null,
          lastMessageDirection: c.lastMessageDirection,
          createdAt: new Date(c.createdAt),
        },
        now
      );
      r[OUTCOME_FIELD[outcome]] += 1;
      if (c.firstInboundAt) {
        const inbound = new Date(c.firstInboundAt).getTime();
        if (c.firstAiAt) addLatencySample(r.frAi, new Date(c.firstAiAt).getTime() - inbound);
        if (c.firstHumanAt) addLatencySample(r.frHuman, new Date(c.firstHumanAt).getTime() - inbound);
      }
      if (c.leadCreated) r.leadsCreated += 1;
    }
    const handoffs = c.handoffs.filter((h) => h.day === day);
    if (handoffs.length) {
      const everAi = c.days.some((d) => d.ai > 0);
      const r = row(c.channel, everAi ? c.agentId : null);
      for (const h of handoffs) {
        r.handoffEvents += 1;
        r.reasonCounts.set(h.reason, (r.reasonCounts.get(h.reason) ?? 0) + 1);
      }
    }
  }
  return [...rows.values()].map(({ reasonCounts, ...rest }) => ({ ...rest, handoffReasons: topReasons(reasonCounts) }));
}

/** Rewrites the (workspace, day) slice of `report_daily_stats`. Idempotent. */
export async function rebuildDay(workspaceId: string, day: string, now: Date): Promise<number> {
  const conversations = await ReportConversationModel.find({ workspaceId, $or: [{ activeDays: day }, { createdDay: day }, { 'handoffs.day': day }] })
    .limit(MAX_CONVERSATIONS_PER_DAY)
    .lean<IReportConversation[]>();
  const rows = buildDayRows(day, conversations, now);
  const dayDate = dayStart(day);
  const ops: Parameters<typeof ReportDailyStatsModel.bulkWrite>[0] = rows.map((r) => ({
    replaceOne: {
      filter: { workspaceId, day, channel: r.channel, agentId: r.agentId },
      replacement: { ...r, workspaceId, dayDate, computedAt: now },
      upsert: true,
    },
  }));
  for (const channel of REPORT_CHANNELS) {
    const keep = rows.filter((r) => r.channel === channel).map((r) => r.agentId);
    ops.push({ deleteMany: { filter: { workspaceId, day, channel, agentId: { $nin: keep } } } });
  }
  await ReportDailyStatsModel.bulkWrite(ops, { ordered: true });
  return rows.length;
}

// --- one workspace ------------------------------------------------------------------------------------------

async function lease(workspaceId: string, now: Date): Promise<IReportSyncState | null> {
  try {
    await ReportSyncStateModel.updateOne(
      { workspaceId },
      { $setOnInsert: { workspaceId, backfillFrom: new Date(now.getTime() - BACKFILL_DAYS * DAY_MS), backfillDoneAt: null, cursor: null, scan: null } },
      { upsert: true }
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  return ReportSyncStateModel.findOneAndUpdate(
    { workspaceId, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    { $set: { lockedUntil: new Date(now.getTime() + LEASE_MS) } },
    { new: true }
  ).lean<IReportSyncState | null>();
}

/**
 * Pulls what changed in a workspace since its cursor and refreshes the daily rows it touched.
 *
 * A scan reads the unified inbox (`GET /api/workspaces/:w/messaging/inbox/conversations`, every channel,
 * `lastMessageAt desc`) until it reaches the cursor (the first scan: 90 days back). For each conversation with news it
 * reads the new messages (`.../conversations/:id/messages`, newest first, until the last one already counted). A scan
 * can span several runs: the inbox cursor reached is saved after every page, and re-reading a conversation never
 * counts a message twice. Callable from the cron route and, later, from the worker.
 */
export async function syncWorkspaceReports(client: UserClient, workspaceId: string, opts: SyncOptions = {}): Promise<WorkspaceSyncResult> {
  const clock = opts.now ?? (() => new Date());
  const started = Date.now();
  const budgetMs = opts.budgetMs ?? 40_000;
  const maxConversations = opts.maxConversations ?? 300;
  const now = clock();
  const state = await lease(workspaceId, now);
  if (!state) return { conversations: 0, messages: 0, days: 0, done: false, skipped: 'locked' };

  const call = pacer(opts.callGapMs ?? 100);
  const touched = new Set<string>();
  let conversations = 0;
  let messages = 0;
  let done = false;
  let error: unknown = null;
  try {
    const scan = state.scan ?? {
      startedAt: now,
      until: state.cursor ? new Date(new Date(state.cursor).getTime() - SCAN_OVERLAP_MS) : new Date(state.backfillFrom),
      inboxCursor: null,
    };
    await ReportSyncStateModel.updateOne({ workspaceId }, { $set: { scan } });
    const bindings = await call(() => client.listBindings()).catch(() => []);
    const ctx: Ctx = { client, workspaceId, call, now, state, bindingAgents: new Map(bindings.filter((b) => b.agentId).map((b) => [String(b._id), String(b.agentId)])) };
    const until = new Date(scan.until);

    let budgetLeft = true;
    while (budgetLeft) {
      const page = await call(() => client.listInboxConversations(workspaceId, { cursor: scan.inboxCursor ?? undefined, limit: INBOX_PAGE }));
      for (const row of page.rows) {
        if (Date.now() - started > budgetMs || conversations >= maxConversations) {
          budgetLeft = false;
          break;
        }
        const at = date(row.conversation?.lastMessageAt);
        if (!row.conversation?._id || !at || at < until || !(REPORT_CHANNELS as readonly string[]).includes(row.channel)) continue;
        const result = await syncConversation(ctx, row);
        result.days.forEach((d) => touched.add(d));
        // Only conversations whose messages were read count: one already up to date costs no JSYNQ call, so a page
        // re-read after a cut-short run always gets past what the previous run did.
        if (result.fetched) conversations += 1;
        messages += result.messages;
      }
      if (!budgetLeft) break; // the page is read again next run; already counted messages are skipped
      // The first page pins SLA rows on top; the rest is `lastMessageAt desc`, so the last row tells where we are.
      const last = date(page.rows[page.rows.length - 1]?.conversation?.lastMessageAt);
      if (!page.hasMore || !page.nextCursor || !last || last < until) {
        done = true;
        await ReportSyncStateModel.updateOne(
          { workspaceId },
          { $set: { cursor: scan.startedAt, scan: null, lastSyncAt: clock(), ...(state.backfillDoneAt ? {} : { backfillDoneAt: clock() }) } }
        );
        break;
      }
      scan.inboxCursor = page.nextCursor;
      await ReportSyncStateModel.updateOne({ workspaceId }, { $set: { 'scan.inboxCursor': page.nextCursor } });
    }

    const today = utcDayKey(clock());
    for (let i = 0; i < RECENT_DAYS; i += 1) touched.add(addDays(today, -i));
    const oldest = utcDayKey(new Date(state.backfillFrom));
    const days = [...touched].filter((d) => d >= oldest && d <= today).sort();
    for (const day of days) await rebuildDay(workspaceId, day, clock());
    return { conversations, messages, days: days.length, done };
  } catch (e) {
    error = e;
    throw e;
  } finally {
    await ReportSyncStateModel.updateOne(
      { workspaceId },
      { $set: { lockedUntil: null, lastRunAt: clock(), lastError: error ? errMessage(error).slice(0, 300) : null } }
    );
  }
}

// --- every workspace -------------------------------------------------------------------------------------

/**
 * One cron run: every Attende workspace with an active plan, least recently synced first, until the budget is spent.
 * JSYNQ is called as the workspace owner (server-minted token): JSYNQ applies that member's session access.
 */
export async function runReportsSync(deps: Pick<Deps, 'user' | 'now'>, opts: SyncOptions = {}): Promise<Record<string, number>> {
  const started = Date.now();
  const budgetMs = opts.budgetMs ?? 45_000;
  const entitlements = await EntitlementModel.find({}).lean();
  const allowed = entitlements.filter((e) => decideAccess(e).allowed).map((e) => e.workspaceId);
  const states = new Map((await ReportSyncStateModel.find({ workspaceId: { $in: allowed } }).select('workspaceId lastRunAt').lean()).map((s) => [s.workspaceId, s.lastRunAt?.getTime() ?? 0]));
  const order = allowed.sort((a, b) => (states.get(a) ?? 0) - (states.get(b) ?? 0));
  const totals = { workspaces: 0, conversations: 0, messages: 0, failed: 0, skipped: 0 };
  for (const workspaceId of order) {
    const left = budgetMs - (Date.now() - started);
    if (left < 5_000) break;
    const client = await workspaceClient(deps, workspaceId);
    if (!client) {
      totals.skipped += 1;
      continue;
    }
    try {
      const r = await syncWorkspaceReports(client, workspaceId, { ...opts, budgetMs: left - 2_000, now: opts.now ?? deps.now });
      if (r.skipped) totals.skipped += 1;
      else totals.workspaces += 1;
      totals.conversations += r.conversations;
      totals.messages += r.messages;
    } catch (error) {
      totals.failed += 1;
      log.warn('reports.sync_failed', { workspaceId, error: errMessage(error) });
    }
  }
  return totals;
}
