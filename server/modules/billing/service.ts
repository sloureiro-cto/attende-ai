import 'server-only';
import type { Deps } from '../../deps';
import { env } from '../../config/env';
import type { UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { tierOfPrice } from './catalog';
import { deriveEntitlements, entitlementsWithoutAttendePlan, readJsynqSubscription, type Entitlements } from './deriveEntitlements';
import { enforceAccess, workspaceActor, workspaceClient } from './enforcement';
import { AgentPauseModel, EntitlementModel, SubscriptionModel, type ISubscription } from './models';
import type { BillingSubscription, StripeGateway } from './stripeGateway';
import { resumeAiQuotaPauses } from './usage';

const RECONCILE_STALE_MS = 15 * 60_000;
const RECONCILE_BATCH = 200;
const DAY_MS = 86_400_000;

export async function getEntitlements(workspaceId: string): Promise<Entitlements | null> {
  const row = await EntitlementModel.findOne({ workspaceId }).lean();
  if (!row) return null;
  const { tier, limits, status, trialEndsAt, currentPeriodEnd, trialOutboundCap, source } = row;
  return {
    tier,
    limits,
    status,
    source: source ?? 'attende',
    ...(trialEndsAt ? { trialEndsAt } : {}),
    ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
    ...(trialOutboundCap ? { trialOutboundCap } : {}),
  };
}

/** The Stripe fields kept on the local subscription record. */
const subscriptionFields = (sub: BillingSubscription) => ({
  source: 'attende' as const,
  stripeCustomerId: sub.customerId,
  stripeSubscriptionId: sub.id,
  status: sub.status,
  priceId: sub.priceId ?? undefined,
  currency: sub.currency ?? undefined,
  trialEnd: sub.trialEnd,
  currentPeriodEnd: sub.currentPeriodEnd,
  cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  canceledAt: sub.canceledAt,
});

type BillingDeps = Pick<Deps, 'user' | 'now'> & { stripe?: StripeGateway };

/**
 * Billing state of one workspace. The source of truth is the workspace's own JSYNQ subscription
 * (`GET /api/subscriptions/me`, synced by JSYNQ's Stripe webhook), read when a page loads, after every billing action
 * and by the reconcile cron and the worker. From it: the local subscription record, the entitlements Attende enforces
 * itself (limits, usage, gate), and the agents paused or resumed in JSYNQ. Every step is idempotent.
 *
 * `stripe` is optional: the worker has no Stripe key, and only the cancel-at-period-end flag and exact dates are read
 * from Stripe (JSYNQ's API lacks the flag; its `canceledAt` mirrors Stripe's `cancel_at`).
 */
export class BillingService {
  constructor(private readonly deps: BillingDeps) {}

  private async save(workspaceId: string, next: Entitlements | null, previous: Entitlements | null): Promise<Entitlements | null> {
    if (!next) return previous;
    await EntitlementModel.updateOne(
      { workspaceId },
      {
        $set: { ...next },
        $unset: { ...(next.trialEndsAt ? {} : { trialEndsAt: 1 }), ...(next.trialOutboundCap ? {} : { trialOutboundCap: 1 }), ...(next.currentPeriodEnd ? {} : { currentPeriodEnd: 1 }) },
      },
      { upsert: true }
    );
    if (previous?.status !== next.status || previous?.tier !== next.tier || previous?.source !== next.source) {
      log.info('billing.entitlements_applied', { workspaceId, status: next.status, tier: next.tier, source: next.source });
    }
    await enforceAccess(this.deps, workspaceId);
    return next;
  }

  /** Applies a fresh Stripe subscription of an `attende-*` plan (start-trial, billing actions, refresh). */
  async applyStripeSubscription(workspaceId: string, userId: string | null, sub: BillingSubscription): Promise<Entitlements | null> {
    const local = await SubscriptionModel.findOne({ workspaceId }).lean<ISubscription>();
    const tier = tierOfPrice(sub.priceId)?.slug ?? local?.planSlug ?? null;
    if (!tier) {
      log.warn('billing.subscription_not_attende', { workspaceId, subscriptionId: sub.id });
      return getEntitlements(workspaceId);
    }
    await SubscriptionModel.updateOne(
      { workspaceId },
      { $set: { ...subscriptionFields(sub), planSlug: tier, reconciledAt: this.deps.now() }, $setOnInsert: { userId: userId ?? 'unknown' } },
      { upsert: true }
    );
    const previous = await getEntitlements(workspaceId);
    const next = deriveEntitlements({ plan: { slug: tier }, stripeStatus: sub.status, trialEndDate: sub.trialEnd, currentPeriodEnd: sub.currentPeriodEnd, previous });
    return this.save(workspaceId, next, previous);
  }

  /**
   * Re-reads the workspace's JSYNQ subscription and applies it. `client` acts in the workspace (the signed-in user's
   * own token, or a server-minted one for the owner); `userId` is recorded as the member to act as when none is yet.
   * Never throws on JSYNQ or Stripe trouble: the stored entitlements stay as they were.
   */
  async refresh(workspaceId: string, opts: { client?: UserClient; userId?: string } = {}): Promise<Entitlements | null> {
    const previous = await getEntitlements(workspaceId);
    try {
      const client = opts.client ?? (await workspaceClient(this.deps, workspaceId));
      if (!client) return previous;
      const local = await SubscriptionModel.findOne({ workspaceId }).lean<ISubscription>();
      const userId = opts.userId ?? local?.userId ?? (await workspaceActor(workspaceId));
      const billing = readJsynqSubscription(await client.getMySubscription());

      if (billing.kind === 'attende') {
        const sub = this.deps.stripe ? await this.deps.stripe.retrieveSubscription(billing.stripeSubscriptionId).catch(() => null) : null;
        if (sub) return await this.applyStripeSubscription(workspaceId, userId, sub);
        // No Stripe here (the worker), or Stripe unreachable: JSYNQ's copy is enough for access.
        const cancelAtPeriodEnd = (billing.status === 'active' || billing.status === 'trialing') && !!billing.canceledAt;
        await SubscriptionModel.updateOne(
          { workspaceId },
          {
            $set: {
              source: 'attende',
              stripeSubscriptionId: billing.stripeSubscriptionId,
              status: billing.status,
              planSlug: billing.tier,
              priceId: billing.priceId ?? undefined,
              trialEnd: billing.trialEnd,
              currentPeriodEnd: billing.currentPeriodEnd,
              cancelAtPeriodEnd,
              canceledAt: billing.canceledAt,
              reconciledAt: this.deps.now(),
            },
            $setOnInsert: { userId: userId ?? 'unknown' },
          },
          { upsert: true }
        );
        const next = deriveEntitlements({ plan: { slug: billing.tier }, stripeStatus: billing.status, trialEndDate: billing.trialEnd, currentPeriodEnd: billing.currentPeriodEnd, previous });
        return await this.save(workspaceId, next, previous);
      }

      // Not (or no longer) an Attende subscription in JSYNQ. An Attende customer's record keeps its Stripe id.
      if (local?.source === 'attende' && local.stripeSubscriptionId && billing.kind === 'none') {
        const sub = this.deps.stripe ? await this.deps.stripe.retrieveSubscription(local.stripeSubscriptionId).catch(() => null) : null;
        if (sub) return await this.applyStripeSubscription(workspaceId, userId, sub);
        await SubscriptionModel.updateOne({ workspaceId }, { $set: { reconciledAt: this.deps.now() } });
        return previous;
      }
      const next = entitlementsWithoutAttendePlan(billing, previous);
      if (billing.kind === 'jsynq_plan' && (billing.paid || local?.source === 'jsynq_plan')) {
        await SubscriptionModel.updateOne(
          { workspaceId },
          { $set: { source: 'jsynq_plan', status: billing.status, planSlug: billing.planSlug, reconciledAt: this.deps.now() }, $setOnInsert: { userId: userId ?? 'unknown' } },
          { upsert: true }
        );
      } else if (local) {
        await SubscriptionModel.updateOne({ workspaceId }, { $set: { status: billing.status ?? local.status, reconciledAt: this.deps.now() } });
      }
      return await this.save(workspaceId, next, previous);
    } catch (error) {
      log.warn('billing.refresh_failed', { workspaceId, error: errMessage(error) });
      return previous;
    }
  }

  /**
   * Cron (every 15 min) and worker: re-read the JSYNQ subscription of every workspace with a record (missed changes,
   * a trial that ended, a cancellation that took effect), then pause or resume the agents of every workspace whose
   * access changed (lapsed paid period, reactivation, a failed earlier pause), then lift AI-quota pauses of a new month.
   */
  async reconcile(opts: { staleMs?: number } = {}): Promise<{ subscriptions: number; enforced: number; aiQuotaResumed: number }> {
    const now = this.deps.now();
    const staleBefore = new Date(now.getTime() - (opts.staleMs ?? RECONCILE_STALE_MS));
    const rows = await SubscriptionModel.find({
      $or: [{ reconciledAt: { $lt: staleBefore } }, { reconciledAt: { $exists: false } }],
      // Long-ended subscriptions do not change any more.
      $nor: [{ status: 'canceled', updatedAt: { $lt: new Date(now.getTime() - 7 * DAY_MS) } }],
    })
      .sort({ reconciledAt: 1 })
      .limit(RECONCILE_BATCH)
      .lean<ISubscription[]>();
    let subscriptions = 0;
    for (const row of rows) {
      await this.refresh(row.workspaceId);
      subscriptions += 1;
    }

    const graceStart = new Date(now.getTime() - env().BILLING_GRACE_DAYS * DAY_MS);
    const [blocked, paused] = await Promise.all([
      EntitlementModel.find({
        $or: [
          { status: 'canceled' },
          { status: 'trialing', trialEndsAt: { $lt: now } },
          { status: { $in: ['active', 'past_due'] }, currentPeriodEnd: { $lt: graceStart } },
        ],
      })
        .select('workspaceId')
        .limit(RECONCILE_BATCH * 5)
        .lean(),
      AgentPauseModel.find({ reasons: 'access' }).select('workspaceId').limit(RECONCILE_BATCH * 5).lean(),
    ]);
    const ids = [...new Set([...blocked, ...paused].map((r) => r.workspaceId))];
    let enforced = 0;
    for (const workspaceId of ids) {
      try {
        await enforceAccess(this.deps, workspaceId);
        enforced += 1;
      } catch (error) {
        log.warn('billing.enforce_failed', { workspaceId, error: errMessage(error) });
      }
    }
    const aiQuotaResumed = await resumeAiQuotaPauses(this.deps);
    return { subscriptions, enforced, aiQuotaResumed };
  }
}
