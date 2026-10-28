import 'server-only';
import type { Deps } from '../../deps';
import { env } from '../../config/env';
import { errMessage, log } from '../../lib/logger';
import { deriveEntitlements, type Entitlements } from './deriveEntitlements';
import { enforceAccess } from './enforcement';
import { AgentPauseModel, EntitlementModel, PlanModel, SubscriptionModel, type IPlan } from './models';
import { resumeAiQuotaPauses } from './usage';
import type { BillingSubscription } from './stripeGateway';

const RECONCILE_STALE_MS = 15 * 60_000;
const RECONCILE_BATCH = 200;

export async function getEntitlements(workspaceId: string): Promise<Entitlements | null> {
  const row = await EntitlementModel.findOne({ workspaceId }).lean();
  if (!row) return null;
  const { tier, limits, status, trialEndsAt, currentPeriodEnd, trialOutboundCap } = row;
  return { tier, limits, status, ...(trialEndsAt ? { trialEndsAt } : {}), ...(currentPeriodEnd ? { currentPeriodEnd } : {}), ...(trialOutboundCap ? { trialOutboundCap } : {}) };
}

export const findPlanByPrice = (priceId: string | null) =>
  priceId ? PlanModel.findOne({ 'prices.id': priceId }).lean<IPlan | null>() : Promise.resolve(null);

/**
 * Billing state machine of one workspace: Stripe subscription -> stored subscription ->
 * entitlements -> agents paused or resumed in JSYNQ. Every step is idempotent, so the webhook, the
 * signup and the reconcile cron can all call it. JSYNQ keeps no Attende limits: the plan is
 * enforced here (`limits.ts`, `usage.ts`, `enforcement.ts`).
 */
export class BillingService {
  constructor(private readonly deps: Pick<Deps, 'stripe' | 'user' | 'now'>) {}

  /** Applies a (fresh) Stripe subscription to the workspace it belongs to. Returns the entitlements. */
  async applySubscription(sub: BillingSubscription, hint?: { workspaceId: string; userId: string }): Promise<Entitlements | null> {
    const workspaceId = hint?.workspaceId ?? sub.metadata.workspaceId;
    if (!workspaceId) {
      log.warn('billing.subscription_without_workspace', { subscriptionId: sub.id });
      return null;
    }
    const plan = await findPlanByPrice(sub.priceId);
    await SubscriptionModel.updateOne(
      { workspaceId },
      {
        $set: {
          stripeCustomerId: sub.customerId,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          priceId: sub.priceId ?? undefined,
          planSlug: plan?.slug,
          trialEnd: sub.trialEnd,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt,
          reconciledAt: this.deps.now(),
        },
        $setOnInsert: { userId: hint?.userId ?? sub.metadata.userId ?? 'unknown' },
      },
      { upsert: true }
    );
    const previous = await getEntitlements(workspaceId);
    const next = deriveEntitlements({ plan, stripeStatus: sub.status, trialEndDate: sub.trialEnd, currentPeriodEnd: sub.currentPeriodEnd, previous });
    if (!next) return previous;
    await EntitlementModel.updateOne(
      { workspaceId },
      { $set: { ...next }, $unset: { ...(next.trialEndsAt ? {} : { trialEndsAt: 1 }), ...(next.trialOutboundCap ? {} : { trialOutboundCap: 1 }), ...(next.currentPeriodEnd ? {} : { currentPeriodEnd: 1 }) } },
      { upsert: true }
    );
    log.info('billing.entitlements_applied', { workspaceId, subscriptionId: sub.id, status: next.status, tier: next.tier });
    await enforceAccess(this.deps, workspaceId);
    return next;
  }

  /**
   * 15-minute cron: refresh subscriptions from Stripe (missed webhooks), then pause or resume the
   * agents of every workspace whose access changed (trial ended without a webhook, lapsed paid
   * period, reactivation, failed earlier pause), then lift AI-quota pauses of a new month.
   */
  async reconcile(): Promise<{ subscriptions: number; enforced: number; aiQuotaResumed: number }> {
    const now = this.deps.now();
    const staleBefore = new Date(now.getTime() - RECONCILE_STALE_MS);
    const subs = await SubscriptionModel.find({
      stripeSubscriptionId: { $type: 'string' },
      $or: [{ reconciledAt: { $lt: staleBefore } }, { reconciledAt: { $exists: false } }],
      // Long-canceled subscriptions do not change any more.
      $nor: [{ status: 'canceled', updatedAt: { $lt: new Date(now.getTime() - 7 * 86_400_000) } }],
    })
      .sort({ reconciledAt: 1 })
      .limit(RECONCILE_BATCH)
      .lean();
    let subscriptions = 0;
    for (const row of subs) {
      try {
        const sub = await this.deps.stripe.retrieveSubscription(row.stripeSubscriptionId!);
        await this.applySubscription(sub, { workspaceId: row.workspaceId, userId: row.userId });
        subscriptions += 1;
      } catch (error) {
        log.warn('billing.reconcile_failed', { workspaceId: row.workspaceId, error: errMessage(error) });
      }
    }

    const graceStart = new Date(now.getTime() - env().BILLING_GRACE_DAYS * 86_400_000);
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
