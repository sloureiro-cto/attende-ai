import 'server-only';
import { json, route, type HttpContext } from '../../lib/http';
import { errMessage, log } from '../../lib/logger';
import { rateLimit } from '../../lib/rateLimit';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { entitlementGate } from '../billing/gate';
import { requestOnDemandSync } from './onDemand';
import { ReportsQueryService, type ReportQuery } from './query';

const guards = [requireUser, requireWorkspace, entitlementGate, rateLimit({ windowMs: 60_000, limit: 120, key: (ctx) => ctx.auth?.userId ?? ctx.ip })];

/** The data is rebuilt every ~10 minutes: the browser may reuse an answer for a minute. */
const CACHE = { 'Cache-Control': 'private, max-age=60' };

/**
 * The query service, after asking for an on-demand sync when the workspace's numbers are stale (never synced, backfill
 * unfinished, last run > 10 min): reports never wait on the cron or the worker. The sync runs after the response; a
 * failure to schedule it never fails the read.
 */
const serviceOf = async (http: HttpContext) => {
  const ctx = ctxOf(http);
  const client = http.deps.user(ctx.token);
  await requestOnDemandSync(http.deps, ctx.workspaceId, client).catch((error) => log.warn('reports.on_demand_failed', { workspaceId: ctx.workspaceId, error: errMessage(error) }));
  return new ReportsQueryService(ctx.workspaceId, client, http.deps.now);
};
const queryOf = (http: HttpContext): ReportQuery => ({ from: http.query.from, to: http.query.to, channel: http.query.channel, agentId: http.query.agentId });

/** `GET /api/attende/reports/overview?from&to&channel&agentId` (`OverviewResponse`, with `status`). */
export const getReportsOverview = route(guards, async (http) => json({ success: true, data: await (await serviceOf(http)).overview(queryOf(http)) }, 200, CACHE));
/** `GET /api/attende/reports/agents?from&to&channel`: every agent with activity (ignores the agent filter). */
export const getReportsAgents = route(guards, async (http) => json({ success: true, data: await (await serviceOf(http)).agents(queryOf(http)) }, 200, CACHE));
/** `GET /api/attende/reports/outcomes?from&to&channel&agentId`. */
export const getReportsOutcomes = route(guards, async (http) => json({ success: true, data: await (await serviceOf(http)).outcomes(queryOf(http)) }, 200, CACHE));
