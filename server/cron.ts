import 'server-only';
import { env } from './config/env';
import type { Deps } from './deps';
import { safeEqual } from './lib/crypto';
import { AppError } from './lib/errors';
import { json, route, type Guard } from './lib/http';
import { errMessage, log } from './lib/logger';
import { sweepOrphanAgents } from './modules/agents/sweeper';
import { BillingService } from './modules/billing/service';
import { runReportsSync } from './modules/reports/sync';
import { runReportsJob } from './modules/reports/job';

/** Vercel Cron calls with `Authorization: Bearer <CRON_SECRET>`. Without the secret configured, nothing runs. */
const requireCron: Guard = (ctx) => {
  const secret = env().CRON_SECRET;
  if (!secret) throw new AppError(503, 'Cron is not configured', 'CRON_NOT_CONFIGURED');
  if (!safeEqual(ctx.header('authorization') ?? '', `Bearer ${secret}`)) throw new AppError(401, 'Unauthorized', 'CRON_UNAUTHORIZED');
};

/** Runs one idempotent job (several runs at once are safe: they only repeat reads). */
const job = (name: string, run: (deps: Deps) => Promise<Record<string, number>>) =>
  route([requireCron], async (ctx) => {
    const started = Date.now();
    try {
      const result = await run(ctx.deps);
      log.info('cron.done', { job: name, ms: Date.now() - started, ...result });
      return json({ ok: true, job: name, ...result });
    } catch (error) {
      log.error('cron.failed', { job: name, error: errMessage(error) });
      throw error;
    }
  });

/** Every 15 min: JSYNQ `GET /api/subscriptions/me` (+ Stripe flags) -> entitlements -> agents paused or resumed. */
export const billingReconcileCron = job('billing-reconcile', (deps) => new BillingService(deps).reconcile());

/** Every hour: removes the JSYNQ agents and bindings of creates that died half-way. */
export const agentSweeperCron = job('orphan-agent-sweeper', (deps) => sweepOrphanAgents(deps));

/**
 * Every 10 min: pulls conversations and messages changed since each workspace's cursor and rebuilds the report days.
 * The worker runs the same job; both take the `job:reports` lease, so this is a fallback that skips when the worker
 * ran it less than 9 minutes ago (`skipped: 1`).
 */
export const reportsCron = job('reports', (deps) => runReportsJob(deps, 'cron', (d) => runReportsSync(d, { budgetMs: 45_000 })));
