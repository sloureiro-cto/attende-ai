import 'server-only';
import { randomUUID } from 'crypto';
import type { Deps } from '../../deps';
import { runExclusive } from '../../lib/lease';

/** A run holds the lease at most this long (the cron route has 60 s, the worker a few minutes). */
export const REPORTS_JOB_TTL_MS = 5 * 60_000;
/** Runs closer together than this are skipped: the worker and the Vercel cron (both every 10 min) share the job. */
export const REPORTS_JOB_MIN_INTERVAL_MS = 9 * 60_000;

/**
 * The reports sync, guarded by the `job:reports` lease shared by the worker and the cron fallback: never two runs at
 * once, never two runs within 9 minutes. `{skipped: 1}` when another runner has it or ran it recently.
 */
export async function runReportsJob(
  deps: Pick<Deps, 'user' | 'now'>,
  runner: 'cron' | 'worker',
  run: (deps: Pick<Deps, 'user' | 'now'>) => Promise<Record<string, number>>
): Promise<Record<string, number>> {
  const outcome = await runExclusive('reports', `${runner}:${randomUUID()}`, { ttlMs: REPORTS_JOB_TTL_MS, minIntervalMs: REPORTS_JOB_MIN_INTERVAL_MS, now: deps.now }, () => run(deps));
  return outcome.ran ? outcome.result : { skipped: 1 };
}
