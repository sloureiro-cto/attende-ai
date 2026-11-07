import 'server-only';
import type { Deps } from '../../deps';
import { JsynqError, type UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { workspaceClient } from '../billing/enforcement';
import { ReportSyncStateModel, type IReportSyncState } from './models';
import { syncWorkspaceReports, type WorkspaceSyncResult } from './sync';

/** A ready workspace is refreshed by a view when its last run is older than this (the cron's rhythm). */
export const ON_DEMAND_STALE_MS = 10 * 60_000;
/** While the backfill runs, each view (the page polls while "preparing") may start the next slice this soon. */
export const ON_DEMAND_BACKFILL_GAP_MS = 15_000;
/** One on-demand slice: well inside the function's `maxDuration` (60 s), resumed by the next view. */
export const ON_DEMAND_BUDGET_MS = 20_000;
const ON_DEMAND_MAX_CONVERSATIONS = 150;

/** Runs started by this instance and not finished: a page asks for overview + agents at once, only one starts. */
const inFlight = new Map<string, Promise<WorkspaceSyncResult | null>>();

type State = Pick<IReportSyncState, 'lastRunAt' | 'backfillDoneAt' | 'lockedUntil'> | null;

/** Whether a view should start a sync: never synced, backfill not finished, or last run older than ~10 min. */
export function needsOnDemandSync(state: State, now: Date): boolean {
  if (!state) return true;
  if (state.lockedUntil && new Date(state.lockedUntil).getTime() > now.getTime()) return false; // cron, worker or another view
  const last = state.lastRunAt ? new Date(state.lastRunAt).getTime() : 0;
  return now.getTime() - last >= (state.backfillDoneAt ? ON_DEMAND_STALE_MS : ON_DEMAND_BACKFILL_GAP_MS);
}

export type OnDemandOutcome = 'started' | 'running' | 'fresh' | 'disabled';

/**
 * Reports must not depend on the cron or the worker being up: a view of the reports starts a bounded, incremental
 * sync of its workspace when it is stale, after the response (`deps.background`, Vercel `waitUntil`). The run is the
 * same `syncWorkspaceReports` the cron and the worker call, behind the same per-workspace lease
 * (`report_sync_state.lockedUntil`), so the three never overlap; a backfill too long for one slice continues on the
 * next view (the page polls while it says "preparing"). JSYNQ is read as the workspace's actor (like the cron), else
 * with the viewer's own token.
 */
export async function requestOnDemandSync(
  deps: Pick<Deps, 'user' | 'now' | 'background'>,
  workspaceId: string,
  viewer: UserClient | null
): Promise<OnDemandOutcome> {
  if (!deps.background) return 'disabled';
  if (inFlight.has(workspaceId)) return 'running';
  const state = await ReportSyncStateModel.findOne({ workspaceId }).select('lastRunAt backfillDoneAt lockedUntil').lean<State>();
  if (!needsOnDemandSync(state, deps.now())) return state?.lockedUntil && new Date(state.lockedUntil) > deps.now() ? 'running' : 'fresh';
  if (inFlight.has(workspaceId)) return 'running'; // another view of this instance got here during the read

  const opts = { budgetMs: ON_DEMAND_BUDGET_MS, maxConversations: ON_DEMAND_MAX_CONVERSATIONS, now: deps.now };
  const task = (async () => {
    const actor = await workspaceClient(deps, workspaceId);
    const first = actor ?? viewer;
    if (!first) return null;
    try {
      return await syncWorkspaceReports(first, workspaceId, opts);
    } catch (error) {
      // The recorded actor left the workspace (or lost access): the viewer can still read it.
      if (actor && viewer && error instanceof JsynqError && (error.status === 401 || error.status === 403))
        return await syncWorkspaceReports(viewer, workspaceId, opts);
      throw error;
    }
  })()
    .then((result) => {
      if (result && !result.skipped) log.info('reports.on_demand_sync', { workspaceId, ...result });
      return result;
    })
    .catch((error) => {
      log.warn('reports.on_demand_sync_failed', { workspaceId, error: errMessage(error) });
      return null;
    })
    .finally(() => inFlight.delete(workspaceId));
  inFlight.set(workspaceId, task);
  deps.background(task);
  return 'started';
}
