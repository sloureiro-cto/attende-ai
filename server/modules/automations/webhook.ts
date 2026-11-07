import 'server-only';
import { randomUUID, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import type { Deps } from '../../deps';
import { AppError, badRequest } from '../../lib/errors';
import type { UserClient } from '../../lib/jsynq';
import { log } from '../../lib/logger';
import { decideAccess } from '../billing/deriveEntitlements';
import { EntitlementModel } from '../billing/models';
import { WorkspaceClients } from '../worker/clients';
import { cardUpdateBody, JsynqConversationGateway } from '../worker/gateway';
import { AutomationActionModel } from '../worker/models';
import { AdvancedAutomationModel, type IAdvancedAutomation } from './models';
import { createAutomationsRuntime, type AutomationsRuntime } from './runtime/factory';
import { mongoTriggerGuards } from './runtime/triggers';
import { hashWebhookSecret, WEBHOOK_SECRET_HEADER } from './service';
import { TRIGGER_LIMITS } from './types';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) || undefined : undefined);
const digits = (v: string) => v.replace(/\D+/g, '');
const refId = (v: unknown): string => String((v as { _id?: unknown })?._id ?? v ?? '');

/** What a webhook call may send. Anything else is ignored. */
export type WebhookLead = { name?: string; phone?: string; email?: string; company?: string; value?: string; fields: Record<string, string> };

export function parseWebhookLead(body: unknown): WebhookLead {
  if (!isRecord(body)) throw badRequest('Send a JSON object with the lead (name, phone, email, company, value, fields)');
  const lead: WebhookLead = {
    name: text(body.name, 200),
    phone: text(body.phone, 40),
    email: text(body.email, 200)?.toLowerCase(),
    company: text(body.company, 200),
    value: text(body.value, 40),
    fields: {},
  };
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) throw badRequest('email is not valid');
  if (lead.phone && digits(lead.phone).length < 8) throw badRequest('phone is not valid');
  if (body.fields !== undefined) {
    if (!isRecord(body.fields) || Object.keys(body.fields).length > 30) throw badRequest('fields must be an object of at most 30 values');
    for (const [k, v] of Object.entries(body.fields)) {
      const value = text(v, 1000);
      if (!/^[A-Za-z0-9_:-]{1,80}$/.test(k)) throw badRequest(`field id "${k.slice(0, 40)}" is not valid`);
      if (value !== undefined) lead.fields[k] = value;
    }
  }
  if (!lead.phone && !lead.email) throw badRequest('Send the lead\'s phone or email');
  return lead;
}

/** Constant-time check of the `X-Attende-Secret` header against the stored hash. */
export function webhookSecretMatches(given: string | undefined, storedHash: string | null | undefined): boolean {
  if (!given || !storedHash) return false;
  const a = Buffer.from(hashWebhookSecret(given), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The lead of a webhook call on the trigger's board: an existing deal of the contact found by phone or e-mail
 * (`GET /api/workspaces/:w/directory?search=`, then `GET /api/workspaces/:w/contacts/:id/deals`), else a new card in the
 * trigger's stage (`POST /api/projects/:p/cards`; JSYNQ creates or links the contact from the phone / e-mail fields).
 */
export async function matchOrCreateLead(
  client: UserClient,
  workspaceId: string,
  target: { projectId: string; boardId?: string; columnId: string },
  lead: WebhookLead
): Promise<{ projectId: string; cardId: string; created: boolean; columnId?: string }> {
  const board = await client.kanbanColumns(target.projectId, target.boardId).catch(() => null);
  const onBoard = new Set((board?.columns ?? []).map((c) => String(c.columnId)));
  onBoard.add(target.columnId);
  for (const search of [lead.email, lead.phone ? digits(lead.phone).slice(-9) : undefined]) {
    if (!search) continue;
    const { items } = await client.listDirectory(workspaceId, { type: 'contact', search, page: 1, limit: 10 });
    const matches = items.filter((i) =>
      search === lead.email ? (i.email ?? '').toLowerCase() === lead.email : !!i.phone && digits(i.phone).endsWith(digits(lead.phone!).slice(-9))
    );
    for (const contact of matches) {
      const contactId = contact.contactId ?? contact.id;
      const deals = await client.listContactDeals(workspaceId, contactId, 100).catch(() => []);
      const deal = deals.find((d) => d.columnId && onBoard.has(String(d.columnId)));
      if (deal) return { projectId: target.projectId, cardId: String(deal.id), created: false, columnId: String(deal.columnId) };
    }
  }
  const fields = [
    ...(lead.name ? [{ fieldId: 'contactName', value: lead.name }] : []),
    ...(lead.email ? [{ fieldId: 'email', value: lead.email }] : []),
    ...(lead.phone ? [{ fieldId: 'phone', value: lead.phone }] : []),
    ...(lead.company ? [{ fieldId: 'company', value: lead.company }] : []),
    ...(lead.value ? [{ fieldId: 'estimateRevenue', value: lead.value }] : []),
    ...Object.entries(lead.fields).map(([fieldId, value]) => ({ fieldId, value })),
  ].filter((f) => f.fieldId !== 'card:owner');
  const body = cardUpdateBody(fields);
  const card = await client.createCard(target.projectId, {
    title: (typeof body.title === 'string' && body.title) || lead.name || lead.email || lead.phone,
    column: target.columnId,
    ...(target.boardId ? { board: target.boardId } : {}),
    ...(body.customFields ? { customFields: body.customFields } : {}),
  });
  return { projectId: target.projectId, cardId: refId(card._id), created: true, columnId: target.columnId };
}

let shared: { runtime: AutomationsRuntime; gateway: JsynqConversationGateway; clients: WorkspaceClients } | null = null;

/** The same runtime the worker builds (gateway on JSYNQ routes, Mongo run store); timers stay with the worker. */
function webhookRuntime(deps: Deps) {
  if (shared) return shared;
  const clients = new WorkspaceClients(deps);
  const gateway = new JsynqConversationGateway(clients, deps);
  const runtime = createAutomationsRuntime({
    gateway,
    now: deps.now,
    guards: mongoTriggerGuards,
    lookups: { findCardConversation: (w, card, sessions) => gateway.findCardConversation(w, card, sessions), cardFacts: (w, card) => gateway.cardFacts(w, card) },
  });
  if (!runtime) throw new AppError(503, 'Automations are unavailable');
  shared = { runtime, gateway, clients };
  return shared;
}

/** Test seam: forget the cached runtime (new deps). */
export function resetWebhookRuntime() {
  shared = null;
}

const notFound = () => new AppError(404, 'Not found');

/**
 * `POST /api/automations/hooks/:automationId`: starts a webhook-triggered automation with the posted lead. The
 * per-automation secret travels in `X-Attende-Secret`; calls are limited per automation per minute (shared counter).
 * An optional `Idempotency-Key` header makes a retried call start nothing new.
 */
export async function handleAutomationWebhook(params: {
  deps: Deps;
  automationId: string;
  secret: string | undefined;
  idempotencyKey: string | undefined;
  body: () => Promise<unknown>;
}): Promise<{ started: boolean; cardId: string; created: boolean }> {
  if (!/^[0-9a-f]{24}$/i.test(params.automationId)) throw notFound();
  const doc = await AdvancedAutomationModel.findOne({ _id: new mongoose.Types.ObjectId(params.automationId) })
    .select('workspaceId status trigger webhookSecretHash')
    .lean<Pick<IAdvancedAutomation, '_id' | 'workspaceId' | 'status' | 'trigger' | 'webhookSecretHash'> | null>();
  // Unknown, not a webhook automation, or no secret yet: the same answer, so ids cannot be probed.
  if (!doc || doc.trigger?.kind !== 'webhook' || !doc.webhookSecretHash) throw notFound();
  if (!webhookSecretMatches(params.secret, doc.webhookSecretHash)) throw new AppError(401, `Missing or wrong ${WEBHOOK_SECRET_HEADER} header`);
  if (!(await mongoTriggerGuards.takeSlot(`hook:${params.automationId}`, TRIGGER_LIMITS.webhookPerMinute, params.deps.now()))) {
    throw new AppError(429, 'Too many calls for this automation. Try again in a minute.');
  }
  if (doc.status !== 'active') throw new AppError(409, 'This automation is not active');
  // Same rule as the worker: only a workspace whose plan is active or trialing runs automations.
  const entitlement = await EntitlementModel.findOne({ workspaceId: doc.workspaceId }).lean();
  if (!entitlement || !decideAccess(entitlement, params.deps.now()).allowed) throw new AppError(409, 'The workspace plan is not active');
  const t = doc.trigger;
  if (!t.projectId || !t.columnId) throw new AppError(409, 'This automation has no stage for new leads');
  const lead = parseWebhookLead(await params.body());

  const { runtime, clients } = webhookRuntime(params.deps);
  const key = params.idempotencyKey?.trim().slice(0, 100);
  // A retried call (same Idempotency-Key) neither creates another lead nor starts another run.
  const requestId = key ? `hook:${String(doc._id)}:${key}` : null;
  if (requestId) {
    const prior = await AutomationActionModel.findById(requestId).lean();
    if (prior) return { started: false, cardId: String(prior.result?.cardId ?? ''), created: false };
  }
  const client = await clients.require(doc.workspaceId);
  const card = await matchOrCreateLead(client, doc.workspaceId, { projectId: t.projectId, boardId: t.boardId, columnId: t.columnId }, lead);
  if (requestId) {
    try {
      await AutomationActionModel.create({ _id: requestId, workspaceId: doc.workspaceId, state: 'done', result: { projectId: card.projectId, cardId: card.cardId }, at: params.deps.now() });
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) return { started: false, cardId: card.cardId, created: card.created };
      throw error;
    }
  }
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries({ name: lead.name, phone: lead.phone, email: lead.email, company: lead.company, value: lead.value, ...lead.fields })) if (v) vars[`webhook.${k}`] = v;
  const result = await runtime.runtime.onTriggerEvent({
    workspaceId: doc.workspaceId,
    kind: 'webhook',
    automationId: String(doc._id),
    eventId: `hook:${key || randomUUID()}`,
    card: { projectId: card.projectId, cardId: card.cardId, boardId: t.boardId ?? null, columnId: card.columnId ?? null },
    vars,
  });
  log.info('automations.webhook', { workspaceId: doc.workspaceId, automationId: String(doc._id), created: card.created, started: result.started.length > 0 });
  return { started: result.started.length > 0, cardId: card.cardId, created: card.created };
}
