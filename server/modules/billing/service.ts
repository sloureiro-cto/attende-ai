import 'server-only';
import type { Deps } from '../../deps';
import { env } from '../../config/env';
import { sha256Hex } from '../../lib/crypto';
import { errMessage, log } from '../../lib/logger';
import { deriveEntitlements, type Entitlements } from './deriveEntitlements';
import { toJsynqLimits } from './jsynqLimits';
import { EntitlementModel, LimitsSyncModel, PlanModel, SubscriptionModel, type IPlan } from './models';
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
 * entitlements -> JSYNQ limits. Every step is idempotent, so the webhook, the signup and the
 * reconcile cron can all call it.
 */
export class BillingService {
  constructor(private readonly deps: Pick<Deps, 'stripe' | 'partner' | 'now'>) {}

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
    await this.syncLimits(workspaceId);
    return next;
  }

  /**
   * Pushes the JSYNQ limits for the stored entitlements when they changed since the last
   * acknowledged push (`limits_sync`). Never throws: a failure is recorded and the reconcile cron retries.
   */
  async syncLimits(workspaceId: string, opts: { force?: boolean } = {}): Promise<boolean> {
    const ent = await getEntitlements(workspaceId);
    if (!ent) return false;
    const desired = toJsynqLimits(ent, env().BILLING_GRACE_DAYS);
    const desiredHash = sha256Hex(JSON.stringify(desired));
    const row = await LimitsSyncModel.findOneAndUpdate(
      { workspaceId },
      { $set: { desired, desiredHash } },
      { upsert: true, new: true }
    ).lean();
    if (!opts.force && row?.syncedHash === desiredHash) return true;
    try {
      const doc = await this.deps.partner.putLimits(workspaceId, desired);
      await LimitsSyncModel.updateOne(
        { workspaceId, desiredHash },
        { $set: { syncedHash: desiredHash, syncedAt: this.deps.now(), jsynqVersion: doc?.version, attempts: 0 }, $unset: { lastError: 1 } }
      );
      log.info('billing.limits_synced', { workspaceId, status: desired.status, validUntil: desired.validUntil });
      return true;
    } catch (error) {
      await LimitsSyncModel.updateOne({ workspaceId }, { $inc: { attempts: 1 }, $set: { lastError: errMessage(error).slice(0, 300) } });
      log.warn('billing.limits_sync_failed', { workspaceId, error: errMessage(error) });
      return false;
    }
  }

  /** 15-minute cron: refresh subscriptions from Stripe (missed webhooks) and retry unsynced limits. */
  async reconcile(): Promise<{ subscriptions: number; limits: number }> {
    const staleBefore = new Date(this.deps.now().getTime() - RECONCILE_STALE_MS);
    const subs = await SubscriptionModel.find({
      stripeSubscriptionId: { $type: 'string' },
      $or: [{ reconciledAt: { $lt: staleBefore } }, { reconciledAt: { $exists: false } }],
      // Long-canceled subscriptions do not change any more.
      $nor: [{ status: 'canceled', updatedAt: { $lt: new Date(this.deps.now().getTime() - 7 * 86_400_000) } }],
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
    const pending = await LimitsSyncModel.find({ $expr: { $ne: ['$desiredHash', { $ifNull: ['$syncedHash', ''] }] } })
      .limit(RECONCILE_BATCH)
      .select('workspaceId')
      .lean();
    let limits = 0;
    for (const p of pending) if (await this.syncLimits(p.workspaceId)) limits += 1;
    return { subscriptions, limits };
  }
}
