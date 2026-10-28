import 'server-only';
import { json, route, type HttpContext } from '../../lib/http';
import { rateLimit } from '../../lib/rateLimit';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { entitlementGate } from '../billing/gate';
import { ReportsQueryService, type ReportQuery } from './query';

const guards = [requireUser, requireWorkspace, entitlementGate, rateLimit({ windowMs: 60_000, limit: 120, key: (ctx) => ctx.auth?.userId ?? ctx.ip })];

/** The data is rebuilt every ~10 minutes: the browser may reuse an answer for a minute. */
const CACHE = { 'Cache-Control': 'private, max-age=60' };

const serviceOf = (http: HttpContext) => {
  const ctx = ctxOf(http);
  return new ReportsQueryService(ctx.workspaceId, http.deps.user(ctx.token), http.deps.now);
};
const queryOf = (http: HttpContext): ReportQuery => ({ from: http.query.from, to: http.query.to, channel: http.query.channel, agentId: http.query.agentId });

/** `GET /api/attende/reports/overview?from&to&channel&agentId` (`OverviewResponse`, with `status`). */
export const getReportsOverview = route(guards, async (http) => json({ success: true, data: await serviceOf(http).overview(queryOf(http)) }, 200, CACHE));
/** `GET /api/attende/reports/agents?from&to&channel`: every agent with activity (ignores the agent filter). */
export const getReportsAgents = route(guards, async (http) => json({ success: true, data: await serviceOf(http).agents(queryOf(http)) }, 200, CACHE));
/** `GET /api/attende/reports/outcomes?from&to&channel&agentId`. */
export const getReportsOutcomes = route(guards, async (http) => json({ success: true, data: await serviceOf(http).outcomes(queryOf(http)) }, 200, CACHE));
