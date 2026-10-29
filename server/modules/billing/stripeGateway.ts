import 'server-only';
import Stripe from 'stripe';

/**
 * Attende calls Stripe only for what JSYNQ's API lacks, on JSYNQ's own Stripe account (`STRIPE_SECRET_KEY` is JSYNQ's
 * live key) and only on a workspace's JSYNQ subscription of an `attende-*` plan: trial length, cancel at period end,
 * resume, plan change and the customer portal. JSYNQ's own Stripe webhook syncs its database and channel gating from
 * every change. Nothing here creates customers or subscriptions: JSYNQ does (`POST /api/subscriptions/upgrade-to-trial`).
 */

/** The subset of a Stripe subscription this service reads. */
export type BillingSubscription = {
  id: string;
  status: string;
  customerId: string;
  /** The (single) subscription item: JSYNQ creates one, quantity = member count. */
  itemId: string | null;
  quantity: number;
  priceId: string | null;
  currency: string | null;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  /** Set to end at the period end (can still be undone). */
  cancelAtPeriodEnd: boolean;
  /** When the cancellation was requested, or when the subscription ended. */
  canceledAt: Date | null;
  defaultPaymentMethodId: string | null;
};

export type SubscriptionUpdate = {
  /** End of the free trial: a date, or `now` to start billing at once. */
  trialEnd?: Date | 'now';
  cancelAtPeriodEnd?: boolean;
  /** Swap the item's price (plan change). `quantity` is kept as JSYNQ set it. */
  item?: { id: string; priceId: string; quantity: number };
  defaultPaymentMethodId?: string;
  prorationBehavior?: 'none' | 'create_prorations';
  /** `error_if_incomplete`: a declined payment rejects the update and nothing changes. */
  paymentBehavior?: 'allow_incomplete' | 'error_if_incomplete';
  idempotencyKey?: string;
};

/** Everything this service does with Stripe, behind a port so tests never call Stripe. */
export interface StripeGateway {
  retrievePaymentMethod(id: string): Promise<{ id: string; type: string; customerId: string | null; fingerprint: string | null }>;
  retrieveSubscription(id: string): Promise<BillingSubscription>;
  updateSubscription(id: string, update: SubscriptionUpdate): Promise<BillingSubscription>;
  /** Compensation only: ends a subscription this service just made JSYNQ create. */
  cancelSubscriptionNow(id: string): Promise<void>;
  createPortalSession(input: { customerId: string; returnUrl: string; flow?: { type: 'payment_method_update' } }): Promise<{ url: string }>;
}

const toDate = (s: number | null | undefined) => (typeof s === 'number' ? new Date(s * 1000) : null);
const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : (v?.id ?? null));

export function mapSubscription(sub: Stripe.Subscription): BillingSubscription {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  // Newer API versions moved the period to the item; older ones keep it on the subscription.
  const periodEnd = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return {
    id: sub.id,
    status: sub.status,
    customerId: idOf(sub.customer as string | { id: string }) ?? '',
    itemId: item?.id ?? null,
    quantity: item?.quantity ?? 1,
    priceId: item?.price?.id ?? null,
    currency: sub.currency ?? item?.price?.currency ?? null,
    trialEnd: toDate(sub.trial_end),
    currentPeriodEnd: toDate(periodEnd),
    // The portal may schedule the end with `cancel_at` instead of the flag; both mean "ends, can be undone".
    cancelAtPeriodEnd: sub.status !== 'canceled' && (sub.cancel_at_period_end === true || typeof sub.cancel_at === 'number'),
    canceledAt: toDate(sub.canceled_at),
    defaultPaymentMethodId: idOf(sub.default_payment_method as string | { id: string } | null),
  };
}

export function stripeGateway(secretKey: string): StripeGateway {
  const stripe = new Stripe(secretKey);
  return {
    async retrievePaymentMethod(id) {
      const pm = await stripe.paymentMethods.retrieve(id);
      return { id: pm.id, type: pm.type, customerId: idOf(pm.customer as string | { id: string } | null), fingerprint: pm.card?.fingerprint ?? null };
    },
    async retrieveSubscription(id) {
      return mapSubscription(await stripe.subscriptions.retrieve(id));
    },
    async updateSubscription(id, u) {
      const params: Stripe.SubscriptionUpdateParams = {
        ...(u.trialEnd !== undefined ? { trial_end: u.trialEnd === 'now' ? 'now' : Math.floor(u.trialEnd.getTime() / 1000) } : {}),
        ...(u.cancelAtPeriodEnd !== undefined ? { cancel_at_period_end: u.cancelAtPeriodEnd } : {}),
        ...(u.item ? { items: [{ id: u.item.id, price: u.item.priceId, quantity: u.item.quantity }] } : {}),
        ...(u.defaultPaymentMethodId ? { default_payment_method: u.defaultPaymentMethodId } : {}),
        ...(u.prorationBehavior ? { proration_behavior: u.prorationBehavior } : {}),
        ...(u.paymentBehavior ? { payment_behavior: u.paymentBehavior } : {}),
      };
      const sub = await stripe.subscriptions.update(id, params, u.idempotencyKey ? { idempotencyKey: u.idempotencyKey } : undefined);
      return mapSubscription(sub);
    },
    async cancelSubscriptionNow(id) {
      await stripe.subscriptions.cancel(id);
    },
    async createPortalSession(input) {
      const s = await stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
        ...(input.flow?.type === 'payment_method_update' ? { flow_data: { type: 'payment_method_update' } } : {}),
      });
      return { url: s.url };
    },
  };
}
