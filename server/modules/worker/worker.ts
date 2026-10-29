import 'server-only';
import { randomUUID } from 'crypto';
import type { Deps } from '../../deps';
import { startJobs, type Job } from '../../lib/cron';
import { acquireLease, releaseLease, renewLease } from '../../lib/lease';
import { errMessage, log } from '../../lib/logger';
import { createAutomationsRuntime, type AutomationsRuntime } from '../automations/runtime/factory';
import { decideAccess } from '../billing/deriveEntitlements';
import { EntitlementModel } from '../billing/models';
import { BillingService } from '../billing/service';
import { recordAiReply } from '../billing/usage';
import { runReportsJob } from '../reports/job';
import { runReportsSync } from '../reports/sync';
import { WorkspaceClients } from './clients';
import { ConversationSync, MAX_MESSAGE_AGE_MS } from './conversationSync';
import { isChannel, type ConversationRef, type WorkerEvent } from './events';
import { JsynqConversationGateway } from './gateway';
import { HandoffAssigner } from './handoffAssignee';
import { WorkerWorkspaceModel } from './models';
import { INBOX_EVENTS, InboxSocket, type InboxSocketMessage } from './socket';

export const WORKER_LEASE = 'worker';
/** The poll re-reads a little before its cursor (clock skew between JSYNQ writes and ours). */
const POLL_OVERLAP_MS = 2 * 60_000;
const POLL_MAX_PAGES = 10;
const INBOX_PAGE = 50;

export type WorkerOptions = {
  deps: Pick<Deps, 'user' | 'now'>;
  /** JSYNQ websocket endpoint (`wss://<jsynq>/ws`). */
  wsUrl: string;
  /** The advanced automations runtime (`ADVANCED_AUTOMATIONS_RUNTIME_ENABLED`, on by default in the worker). */
  runtimeEnabled: boolean;
  /** Run `runReportsSync` every `reportsMs` (shared `job:reports` lease with the Vercel cron). */
  reportsEnabled?: boolean;
  holder?: string;
  intervals?: Partial<{
    leaseTtlMs: number;
    leaseRenewMs: number;
    workspacesMs: number;
    pollMs: number;
    timersMs: number;
    reportsMs: number;
    billingMs: number;
    socketRefreshMs: number;
    socketMinBackoffMs: number;
    socketMaxBackoffMs: number;
  }>;
  /** Test seam: sees every normalized event after it was handled. */
  onEvent?: (event: WorkerEvent) => void;
};

const DEFAULTS = {
  leaseTtlMs: 30_000,
  leaseRenewMs: 10_000,
  workspacesMs: 60_000,
  pollMs: 60_000,
  timersMs: 15_000,
  reportsMs: 10 * 60_000,
  billingMs: 5 * 60_000,
  socketRefreshMs: 45 * 60_000,
  socketMinBackoffMs: 1000,
  socketMaxBackoffMs: 30_000,
};

type Watched = { socket: InboxSocket; polling: Promise<void> | null };

/**
 * The always-on worker. Exactly one instance works at a time (Mongo lease `worker`, 30 s, renewed every 10 s); any
 * other instance stays a standby and takes over within ~30 s if the active one dies.
 *
 * While active, for every Attende workspace with an active or trialing plan (re-read every minute):
 * - listens to `messaging-inbox:<workspaceId>` on the JSYNQ websocket as the workspace owner;
 * - runs a safety poll every minute (and after every reconnect) over the conversations whose `lastMessageAt` moved
 *   since the last poll, plus the unassigned `human_handoff` conversations;
 * - turns both into one event stream (`WorkerEvent`), deduplicated per message id, and feeds it to the automations
 *   runtime (inbound messages), the AI-reply quota (`recordAiReply`) and the handoff assignee ("quem assume");
 * - ticks the automation timers every 15 s and the reports sync every 10 min;
 * - re-reads the JSYNQ subscriptions every 5 min (`GET /api/subscriptions/me`): trial over, canceled, back.
 */
export class Worker {
  readonly holder: string;
  readonly clients: WorkspaceClients;
  readonly sync: ConversationSync;
  readonly assigner: HandoffAssigner;
  readonly gateway: JsynqConversationGateway;
  readonly automations: AutomationsRuntime | null;
  private readonly iv: typeof DEFAULTS;
  private watched = new Map<string, Watched>();
  private watchFromCache = new Map<string, Date>();
  private stopJobs: (() => Promise<void>) | null = null;
  private leaseTimer: NodeJS.Timeout | null = null;
  private leaseTick: Promise<void> | null = null;
  private stopping = false;
  leader = false;
  startedAt = new Date();
  lastPollAt: Date | null = null;
  eventsHandled = 0;

  constructor(private readonly opts: WorkerOptions) {
    this.holder = opts.holder ?? `worker:${randomUUID()}`;
    this.iv = { ...DEFAULTS, ...opts.intervals };
    this.clients = new WorkspaceClients(opts.deps);
    this.gateway = new JsynqConversationGateway(this.clients, opts.deps);
    this.automations = opts.runtimeEnabled ? createAutomationsRuntime({ gateway: this.gateway, now: opts.deps.now }) : null;
    this.assigner = new HandoffAssigner(this.clients);
    this.sync = new ConversationSync({
      clients: this.clients,
      now: opts.deps.now,
      watchFrom: (w) => this.watchFrom(w),
      emit: (e) => this.handle(e),
    });
  }

  // --- lifecycle --------------------------------------------------------------------------------------------------

  /** Starts competing for the lease; works while it holds it. */
  start(): void {
    this.stopping = false;
    const tick = () => {
      if (this.leaseTick) return;
      this.leaseTick = this.leaseStep()
        .catch((error) => log.warn('worker.lease_failed', { error: errMessage(error) }))
        .finally(() => {
          this.leaseTick = null;
        });
    };
    tick();
    this.leaseTimer = setInterval(tick, this.iv.leaseRenewMs);
  }

  /** Graceful stop: no new work, sockets closed, in-flight syncs and jobs finish, the lease is released. */
  async stop(): Promise<void> {
    this.stopping = true;
    if (this.leaseTimer) clearInterval(this.leaseTimer);
    this.leaseTimer = null;
    await this.leaseTick;
    await this.stopWork();
    await releaseLease(WORKER_LEASE, this.holder).catch(() => undefined);
    log.info('worker.stopped', { holder: this.holder });
  }

  private async leaseStep(): Promise<void> {
    if (this.stopping) return;
    // Wall clock on purpose: the lease is shared with other processes, never with a test's or a replay's clock.
    const now = new Date();
    if (this.leader) {
      if (await renewLease(WORKER_LEASE, this.holder, this.iv.leaseTtlMs, now)) return;
      log.warn('worker.lease_lost', { holder: this.holder });
      await this.stopWork();
      return;
    }
    if (await acquireLease(WORKER_LEASE, this.holder, this.iv.leaseTtlMs, { now })) {
      log.info('worker.lease_acquired', { holder: this.holder });
      await this.startWork();
    }
  }

  private async startWork(): Promise<void> {
    if (this.leader || this.stopping) return;
    this.leader = true;
    await this.refreshWorkspaces().catch((error) => log.warn('worker.workspaces_failed', { error: errMessage(error) }));
    const jobs: Job[] = [
      { name: 'worker-workspaces', everyMs: this.iv.workspacesMs, run: () => this.refreshWorkspaces() },
      { name: 'worker-poll', everyMs: this.iv.pollMs, run: () => this.pollAll() },
      // Re-reads each workspace's JSYNQ subscription (`GET /api/subscriptions/me`) and pauses or resumes the agents.
      { name: 'worker-billing', everyMs: this.iv.billingMs, run: () => new BillingService(this.opts.deps).reconcile({ staleMs: this.iv.billingMs }).then(() => undefined) },
    ];
    if (this.automations) jobs.push(...this.automations.jobs.map((j) => ({ ...j, everyMs: this.iv.timersMs })));
    if (this.opts.reportsEnabled !== false) {
      jobs.push({ name: 'worker-reports', everyMs: this.iv.reportsMs, run: () => runReportsJob(this.opts.deps, 'worker', (d) => runReportsSync(d, { budgetMs: 4 * 60_000 })) });
    }
    this.stopJobs = startJobs(jobs);
  }

  private async stopWork(): Promise<void> {
    if (!this.leader) return;
    this.leader = false;
    const stop = this.stopJobs;
    this.stopJobs = null;
    for (const w of this.watched.values()) w.socket.stop();
    await stop?.();
    await Promise.allSettled([...this.watched.values()].map((w) => w.polling));
    this.watched.clear();
    await this.sync.idle();
  }

  status() {
    const sockets = [...this.watched.values()].map((w) => w.socket);
    return {
      holder: this.holder,
      leader: this.leader,
      runtime: !!this.automations,
      workspaces: this.watched.size,
      socketsConnected: sockets.filter((s) => s.connected).length,
      lastPollAt: this.lastPollAt?.toISOString() ?? null,
      eventsHandled: this.eventsHandled,
      startedAt: this.startedAt.toISOString(),
    };
  }

  // --- workspaces -------------------------------------------------------------------------------------------------

  /** Attende workspaces whose plan is active or trialing (and not expired). */
  async activeWorkspaces(): Promise<string[]> {
    const now = this.opts.deps.now();
    const rows = await EntitlementModel.find({ status: { $in: ['active', 'trialing', 'past_due'] } }).lean();
    return rows.filter((e) => decideAccess(e, now).allowed).map((e) => e.workspaceId);
  }

  async refreshWorkspaces(): Promise<void> {
    if (!this.leader) return;
    const wanted = new Set(await this.activeWorkspaces());
    for (const [workspaceId, w] of this.watched) {
      if (wanted.has(workspaceId)) continue;
      w.socket.stop();
      this.watched.delete(workspaceId);
      this.clients.forget(workspaceId);
      log.info('worker.workspace_removed', { workspaceId });
    }
    for (const workspaceId of wanted) {
      if (this.watched.has(workspaceId) || !this.leader) continue;
      await this.watchFrom(workspaceId);
      const socket = new InboxSocket({
        url: this.opts.wsUrl,
        workspaceId,
        token: () => this.clients.socketToken(workspaceId),
        onMessage: (m) => this.onSocketMessage(workspaceId, m),
        // Whatever happened while the socket was down is caught up at once.
        onOpen: () => void this.pollWorkspace(workspaceId),
        refreshMs: this.iv.socketRefreshMs,
        minBackoffMs: this.iv.socketMinBackoffMs,
        maxBackoffMs: this.iv.socketMaxBackoffMs,
      });
      this.watched.set(workspaceId, { socket, polling: null });
      socket.start();
      log.info('worker.workspace_added', { workspaceId });
    }
  }

  socketOf(workspaceId: string): InboxSocket | undefined {
    return this.watched.get(workspaceId)?.socket;
  }

  private async watchFrom(workspaceId: string): Promise<Date> {
    const hit = this.watchFromCache.get(workspaceId);
    if (hit) return hit;
    const now = this.opts.deps.now();
    const row = await WorkerWorkspaceModel.findOneAndUpdate(
      { workspaceId },
      { $setOnInsert: { workspaceId, watchFrom: now, pollCursor: now } },
      { upsert: true, new: true }
    ).lean();
    const at = new Date(row!.watchFrom);
    this.watchFromCache.set(workspaceId, at);
    return at;
  }

  // --- websocket --------------------------------------------------------------------------------------------------

  private onSocketMessage(workspaceId: string, m: InboxSocketMessage): void {
    const p = m.payload;
    if (String(p.workspaceId ?? workspaceId) !== workspaceId) return;
    if (m.type !== INBOX_EVENTS.newInbound && m.type !== INBOX_EVENTS.lastMessageUpdated && m.type !== INBOX_EVENTS.conversationUpdated) return;
    if (!isChannel(p.channel) || typeof p.sessionId !== 'string' || typeof p.conversationId !== 'string') return;
    const ref: ConversationRef = { workspaceId, channel: p.channel, sessionId: p.sessionId, conversationId: p.conversationId };
    void WorkerWorkspaceModel.updateOne({ workspaceId }, { $set: { lastEventAt: this.opts.deps.now() } }).catch(() => undefined);
    if (m.type === INBOX_EVENTS.conversationUpdated) {
      // Assignment changed: only a conversation still unassigned can need the handoff assignee.
      if (p.assignedUserId == null) void this.checkConversation(ref);
      return;
    }
    void this.sync.sync(ref);
  }

  // --- safety poll ------------------------------------------------------------------------------------------------

  async pollAll(): Promise<void> {
    for (const workspaceId of [...this.watched.keys()]) {
      if (!this.leader) return;
      await this.pollWorkspace(workspaceId);
    }
    this.lastPollAt = this.opts.deps.now();
  }

  /** One workspace's catch-up; concurrent calls share the run in progress. */
  pollWorkspace(workspaceId: string): Promise<void> {
    const w = this.watched.get(workspaceId);
    if (!w) return Promise.resolve();
    w.polling ??= this.pollOnce(workspaceId)
      .catch(async (error) => {
        log.warn('worker.poll_failed', { workspaceId, error: errMessage(error) });
        await WorkerWorkspaceModel.updateOne({ workspaceId }, { $set: { lastPollError: errMessage(error).slice(0, 300) } }).catch(() => undefined);
      })
      .finally(() => {
        const cur = this.watched.get(workspaceId);
        if (cur) cur.polling = null;
      });
    return w.polling;
  }

  private async pollOnce(workspaceId: string): Promise<void> {
    const startedAt = this.opts.deps.now();
    const state = await WorkerWorkspaceModel.findOne({ workspaceId }).lean();
    const cursor = state?.pollCursor ? new Date(state.pollCursor) : await this.watchFrom(workspaceId);
    const since = new Date(Math.max(cursor.getTime() - POLL_OVERLAP_MS, startedAt.getTime() - MAX_MESSAGE_AGE_MS));
    const client = await this.clients.require(workspaceId);

    let pageCursor: string | undefined;
    for (let page = 0; page < POLL_MAX_PAGES; page += 1) {
      const res = await client.listInboxConversations(workspaceId, { cursor: pageCursor, limit: INBOX_PAGE });
      for (const row of res.rows) {
        const at = row.conversation?.lastMessageAt ? new Date(row.conversation.lastMessageAt) : null;
        if (!at || at < since || !isChannel(row.channel) || !row.conversation?._id) continue;
        await this.sync.sync({ workspaceId, channel: row.channel, sessionId: String(row.sessionId || row.conversation.sessionId), conversationId: String(row.conversation._id) });
      }
      // The first page may pin SLA rows on top; the rest is `lastMessageAt desc`, so the last row tells where we are.
      const last = res.rows[res.rows.length - 1]?.conversation?.lastMessageAt;
      if (!res.hasMore || !res.nextCursor || !last || new Date(last) < since) break;
      pageCursor = res.nextCursor;
    }

    // Conversations handed to people without an assignee (JSYNQ sends no websocket event for a state change).
    const handoffs = await client.listInboxConversations(workspaceId, { conversationState: 'human_handoff', assignee: 'unassigned', limit: INBOX_PAGE });
    for (const row of handoffs.rows) {
      if (!isChannel(row.channel) || !row.conversation?._id) continue;
      const ref = { workspaceId, channel: row.channel, sessionId: String(row.sessionId || row.conversation.sessionId), conversationId: String(row.conversation._id) };
      await this.handle({ type: 'conversation_state', ...ref, state: row.conversation.conversationState ?? null, assignedUserId: row.conversation.assignedUserId ?? null, conversation: row.conversation });
    }
    await WorkerWorkspaceModel.updateOne({ workspaceId }, { $set: { pollCursor: startedAt, lastPollAt: this.opts.deps.now(), lastPollError: null } });
  }

  /** Reads one conversation's state (inbox deep link) and emits it: after an AI reply or an unassignment. */
  async checkConversation(target: ConversationRef): Promise<void> {
    const ref: ConversationRef = { workspaceId: target.workspaceId, channel: target.channel, sessionId: target.sessionId, conversationId: target.conversationId };
    try {
      const client = await this.clients.require(ref.workspaceId);
      const row = await client.getInboxConversation(ref.workspaceId, ref.conversationId);
      if (!row) return;
      await this.handle({ type: 'conversation_state', ...ref, state: row.conversation.conversationState ?? null, assignedUserId: row.conversation.assignedUserId ?? null, conversation: row.conversation });
    } catch (error) {
      log.warn('worker.check_failed', { ...ref, error: errMessage(error) });
    }
  }

  // --- the event stream -------------------------------------------------------------------------------------------

  async handle(event: WorkerEvent): Promise<void> {
    switch (event.type) {
      case 'inbound_message':
        if (this.automations) {
          await this.automations.runtime.onInboundMessage({
            workspaceId: event.workspaceId,
            channel: event.channel,
            conversationId: event.conversationId,
            sessionId: event.sessionId,
            messageId: event.messageId,
            text: event.text,
            firstInbound: event.firstInbound,
          });
        }
        break;
      case 'message_sent':
        if (event.by === 'ai') {
          if (!event.failed) await recordAiReply(this.opts.deps, event.workspaceId);
          // An AI reply may come with a handoff to people (`request_human_handoff`): check the state now, not in a minute.
          void this.checkConversation(event);
        }
        break;
      case 'conversation_state':
        if (event.state === 'human_handoff' && !event.assignedUserId) await this.assigner.handle(event, event.conversation);
        break;
    }
    this.eventsHandled += 1;
    this.opts.onEvent?.(event);
  }
}
