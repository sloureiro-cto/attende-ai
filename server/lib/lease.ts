import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Named leases in the Attende database (`worker_leases`). One document per name; the holder writes
 * `expiresAt` and must renew before it passes. Every write is a single-document conditional update,
 * so two processes racing for the same name never both win.
 *
 * - `worker`: the always-on worker. Only the holder listens to JSYNQ, runs timers and assigns handoffs; a second
 *   deployed instance waits as a standby and takes over when the lease expires.
 * - `job:<name>`: one run of a periodic job (reports), shared by the worker and the Vercel cron fallback.
 */
export interface ILease {
  _id: string;
  holder: string | null;
  expiresAt: Date;
  /** When the last run of a job lease finished (jobs skip a run that comes too soon after it). */
  lastDoneAt?: Date | null;
}

const LeaseSchema = new Schema<ILease>(
  {
    _id: { type: String },
    holder: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    lastDoneAt: { type: Date, default: null },
  },
  { collection: 'worker_leases', versionKey: false }
);

export const LeaseModel: Model<ILease> = (mongoose.models.Lease as Model<ILease>) || mongoose.model<ILease>('Lease', LeaseSchema);

const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

/**
 * Takes `name` for `holder` until `now + ttlMs` when it is free, expired or already ours (then it renews).
 * `minIntervalMs`: also refuse while the previous run finished less than this long ago.
 */
export async function acquireLease(name: string, holder: string, ttlMs: number, opts: { now?: Date; minIntervalMs?: number } = {}): Promise<boolean> {
  const now = opts.now ?? new Date();
  const free: Record<string, unknown>[] = [{ holder }, { expiresAt: { $lte: now } }, { holder: null }];
  const filter: Record<string, unknown> = { _id: name, $or: free };
  if (opts.minIntervalMs) filter.$and = [{ $or: [{ lastDoneAt: null }, { lastDoneAt: { $lte: new Date(now.getTime() - opts.minIntervalMs) } }] }];
  try {
    const res = await LeaseModel.updateOne(filter, { $set: { holder, expiresAt: new Date(now.getTime() + ttlMs) } }, { upsert: true });
    return res.modifiedCount === 1 || res.upsertedCount === 1;
  } catch (error) {
    // The upsert lost a race against an existing (held) document: not ours.
    if (isDuplicate(error)) return false;
    throw error;
  }
}

/** Extends a lease we hold. False when someone else took it (we must stop working). */
export async function renewLease(name: string, holder: string, ttlMs: number, now = new Date()): Promise<boolean> {
  const res = await LeaseModel.updateOne({ _id: name, holder, expiresAt: { $gt: now } }, { $set: { expiresAt: new Date(now.getTime() + ttlMs) } });
  return res.matchedCount === 1;
}

/** Gives the lease back (optionally recording that a job run finished). */
export async function releaseLease(name: string, holder: string, opts: { done?: boolean; now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  await LeaseModel.updateOne({ _id: name, holder }, { $set: { holder: null, expiresAt: now, ...(opts.done ? { lastDoneAt: now } : {}) } });
}

/**
 * Runs `fn` only if this caller gets the job lease `job:<name>`: never two runs at once, and never a run sooner than
 * `minIntervalMs` after the previous one finished (so the worker and the cron fallback do not both run the job).
 * Returns `{ ran: false }` without calling `fn` otherwise.
 */
export async function runExclusive<T>(
  name: string,
  holder: string,
  opts: { ttlMs: number; minIntervalMs?: number; now?: () => Date },
  fn: () => Promise<T>
): Promise<{ ran: true; result: T } | { ran: false }> {
  const clock = opts.now ?? (() => new Date());
  const key = `job:${name}`;
  if (!(await acquireLease(key, holder, opts.ttlMs, { now: clock(), minIntervalMs: opts.minIntervalMs }))) return { ran: false };
  let ok = false;
  try {
    const result = await fn();
    ok = true;
    return { ran: true, result };
  } finally {
    await releaseLease(key, holder, { done: ok, now: clock() }).catch(() => undefined);
  }
}
