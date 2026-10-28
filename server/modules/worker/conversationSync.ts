import 'server-only';
import type { JsynqMessage } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { classifyMessage } from '../reports/sync';
import type { WorkspaceClients } from './clients';
import type { ConversationRef, WorkerEvent } from './events';
import { AutomationSendModel, SeenMessageModel } from './models';

/** Newest messages read per conversation sync (the websocket fires per message; the poll per changed conversation). */
export const SYNC_PAGE = 30;
/** Older messages are never turned into events (and their dedup record may already be gone). */
export const MAX_MESSAGE_AGE_MS = 24 * 3600_000;

const date = (v: unknown): Date | null => {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export type SyncDeps = {
  clients: WorkspaceClients;
  now: () => Date;
  /** When the worker started watching the workspace: earlier messages are history. */
  watchFrom: (workspaceId: string) => Promise<Date>;
  emit: (event: WorkerEvent) => Promise<void>;
};

/**
 * Reads a conversation's newest messages and emits an event for each one not seen before. Every trigger (websocket
 * event, poll row) goes through here, so the full text always comes from the messages endpoint and the same message
 * is emitted once: the id is claimed in `worker_seen_messages` (unique `_id`, TTL 7 days) before its event runs, and
 * released if the handler throws so the next poll retries it.
 *
 * Calls for one conversation are serialized and coalesced: a burst of events (message, delivery ticks) costs one or
 * two reads, never one per event.
 */
export class ConversationSync {
  private running = new Map<string, { again: boolean; done: Promise<void> }>();

  constructor(private readonly deps: SyncDeps) {}

  get inFlight(): number {
    return this.running.size;
  }

  async idle(): Promise<void> {
    while (this.running.size) await Promise.allSettled([...this.running.values()].map((r) => r.done));
  }

  sync(ref: ConversationRef): Promise<void> {
    const key = `${ref.workspaceId}:${ref.channel}:${ref.conversationId}`;
    const current = this.running.get(key);
    if (current) {
      current.again = true;
      return current.done;
    }
    const entry = { again: false, done: Promise.resolve() };
    entry.done = (async () => {
      try {
        do {
          entry.again = false;
          await this.once(ref).catch((error) => log.warn('worker.sync_failed', { ...ref, error: errMessage(error) }));
        } while (entry.again);
      } finally {
        this.running.delete(key);
      }
    })();
    this.running.set(key, entry);
    return entry.done;
  }

  private async once(ref: ConversationRef): Promise<void> {
    const client = await this.deps.clients.require(ref.workspaceId);
    const page = await client.listConversationMessages(ref.channel, ref.sessionId, ref.conversationId, { limit: SYNC_PAGE });
    const now = this.deps.now();
    const watchFrom = await this.deps.watchFrom(ref.workspaceId);
    const floor = Math.max(watchFrom.getTime(), now.getTime() - MAX_MESSAGE_AGE_MS);
    const chronological = page
      .map((m) => ({ m, at: date(m.createdAt) }))
      .filter((x): x is { m: JsynqMessage; at: Date } => !!x.at && !!x.m._id)
      .sort((a, b) => a.at.getTime() - b.at.getTime() || (String(a.m._id) < String(b.m._id) ? -1 : 1));
    const fresh = chronological.filter((x) => x.at.getTime() >= floor);
    if (!fresh.length) return;
    // A full page may not reach the conversation's start: only then is "no earlier inbound" unknown.
    const pageIsWholeConversation = page.length < SYNC_PAGE;
    const own = new Set(
      (await AutomationSendModel.find({ messageId: { $in: fresh.map((x) => String(x.m._id)) } }).select('messageId').lean()).map((s) => String(s.messageId))
    );

    for (const { m, at } of fresh) {
      const id = String(m._id);
      const seenId = `${ref.channel}:${id}`;
      try {
        await SeenMessageModel.create({ _id: seenId, workspaceId: ref.workspaceId, at: now });
      } catch (error) {
        if ((error as { code?: number })?.code === 11000) continue;
        throw error;
      }
      const event = this.toEvent(ref, m, at, own.has(id), chronological, pageIsWholeConversation);
      if (!event) continue;
      try {
        await this.deps.emit(event);
      } catch (error) {
        await SeenMessageModel.deleteOne({ _id: seenId }).catch(() => undefined);
        throw error;
      }
    }
  }

  private toEvent(
    ref: ConversationRef,
    m: JsynqMessage,
    at: Date,
    own: boolean,
    page: Array<{ m: JsynqMessage; at: Date }>,
    whole: boolean
  ): WorkerEvent | null {
    const base = { ...ref, messageId: String(m._id), createdAt: at };
    if (m.direction === 'inbound') {
      if (m.senderType !== 'contact') return null;
      const earlierInbound = page.some((x) => x.m.direction === 'inbound' && x.m.senderType === 'contact' && (x.at < at || (x.at.getTime() === at.getTime() && String(x.m._id) < String(m._id))));
      return { type: 'inbound_message', ...base, text: typeof m.content === 'string' ? m.content : '', firstInbound: whole && !earlierInbound };
    }
    if (m.direction !== 'outbound') return null;
    const failed = m.status === 'failed';
    if (own) return { type: 'message_sent', ...base, by: 'self', failed };
    const kind = classifyMessage(m);
    if (kind === 'ai' || kind === 'aiFailed') return { type: 'message_sent', ...base, by: 'ai', failed };
    if (m.senderType === 'agent') return { type: 'message_sent', ...base, by: 'automation', failed };
    if (m.senderType === 'user') return { type: 'message_sent', ...base, by: 'human', failed };
    return null;
  }
}
