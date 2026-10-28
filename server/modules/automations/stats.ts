import 'server-only';
import { AdvancedAutomationStatsModel } from './models';
import type { EngineEffect } from './lib/advancedAutomationEngine';
import { buildStatIncrements, sumStatsDocs, utcDay, type AutomationStatsSummary, type StatIncrements } from './lib/advancedAutomationStats';
import { buildDailySeries, type DailyStatsPoint } from './lib/advancedAutomationStatsSeries';
import { errMessage, log } from '../../lib/logger';

type Pending = { workspaceId: string; automationId: string; day: string; inc: StatIncrements };

const FLUSH_INTERVAL_MS = 2_000;
const FLUSH_AT_PENDING_DOCS = 200;

/**
 * Buffers funnel increments and writes them in bulk (one `$inc` per (automation, day) every ~2 s).
 * Counters are analytics: a graceful shutdown flushes; only a hard crash loses ~2 s of them.
 */
export class AutomationStatsRecorder {
  private pending = new Map<string, Pending>();
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> | null = null;

  record(params: { workspaceId: string; automationId: string; effects: EngineEffect[]; at?: Date }) {
    const inc = buildStatIncrements(params.effects);
    if (Object.keys(inc).length === 0) return;
    const day = utcDay(params.at ?? new Date());
    const key = `${params.automationId}:${day}`;
    const entry = this.pending.get(key) ?? { workspaceId: params.workspaceId, automationId: params.automationId, day, inc: {} };
    for (const [path, n] of Object.entries(inc)) entry.inc[path] = (entry.inc[path] ?? 0) + n;
    this.pending.set(key, entry);
    if (this.pending.size >= FLUSH_AT_PENDING_DOCS) void this.flush();
    else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.flush();
      }, FLUSH_INTERVAL_MS);
      this.timer.unref?.();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing) await this.flushing;
    if (this.pending.size === 0) return;
    const batch = [...this.pending.entries()];
    this.pending = new Map();
    this.flushing = (async () => {
      try {
        await AdvancedAutomationStatsModel.bulkWrite(
          batch.map(([key, p]) => ({
            updateOne: {
              filter: { _id: key },
              update: { $inc: p.inc, $setOnInsert: { workspaceId: p.workspaceId, automationId: p.automationId, day: p.day, dayDate: new Date(`${p.day}T00:00:00.000Z`) } },
              upsert: true,
            },
          })),
          { ordered: false }
        );
      } catch (error) {
        log.error('automation_stats.flush_failed', { error: errMessage(error) });
        for (const [key, p] of batch) {
          const existing = this.pending.get(key);
          if (!existing) this.pending.set(key, p);
          else for (const [path, n] of Object.entries(p.inc)) existing.inc[path] = (existing.inc[path] ?? 0) + n;
        }
      } finally {
        this.flushing = null;
      }
    })();
    await this.flushing;
  }

  async summary(params: { workspaceId: string; automationId: string; days?: number; now?: Date }): Promise<AutomationStatsSummary> {
    const days = Math.min(400, Math.max(1, Math.floor(params.days ?? 30)));
    const since = new Date((params.now ?? new Date()).getTime() - days * 86_400_000);
    await this.flush();
    const docs = await AdvancedAutomationStatsModel.find({
      workspaceId: params.workspaceId,
      automationId: params.automationId,
      dayDate: { $gte: new Date(`${utcDay(since)}T00:00:00.000Z`) },
    }).lean();
    return sumStatsDocs(docs);
  }

  async dailySeries(params: { workspaceId: string; automationId: string; days?: number; now?: Date }): Promise<DailyStatsPoint[]> {
    const days = Math.min(400, Math.max(1, Math.floor(params.days ?? 30)));
    const now = params.now ?? new Date();
    const since = new Date(now.getTime() - (days - 1) * 86_400_000);
    await this.flush();
    const docs = await AdvancedAutomationStatsModel.find({
      workspaceId: params.workspaceId,
      automationId: params.automationId,
      dayDate: { $gte: new Date(`${utcDay(since)}T00:00:00.000Z`) },
    })
      .select({ nodes: 0 })
      .lean();
    return buildDailySeries(docs, days, now);
  }
}

export const automationStats = new AutomationStatsRecorder();

/** Shutdown step: bounded, never throws. */
export async function flushAutomationStats(recorder: Pick<AutomationStatsRecorder, 'flush'> = automationStats, timeoutMs = 3_000) {
  await Promise.race([
    recorder.flush().catch((error) => log.error('automation_stats.shutdown_flush_failed', { error: errMessage(error) })),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs).unref?.()),
  ]);
}
