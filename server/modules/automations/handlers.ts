import 'server-only';
import { badRequest } from '../../lib/errors';
import { noContent, ok, route, type HttpContext } from '../../lib/http';
import { rateLimit } from '../../lib/rateLimit';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { entitlementGate } from '../billing/gate';
import type { BusinessHours } from './lib/conditions';
import { parseAutomationCreate, parseAutomationGraph, parseAutomationPatch } from './lib/parseAdvancedAutomationInput';
import { previewAutomation, type PreviewEvent } from './preview';
import { AutomationService, jsynqDirectory } from './service';
import { automationStats } from './stats';
import type { AdvancedAutomationChannel, AdvancedAutomationStatus } from './types';

const CHANNELS = ['whatsapp', 'instagram', 'sms'];
const asInt = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : NaN;
  return Number.isInteger(n) ? n : undefined;
};

/** `/api/messaging-automations/advanced`: the same routes and shapes the frontend used on JSYNQ. */
const guards = [requireUser, requireWorkspace, entitlementGate];
const previewLimiter = rateLimit({ windowMs: 60_000, limit: 30, key: (http) => http.auth?.workspaceId ?? http.ip });

const service = (http: HttpContext) => {
  const ctx = ctxOf(http);
  return { ctx, automations: new AutomationService(jsynqDirectory(http.deps.user(ctx.token), ctx.workspaceId)) };
};
const id = (http: HttpContext) => String(http.params.id);

export const listAutomations = route(guards, async (http) => {
  const { ctx, automations } = service(http);
  const q = http.query;
  const status = ['draft', 'active', 'paused'].includes(String(q.status)) ? (q.status as AdvancedAutomationStatus) : undefined;
  const channel = CHANNELS.includes(String(q.channel)) ? (q.channel as AdvancedAutomationChannel) : undefined;
  return ok(
    await automations.list(ctx.workspaceId, {
      q: typeof q.q === 'string' ? q.q.slice(0, 120) : undefined,
      status,
      channel,
      page: asInt(q.page),
      limit: asInt(q.limit),
    })
  );
});

export const createAutomation = route(guards, async (http) => {
  const { ctx, automations } = service(http);
  return ok(await automations.create(ctx.workspaceId, ctx.userId, parseAutomationCreate(await http.body())), 201);
});

export const previewAutomationRoute = route([...guards, previewLimiter], async (http) => {
  const { ctx, automations } = service(http);
  const body = ((await http.body()) ?? {}) as Record<string, unknown>;
  const channel = CHANNELS.includes(String(body.channel)) ? (body.channel as AdvancedAutomationChannel) : 'whatsapp';
  const ev = body.event as Record<string, unknown> | undefined;
  if (!ev || !['start', 'inbound', 'timer'].includes(String(ev.type))) throw badRequest('invalid event');
  if (ev.type === 'inbound' && (typeof ev.text !== 'string' || ev.text.length > 4000)) throw badRequest('event.text is required for an inbound message');
  const event: PreviewEvent =
    ev.type === 'inbound'
      ? { type: 'inbound', text: ev.text as string, ...(typeof ev.optionId === 'string' ? { optionId: ev.optionId.slice(0, 64) } : {}) }
      : ({ type: ev.type } as PreviewEvent);

  let automation;
  let automationId: string;
  if (body.automation !== undefined) {
    if (!body.automation || typeof body.automation !== 'object') throw badRequest('automation must be an object');
    automation = parseAutomationGraph(body.automation as Record<string, unknown>);
    automationId = 'draft';
  } else if (typeof body.automationId === 'string') {
    const saved = await automations.get(ctx.workspaceId, body.automationId);
    automation = { startNodeId: saved.startNodeId, nodes: saved.nodes, edges: saved.edges };
    automationId = saved.id;
  } else {
    throw badRequest('Send an automation (draft) or an automationId');
  }
  const at = typeof body.simulatedAt === 'string' && !Number.isNaN(Date.parse(body.simulatedAt)) ? new Date(body.simulatedAt) : undefined;
  const workspace = await http.deps.user(ctx.token).getWorkspace(ctx.workspaceId).catch(() => null);
  return ok(
    await previewAutomation({
      automation,
      automationId,
      channel,
      event,
      rawState: body.state,
      now: at,
      whatsappInteractive: body.whatsappInteractive === true,
      businessHours: (workspace?.businessHours as BusinessHours | undefined) ?? null,
    })
  );
});

export const getAutomationStats = route(guards, async (http) => {
  const { ctx, automations } = service(http);
  const automation = await automations.get(ctx.workspaceId, id(http));
  const summary = await automationStats.summary({ workspaceId: ctx.workspaceId, automationId: automation.id, days: asInt(http.query.days) });
  const nodes = Object.fromEntries(Object.entries(summary.nodes).map(([nodeId, n]) => [nodeId, { ...n, reachedPct: summary.started > 0 ? n.reached / summary.started : 0 }]));
  return ok({ ...summary, nodes });
});

export const getAutomationStatsSeries = route(guards, async (http) => {
  const { ctx, automations } = service(http);
  const automation = await automations.get(ctx.workspaceId, id(http));
  return ok({ series: await automationStats.dailySeries({ workspaceId: ctx.workspaceId, automationId: automation.id, days: asInt(http.query.days) }) });
});

export const getAutomation = route(guards, async (http) => {
  const { ctx, automations } = service(http);
  return ok(await automations.get(ctx.workspaceId, id(http)));
});

export const patchAutomation = route(guards, async (http) => {
  const { ctx, automations } = service(http);
  return ok(await automations.update(ctx.workspaceId, ctx.userId, id(http), parseAutomationPatch(await http.body())));
});

export const deleteAutomation = route(guards, async (http) => {
  const { ctx, automations } = service(http);
  await automations.remove(ctx.workspaceId, id(http));
  return noContent();
});
