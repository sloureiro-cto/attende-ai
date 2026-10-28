import 'server-only';
import { errMessage, log } from './logger';

export type Job = { name: string; everyMs: number; run: () => Promise<unknown> };

/**
 * Tiny in-process scheduler: each job runs every `everyMs`, never overlapping itself. Jobs must be
 * idempotent (several instances may run them at the same time; every write they do is idempotent).
 */
export function startJobs(jobs: Job[]): () => Promise<void> {
  const running = new Map<string, Promise<unknown>>();
  const timers = jobs.map((job) => {
    const tick = () => {
      if (running.has(job.name)) return;
      const p = job
        .run()
        .catch((error) => log.error('cron.failed', { job: job.name, error: errMessage(error) }))
        .finally(() => running.delete(job.name));
      running.set(job.name, p);
    };
    const t = setInterval(tick, job.everyMs);
    t.unref();
    return t;
  });
  return async () => {
    timers.forEach(clearInterval);
    await Promise.allSettled([...running.values()]);
  };
}
