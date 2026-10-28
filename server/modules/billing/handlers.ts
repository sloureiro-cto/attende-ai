import 'server-only';
import { z } from 'zod';
import type { Deps } from '../../deps';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { json, ok, route } from '../../lib/http';
import { errMessage, log } from '../../lib/logger';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { AgentSetupModel } from '../agents/models';
import { decideAccess } from './deriveEntitlements';
import { PlanModel, ProcessedEventModel, SubscriptionModel } from './models';
import { BillingService, getEntitlements } from './service';
import { SUBSCRIPTION_APP_TAG } from './stripeGateway';

const DAY_MS = 86_400_000;
const HANDLED_STRIPE_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
]);

/** `POST /api/stripe/webhook`: raw body, signature verified, idempotent by event id. */
export const postStripeWebhook = route([], async (ctx) => {
  const { deps } = ctx;
  const billing = new BillingService(deps);
  const signature = ctx.header('stripe-signature');
  const body = await ctx.raw(1024 * 1024);
  if (!signature || body.length === 0) throw new AppError(400, 'Missing signature', 'STRIPE_SIGNATURE_INVALID');
  let event;
  try {
    event = deps.stripe.constructEvent(body, signature);
  } catch {
    throw new AppError(400, 'Invalid signature', 'STRIPE_SIGNATURE_INVALID');
  }
  if (await ProcessedEventModel.exists({ _id: event.id })) return json({ received: true, duplicate: true });
  if (HANDLED_STRIPE_EVENTS.has(event.type) && event.subscriptionId) {
    // Always act on the subscription as Stripe has it NOW: events can arrive out of order.
    const sub = await deps.stripe.retrieveSubscription(event.subscriptionId);
    if (sub.metadata.app === SUBSCRIPTION_APP_TAG) {
      await billing.applySubscription(sub);
    } else {
      log.debug('stripe.event_other_product', { eventId: event.id, type: event.type });
    }
  }
  await ProcessedEventModel.updateOne(
    { _id: event.id },
    { $setOnInsert: { source: 'stripe', type: event.type, processedAt: deps.now() } },
    { upsert: true }
  );
  return json({ received: true });
});

const invoicesQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(24) });

const portalSchema = z.object({
  kind: z.enum(['manage', 'payment_method', 'change_plan']).default('manage'),
  returnUrl: z.string().url().optional(),
});

const workspaceGuards = [requireUser, requireWorkspace];

/**
 * `GET /api/attende/entitlements`: same shape as the JSYNQ-era route, plus `subscription`. Auth
 * only, no plan gate: an expired trial still gets a 200 with `access.allowed=false`.
 */
export const getEntitlementsRoute = route(workspaceGuards, async (ctx) => {
  const { deps } = ctx;
  const { workspaceId } = ctxOf(ctx);
  const ent = await getEntitlements(workspaceId);
  const decision = decideAccess(ent, deps.now());
  const trialEndsAt = ent?.status === 'trialing' && ent.trialEndsAt ? new Date(ent.trialEndsAt) : null;
  const [usage, sub] = await Promise.all([ent ? usageOf(deps, workspaceId, ent) : null, SubscriptionModel.findOne({ workspaceId }).lean()]);
  const plan = sub?.planSlug ? await PlanModel.findOne({ slug: sub.planSlug }).lean() : null;
  const price = plan?.prices.find((p) => p.id === sub?.priceId);
  return json({
    status: true,
    entitlements: ent
      ? {
          tier: ent.tier,
          status: ent.status,
          limits: ent.limits,
          trialEndsAt: trialEndsAt?.toISOString() ?? null,
          trialDaysLeft: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - deps.now().getTime()) / DAY_MS)) : null,
        }
      : null,
    access: decision.allowed ? { allowed: true } : { allowed: false, code: decision.reference, message: decision.message },
    usage,
    subscription: sub
      ? {
          planSlug: sub.planSlug ?? null,
          status: sub.status,
          price: price ? { amount: price.amount / 100, currency: price.currency, interval: price.interval, intervalCount: price.intervalCount } : null,
          trialEndsAt: sub.trialEnd ? new Date(sub.trialEnd).toISOString() : null,
          currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd === true,
          canceledAt: sub.canceledAt ? new Date(sub.canceledAt).toISOString() : null,
        }
      : null,
  });
});

/** `GET /api/attende/billing/invoices`: Stripe invoices of the workspace's customer, newest first. No customer yet -> an empty list. */
export const getInvoices = route(workspaceGuards, async (ctx) => {
  const { workspaceId } = ctxOf(ctx);
  const parsed = invoicesQuery.safeParse(ctx.query);
  if (!parsed.success) throw new AppError(422, 'Invalid query', 'BILLING_INVALID_QUERY');
  const sub = await SubscriptionModel.findOne({ workspaceId }).select('stripeCustomerId').lean();
  const invoices = sub?.stripeCustomerId ? await ctx.deps.stripe.listInvoices(sub.stripeCustomerId, parsed.data.limit) : [];
  return ok({ invoices });
});

/** `POST /api/attende/billing/portal`: Stripe customer portal: home (invoices, cancel), card update, or plan change. */
export const postPortal = route(workspaceGuards, async (ctx) => {
  const { workspaceId } = ctxOf(ctx);
  const parsed = portalSchema.safeParse((await ctx.body()) ?? {});
  if (!parsed.success) throw new AppError(422, 'Invalid body', 'BILLING_INVALID_BODY');
  const sub = await SubscriptionModel.findOne({ workspaceId }).lean();
  if (!sub) throw new AppError(404, 'This workspace has no subscription', 'BILLING_NO_SUBSCRIPTION');
  const frontend = env().FRONTEND_URL.replace(/\/+$/, '');
  // Only ever send the customer back to our own app.
  const returnUrl = parsed.data.returnUrl && new URL(parsed.data.returnUrl).origin === new URL(frontend).origin ? parsed.data.returnUrl : `${frontend}/billing`;
  const flow =
    parsed.data.kind === 'payment_method'
      ? ({ type: 'payment_method_update' } as const)
      : parsed.data.kind === 'change_plan' && sub.stripeSubscriptionId
        ? ({ type: 'subscription_update', subscriptionId: sub.stripeSubscriptionId } as const)
        : undefined;
  const session = await ctx.deps.stripe.createPortalSession({ customerId: sub.stripeCustomerId, returnUrl, flow });
  return ok({ url: session.url });
});

/** Usage block: local counts for agents/docs, JSYNQ (`GET .../usage`) for meters, lines and the trial outbound counter. */
async function usageOf(deps: Pick<Deps, 'partner' | 'now'>, workspaceId: string, ent: NonNullable<Awaited<ReturnType<typeof getEntitlements>>>) {
  const [agents, docsAgg] = await Promise.all([
    AgentSetupModel.countDocuments({ workspaceId }),
    AgentSetupModel.aggregate<{ total: number }>([{ $match: { workspaceId } }, { $group: { _id: null, total: { $sum: { $size: '$documents' } } } }]),
  ]);
  let jsynq: Awaited<ReturnType<Deps['partner']['getUsage']>> | null = null;
  try {
    jsynq = await deps.partner.getUsage(workspaceId);
  } catch (error) {
    log.warn('usage.jsynq_unavailable', { workspaceId, error: errMessage(error) });
  }
  return {
    month: jsynq?.month ?? deps.now().toISOString().slice(0, 7),
    aiReplies: { used: jsynq?.meters.aiReplies ?? null, limit: ent.limits.aiRepliesPerMonth },
    lines: { used: jsynq?.live.messagingChannels ?? null, limit: ent.limits.lines },
    agents: { used: agents, limit: ent.limits.agents },
    docs: { used: docsAgg[0]?.total ?? 0, limit: ent.limits.docs },
    trialOutbound: ent.status === 'trialing' ? { used: jsynq?.limits?.outboundUsed ?? null, cap: ent.trialOutboundCap ?? null } : null,
  };
}
