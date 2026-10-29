import 'server-only';
import { z } from 'zod';
import type { Deps } from '../../deps';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { json, ok, route, type HttpContext } from '../../lib/http';
import { mapJsynqError, viaJsynq, type UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { priceFor, tierOfPrice } from './catalog';
import { decideAccess, readJsynqSubscription } from './deriveEntitlements';
import { liveCount, type PlanResource } from './limits';
import { SubscriptionModel, type ISubscription } from './models';
import { BillingService, getEntitlements } from './service';
import type { BillingSubscription } from './stripeGateway';
import { normalizeTierSlug } from './tiers';
import { counters, monthOf } from './usage';

const DAY_MS = 86_400_000;
/** The entitlements page re-reads JSYNQ when the stored copy is older than this. */
const REFRESH_AFTER_MS = 60_000;

const invoicesQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(24) });
const portalSchema = z.object({
  kind: z.enum(['manage', 'payment_method']).default('manage'),
  returnUrl: z.string().url().optional(),
});
const changePlanSchema = z.object({
  planSlug: z
    .string()
    .refine((s) => normalizeTierSlug(s) !== null, { message: 'unknown plan' })
    .transform((s) => normalizeTierSlug(s)!),
});

const workspaceGuards = [requireUser, requireWorkspace];

const billingError = (status: number, reference: string, message: string) => new AppError(status, message, reference, { code: reference });

/**
 * `GET /api/attende/entitlements`: same shape as before, plus `source` (`attende` | `jsynq_plan`) on `entitlements`
 * and `subscription`. Auth only, no plan gate: an expired trial still gets a 200 with `access.allowed=false`. The
 * stored copy is refreshed from JSYNQ (`GET /api/subscriptions/me`, with the caller's token) when it is missing or
 * older than a minute; that is also how a workspace on a paid JSYNQ plan gets Attende the first time.
 */
export const getEntitlementsRoute = route(workspaceGuards, async (ctx) => {
  const { deps } = ctx;
  const { workspaceId, token, userId } = ctxOf(ctx);
  const client = deps.user(token);
  const stored = await SubscriptionModel.findOne({ workspaceId }).select('reconciledAt').lean();
  const fresh = stored?.reconciledAt && deps.now().getTime() - new Date(stored.reconciledAt).getTime() < REFRESH_AFTER_MS;
  const ent = fresh ? await getEntitlements(workspaceId) : await new BillingService(deps).refresh(workspaceId, { client, userId });
  const decision = decideAccess(ent, deps.now());
  const trialEndsAt = ent?.status === 'trialing' && ent.trialEndsAt ? new Date(ent.trialEndsAt) : null;
  const [usage, sub] = await Promise.all([ent ? usageOf(deps, client, workspaceId, ent) : null, SubscriptionModel.findOne({ workspaceId }).lean<ISubscription>()]);
  const source = sub?.source ?? 'attende';
  const price = source === 'attende' ? tierOfPrice(sub?.priceId)?.price : undefined;
  return json({
    status: true,
    entitlements: ent
      ? {
          tier: ent.tier,
          status: ent.status,
          source: ent.source ?? 'attende',
          limits: ent.limits,
          trialEndsAt: trialEndsAt?.toISOString() ?? null,
          trialDaysLeft: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - deps.now().getTime()) / DAY_MS)) : null,
        }
      : null,
    access: decision.allowed ? { allowed: true } : { allowed: false, code: decision.reference, message: decision.message },
    usage,
    subscription: sub
      ? {
          source,
          planSlug: sub.planSlug ?? null,
          status: sub.status,
          price: price ? { amount: price.amount / 100, currency: price.currency, interval: price.interval, intervalCount: 1 } : null,
          trialEndsAt: source === 'attende' && sub.trialEnd ? new Date(sub.trialEnd).toISOString() : null,
          currentPeriodEnd: source === 'attende' && sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
          cancelAtPeriodEnd: source === 'attende' && sub.cancelAtPeriodEnd === true,
          canceledAt: source === 'attende' && sub.canceledAt ? new Date(sub.canceledAt).toISOString() : null,
          /** The Attende subscription ended: it cannot be reactivated from here (support does it). */
          ended: source === 'attende' && sub.status === 'canceled',
        }
      : null,
  });
});

/** `GET /api/attende/billing/invoices`: JSYNQ's `GET /api/workspaces/:id/billing/invoices` with the caller's token. */
export const getInvoices = route(workspaceGuards, async (ctx) => {
  const { workspaceId, token } = ctxOf(ctx);
  const parsed = invoicesQuery.safeParse(ctx.query);
  if (!parsed.success) throw new AppError(422, 'Invalid query', 'BILLING_INVALID_QUERY');
  const invoices = await viaJsynq(() => ctx.deps.user(token).listWorkspaceInvoices(workspaceId));
  return ok({ invoices: [...invoices].sort((a, b) => b.created - a.created).slice(0, parsed.data.limit) });
});

/**
 * The workspace's Attende subscription, as Stripe has it now, for an action by its owner. Refused for a workspace whose
 * Attende comes with its JSYNQ plan (409 `BILLING_MANAGED_IN_JSYNQ`): its billing is never touched from here.
 */
async function ownedAttendeSubscription(ctx: HttpContext): Promise<{ workspaceId: string; userId: string; client: UserClient; sub: BillingSubscription }> {
  const { workspaceId, token, userId } = ctxOf(ctx);
  const client = ctx.deps.user(token);
  const ws = await viaJsynq(() => client.getWorkspace(workspaceId));
  const owner = ws?.owner ? String(typeof ws.owner === 'string' ? ws.owner : ws.owner._id) : null;
  if (owner !== userId) throw billingError(403, 'BILLING_OWNER_ONLY', 'Only the workspace owner can change its subscription');
  const billing = readJsynqSubscription(await viaJsynq(() => client.getMySubscription()));
  if (billing.kind === 'jsynq_plan') throw billingError(409, 'BILLING_MANAGED_IN_JSYNQ', 'This workspace is billed by its JSYNQ plan: manage it in JSYNQ');
  const local = await SubscriptionModel.findOne({ workspaceId }).lean<ISubscription>();
  const id = billing.kind === 'attende' ? billing.stripeSubscriptionId : local?.source === 'attende' ? local.stripeSubscriptionId : undefined;
  if (!id) throw billingError(404, 'BILLING_NO_SUBSCRIPTION', 'This workspace has no Attende subscription');
  const sub = await ctx.deps.stripe.retrieveSubscription(id);
  if (!tierOfPrice(sub.priceId)) throw billingError(409, 'BILLING_MANAGED_IN_JSYNQ', 'This subscription is not an Attende plan');
  return { workspaceId, userId, client, sub };
}

const ended = (sub: BillingSubscription) => sub.status === 'canceled' || sub.status === 'incomplete_expired';
const endedError = () =>
  billingError(409, 'BILLING_SUBSCRIPTION_ENDED', 'This subscription has ended and cannot be reactivated here. Contact support to subscribe again.');

async function stripeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) throw error;
    const type = (error as { type?: string })?.type;
    if (type === 'StripeCardError') throw billingError(402, 'BILLING_PAYMENT_FAILED', errMessage(error));
    log.error('billing.stripe_failed', { error: errMessage(error) });
    throw billingError(502, 'BILLING_STRIPE_UNAVAILABLE', 'The payment provider did not answer, try again');
  }
}

/** Applies the updated subscription now (JSYNQ's webhook will sync its own copy) and answers the new state. */
async function applied(deps: Deps, workspaceId: string, userId: string, sub: BillingSubscription) {
  const entitlements = await new BillingService(deps).applyStripeSubscription(workspaceId, userId, sub);
  return ok({
    subscription: { status: sub.status, planSlug: tierOfPrice(sub.priceId)?.slug ?? null, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null },
    entitlements,
  });
}

/** `POST /api/attende/billing/cancel`: ends the subscription at the end of the current period (or trial). Owner only. */
export const postCancel = route(workspaceGuards, async (ctx) => {
  const { workspaceId, userId, sub } = await ownedAttendeSubscription(ctx);
  if (ended(sub)) throw endedError();
  const next = sub.cancelAtPeriodEnd ? sub : await stripeCall(() => ctx.deps.stripe.updateSubscription(sub.id, { cancelAtPeriodEnd: true }));
  log.info('billing.cancel_scheduled', { workspaceId, subscriptionId: sub.id });
  return applied(ctx.deps, workspaceId, userId, next);
});

/** `POST /api/attende/billing/resume`: undoes a scheduled cancellation before the period ends. Owner only. */
export const postResume = route(workspaceGuards, async (ctx) => {
  const { workspaceId, userId, sub } = await ownedAttendeSubscription(ctx);
  if (ended(sub)) throw endedError();
  const next = sub.cancelAtPeriodEnd ? await stripeCall(() => ctx.deps.stripe.updateSubscription(sub.id, { cancelAtPeriodEnd: false })) : sub;
  log.info('billing.resumed', { workspaceId, subscriptionId: sub.id });
  return applied(ctx.deps, workspaceId, userId, next);
});

/**
 * `POST /api/attende/billing/change-plan {planSlug}`: swaps the subscription item to the target tier's flat price in
 * the same currency, prorated (Stripe's default). The quantity JSYNQ set (members) is kept; with flat prices it does
 * not change the amount. Owner only.
 */
export const postChangePlan = route(workspaceGuards, async (ctx) => {
  const parsed = changePlanSchema.safeParse((await ctx.body()) ?? {});
  if (!parsed.success) throw new AppError(422, 'Invalid body', 'BILLING_INVALID_BODY');
  const { workspaceId, userId, sub } = await ownedAttendeSubscription(ctx);
  if (ended(sub)) throw endedError();
  const target = priceFor(parsed.data.planSlug, sub.currency ?? tierOfPrice(sub.priceId)!.price.currency);
  if (!target) throw billingError(422, 'BILLING_PLAN_NOT_AVAILABLE', 'This plan is not available in the currency of the subscription');
  if (!sub.itemId) throw billingError(409, 'BILLING_NO_SUBSCRIPTION', 'The subscription has no item to change');
  const next =
    sub.priceId === target.id
      ? sub
      : await stripeCall(() =>
          ctx.deps.stripe.updateSubscription(sub.id, { item: { id: sub.itemId!, priceId: target.id, quantity: sub.quantity }, prorationBehavior: 'create_prorations' })
        );
  log.info('billing.plan_changed', { workspaceId, subscriptionId: sub.id, planSlug: parsed.data.planSlug });
  return applied(ctx.deps, workspaceId, userId, next);
});

/** `POST /api/attende/billing/portal`: Stripe customer portal of the JSYNQ customer (card, invoices). Owner only. */
export const postPortal = route(workspaceGuards, async (ctx) => {
  const parsed = portalSchema.safeParse((await ctx.body()) ?? {});
  if (!parsed.success) throw new AppError(422, 'Invalid body', 'BILLING_INVALID_BODY');
  const { sub } = await ownedAttendeSubscription(ctx);
  const frontend = env().FRONTEND_URL.replace(/\/+$/, '');
  // Only ever send the customer back to our own app.
  const returnUrl = parsed.data.returnUrl && new URL(parsed.data.returnUrl).origin === new URL(frontend).origin ? parsed.data.returnUrl : `${frontend}/billing`;
  const session = await stripeCall(() =>
    ctx.deps.stripe.createPortalSession({ customerId: sub.customerId, returnUrl, ...(parsed.data.kind === 'payment_method' ? { flow: { type: 'payment_method_update' as const } } : {}) })
  );
  return ok({ url: session.url });
});

/**
 * Usage block (same shape as before): AI replies and the trial outbound counter from this service's own counters,
 * lines/agents/docs counted live from the JSYNQ lists with the caller's token. A list JSYNQ could not answer reads
 * `null` (unknown), never 0.
 */
async function usageOf(deps: Pick<Deps, 'now'>, client: UserClient, workspaceId: string, ent: NonNullable<Awaited<ReturnType<typeof getEntitlements>>>) {
  const now = deps.now();
  const live = async (resource: PlanResource) => {
    try {
      return await liveCount(client, workspaceId, resource);
    } catch (error) {
      log.warn('usage.jsynq_unavailable', { workspaceId, resource, error: errMessage(mapJsynqError(error)) });
      return null;
    }
  };
  const [local, lines, agents, docs] = await Promise.all([counters(workspaceId, now), live('lines'), live('agents'), live('docs')]);
  return {
    month: monthOf(now),
    aiReplies: { used: local.aiReplies, limit: ent.limits.aiRepliesPerMonth },
    lines: { used: lines, limit: ent.limits.lines },
    agents: { used: agents, limit: ent.limits.agents },
    docs: { used: docs, limit: ent.limits.docs },
    trialOutbound: ent.status === 'trialing' ? { used: local.trialOutbound, cap: ent.trialOutboundCap ?? null } : null,
  };
}
