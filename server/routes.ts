import 'server-only';
import { agentSweeperCron, billingReconcileCron, reportsCron } from './cron';
import { AppError } from './lib/errors';
import type { RouteHandler } from './lib/http';
import * as agents from './modules/agents/handlers';
import * as automations from './modules/automations/handlers';
import * as billing from './modules/billing/handlers';
import * as limits from './modules/billing/limitsHandlers';
import * as funnel from './modules/funnel/handlers';
import * as reports from './modules/reports/handlers';
import * as signup from './modules/signup/handlers';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type AttendeRoute = { method: HttpMethod; path: string; handler: RouteHandler };

/**
 * Every Attende route, with the path the Express service had (crons under `/api/cron`).
 * `app/api/**\/route.ts` exports these same handlers (a test checks both agree); this table also
 * serves in-process calls from server actions (`dispatchAttende`) and the integration tests.
 * Static segments come before `:params` of the same prefix.
 */
export const ATTENDE_ROUTES: AttendeRoute[] = [
  { method: 'GET', path: '/api/attende/signup/plans', handler: signup.getPlans },
  { method: 'POST', path: '/api/attende/signup', handler: signup.postSignup },
  { method: 'POST', path: '/api/attende/signup/verify', handler: signup.postVerify },
  { method: 'POST', path: '/api/attende/signup/resend', handler: signup.postResend },
  { method: 'POST', path: '/api/attende/signup/setup-intent', handler: signup.postSetupIntent },
  { method: 'POST', path: '/api/attende/signup/start-trial', handler: signup.postStartTrial },

  { method: 'GET', path: '/api/attende/entitlements', handler: billing.getEntitlementsRoute },
  { method: 'GET', path: '/api/attende/billing/invoices', handler: billing.getInvoices },
  { method: 'POST', path: '/api/attende/billing/portal', handler: billing.postPortal },
  { method: 'POST', path: '/api/attende/billing/cancel', handler: billing.postCancel },
  { method: 'POST', path: '/api/attende/billing/resume', handler: billing.postResume },
  { method: 'POST', path: '/api/attende/billing/change-plan', handler: billing.postChangePlan },
  { method: 'POST', path: '/api/attende/limits/check', handler: limits.postLimitsCheck },
  { method: 'POST', path: '/api/attende/usage/outbound', handler: limits.postOutboundUsage },

  { method: 'GET', path: '/api/attende/agents/templates', handler: agents.getTemplates },
  { method: 'POST', path: '/api/attende/agents/from-template', handler: agents.postFromTemplate },
  { method: 'GET', path: '/api/attende/agents', handler: agents.listAgents },
  { method: 'GET', path: '/api/attende/agents/:id', handler: agents.getAgent },
  { method: 'PATCH', path: '/api/attende/agents/:id/setup', handler: agents.patchSetup },
  { method: 'POST', path: '/api/attende/agents/:id/go-live', handler: agents.postGoLive },
  { method: 'POST', path: '/api/attende/agents/:id/pause', handler: agents.postPause },
  { method: 'POST', path: '/api/attende/agents/:id/test', handler: agents.postTest },
  { method: 'GET', path: '/api/attende/agents/:id/knowledge', handler: agents.listKnowledge },
  { method: 'POST', path: '/api/attende/agents/:id/knowledge', handler: agents.postKnowledge },
  { method: 'DELETE', path: '/api/attende/agents/:id/knowledge/:documentId', handler: agents.deleteKnowledge },

  { method: 'GET', path: '/api/attende/funnel', handler: funnel.getFunnel },
  { method: 'GET', path: '/api/attende/funnel/stages', handler: funnel.getFunnelStages },
  { method: 'GET', path: '/api/attende/funnel/contacts', handler: funnel.getFunnelContacts },
  { method: 'GET', path: '/api/attende/funnel/export.csv', handler: funnel.getFunnelExport },
  { method: 'PATCH', path: '/api/attende/funnel/:cardId/stage', handler: funnel.patchFunnelStage },
  { method: 'GET', path: '/api/attende/funnel/:cardId/conversation', handler: funnel.getFunnelConversation },

  { method: 'GET', path: '/api/attende/reports/overview', handler: reports.getReportsOverview },
  { method: 'GET', path: '/api/attende/reports/agents', handler: reports.getReportsAgents },
  { method: 'GET', path: '/api/attende/reports/outcomes', handler: reports.getReportsOutcomes },

  { method: 'GET', path: '/api/messaging-automations/advanced', handler: automations.listAutomations },
  { method: 'POST', path: '/api/messaging-automations/advanced', handler: automations.createAutomation },
  { method: 'POST', path: '/api/messaging-automations/advanced/preview', handler: automations.previewAutomationRoute },
  { method: 'GET', path: '/api/messaging-automations/advanced/:id/stats', handler: automations.getAutomationStats },
  { method: 'GET', path: '/api/messaging-automations/advanced/:id/stats/series', handler: automations.getAutomationStatsSeries },
  { method: 'GET', path: '/api/messaging-automations/advanced/:id', handler: automations.getAutomation },
  { method: 'PATCH', path: '/api/messaging-automations/advanced/:id', handler: automations.patchAutomation },
  { method: 'DELETE', path: '/api/messaging-automations/advanced/:id', handler: automations.deleteAutomation },

  { method: 'GET', path: '/api/cron/billing-reconcile', handler: billingReconcileCron },
  { method: 'GET', path: '/api/cron/agent-sweeper', handler: agentSweeperCron },
  { method: 'GET', path: '/api/cron/reports', handler: reportsCron },
];

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const want = pattern.split('/');
  const got = pathname.replace(/\/+$/, '').split('/');
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    const w = want[i]!;
    const g = got[i]!;
    if (w.startsWith(':')) {
      if (!g) return null;
      try {
        params[w.slice(1)] = decodeURIComponent(g);
      } catch {
        return null;
      }
    } else if (w !== g) return null;
  }
  return params;
}

export function findAttendeRoute(method: string, pathname: string): { route: AttendeRoute; params: Record<string, string> } | null {
  for (const route of ATTENDE_ROUTES) {
    if (route.method !== method.toUpperCase()) continue;
    const params = matchPath(route.path, pathname);
    if (params) return { route, params };
  }
  return null;
}

/** Runs a request through the matching handler, in process. Unknown routes get the standard 404 body. */
export async function dispatchAttende(req: Request): Promise<Response> {
  const found = findAttendeRoute(req.method, new URL(req.url).pathname);
  if (!found) return Response.json(new AppError(404, 'Not found').toBody(), { status: 404 });
  return found.route.handler(req, { params: found.params });
}
