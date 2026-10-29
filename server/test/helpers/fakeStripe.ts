import { ATTENDE_PLANS } from '../../modules/billing/catalog';
import type { BillingSubscription, StripeGateway, SubscriptionUpdate } from '../../modules/billing/stripeGateway';
import type { JsynqInvoice } from '../../lib/jsynq';

let seq = 0;
const id = (prefix: string) => `${prefix}_${(++seq).toString(36)}${Date.now().toString(36)}`;
const DAY_MS = 86_400_000;

/** A price of the fake account: the Attende catalog, JSYNQ's free plan and one paid JSYNQ plan. */
export const FAKE_PRICES: Record<string, { currency: string; amount: number }> = {
  price_jsynq_free: { currency: 'usd', amount: 0 },
  price_jsynq_pro_usd: { currency: 'usd', amount: 2500 },
  ...Object.fromEntries(Object.values(ATTENDE_PLANS).flatMap((p) => p.prices.map((x) => [x.id, { currency: x.currency, amount: x.amount }]))),
};

export type StripeCall = { op: string; id?: string; update?: SubscriptionUpdate };
type ChangeListener = (sub: BillingSubscription, event: 'updated' | 'deleted') => void | Promise<void>;

/**
 * In-memory Stripe account (JSYNQ's): customers, payment methods, subscriptions and invoices. Behaves like Stripe
 * where this service depends on it: a subscription's currency never changes, `trial_end: now` charges the first
 * invoice (a declined card with `error_if_incomplete` rejects the update), `cancel_at_period_end` ends it when the
 * period is over (`advance`). Every change is reported to listeners: the fake JSYNQ syncs its copy from them, as
 * its Stripe webhook does.
 */
export class FakeStripe implements StripeGateway {
  customers = new Map<string, { email: string }>();
  paymentMethods = new Map<string, { customerId: string | null; fingerprint: string; declines: boolean }>();
  subscriptions = new Map<string, BillingSubscription>();
  /** Invoices by subscription id, newest first. */
  invoices = new Map<string, JsynqInvoice[]>();
  portalSessions: Array<{ customerId: string; returnUrl: string; flow?: string }> = [];
  calls: StripeCall[] = [];
  private listeners: ChangeListener[] = [];

  onChange(listener: ChangeListener) {
    this.listeners.push(listener);
  }
  private async emit(sub: BillingSubscription, event: 'updated' | 'deleted') {
    for (const l of this.listeners) await l({ ...sub }, event);
  }

  /** A card typed in the form, before the SetupIntent is confirmed. */
  addCard(pmId: string, fingerprint = `fp_${pmId}`, opts: { declines?: boolean } = {}) {
    this.paymentMethods.set(pmId, { customerId: null, fingerprint, declines: opts.declines ?? false });
  }
  /** What Stripe.js `confirmSetup` does with a SetupIntent's client secret (`seti_<customer>_secret_x`): attaches the card. */
  confirmSetup(clientSecret: string, pmId: string) {
    const customerId = /^seti_(cus_[a-z0-9]+)_secret/.exec(clientSecret)?.[1];
    if (!customerId || !this.customers.has(customerId)) throw new Error('No such setup intent');
    this.paymentMethods.get(pmId)!.customerId = customerId;
  }
  createCustomer(email: string) {
    const cid = id('cus');
    this.customers.set(cid, { email });
    return cid;
  }

  private invoice(sub: BillingSubscription, amount: number) {
    const list = this.invoices.get(sub.id) ?? [];
    const n = list.length + 1;
    list.unshift({ id: id('in'), number: `INV-${n}`, created: Math.floor(Date.now() / 1000) + n, amountPaid: amount, currency: sub.currency ?? 'usd', status: 'paid', hostedInvoiceUrl: null, invoicePdf: null });
    this.invoices.set(sub.id, list);
  }

  /** What JSYNQ's `subscriptions.create` does: trialing, `trial_period_days`, quantity = members. */
  createSubscription(input: { customerId: string; priceId: string; quantity: number; trialDays: number; defaultPaymentMethodId?: string | null }): BillingSubscription {
    const price = FAKE_PRICES[input.priceId];
    if (!price) throw new Error(`No such price: ${input.priceId}`);
    const now = Date.now();
    const sub: BillingSubscription = {
      id: id('sub'),
      status: input.trialDays > 0 ? 'trialing' : 'active',
      customerId: input.customerId,
      itemId: id('si'),
      quantity: input.quantity,
      priceId: input.priceId,
      currency: price.currency,
      trialEnd: input.trialDays > 0 ? new Date(now + input.trialDays * DAY_MS) : null,
      currentPeriodEnd: new Date(now + (input.trialDays > 0 ? input.trialDays : 30) * DAY_MS),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      defaultPaymentMethodId: input.defaultPaymentMethodId ?? null,
    };
    this.subscriptions.set(sub.id, sub);
    if (input.trialDays > 0) this.invoice(sub, 0);
    return { ...sub };
  }

  async retrievePaymentMethod(pmId: string) {
    this.calls.push({ op: 'paymentMethods.retrieve', id: pmId });
    const pm = this.paymentMethods.get(pmId);
    if (!pm) throw new Error('No such payment method');
    return { id: pmId, type: 'card', customerId: pm.customerId, fingerprint: pm.fingerprint };
  }

  async retrieveSubscription(subId: string) {
    this.calls.push({ op: 'subscriptions.retrieve', id: subId });
    const sub = this.subscriptions.get(subId);
    if (!sub) throw new Error('No such subscription');
    return { ...sub };
  }

  async updateSubscription(subId: string, u: SubscriptionUpdate) {
    this.calls.push({ op: 'subscriptions.update', id: subId, update: u });
    const sub = this.subscriptions.get(subId);
    if (!sub) throw new Error('No such subscription');
    if (sub.status === 'canceled') throw new Error('A canceled subscription can only update its cancellation_details and metadata.');
    const next = { ...sub };
    if (u.item) {
      const price = FAKE_PRICES[u.item.priceId];
      if (!price) throw new Error(`No such price: ${u.item.priceId}`);
      // Stripe: every item of a subscription is billed in the subscription's currency, which never changes.
      if (price.currency !== sub.currency) throw new Error(`The price currency (${price.currency}) does not match the subscription currency (${sub.currency}).`);
      next.priceId = u.item.priceId;
      next.quantity = u.item.quantity;
    }
    if (u.defaultPaymentMethodId) {
      if (this.paymentMethods.get(u.defaultPaymentMethodId)?.customerId !== sub.customerId) throw new Error('The payment method must belong to the customer.');
      next.defaultPaymentMethodId = u.defaultPaymentMethodId;
    }
    if (u.cancelAtPeriodEnd !== undefined) next.cancelAtPeriodEnd = u.cancelAtPeriodEnd;
    if (u.trialEnd === 'now') {
      const card = next.defaultPaymentMethodId ? this.paymentMethods.get(next.defaultPaymentMethodId) : undefined;
      if (!card || card.declines) {
        if (u.paymentBehavior === 'error_if_incomplete') throw Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError' });
        next.status = 'past_due';
      } else {
        next.status = 'active';
        this.invoice(next, FAKE_PRICES[next.priceId!]!.amount);
      }
      next.trialEnd = new Date();
      next.currentPeriodEnd = new Date(Date.now() + 30 * DAY_MS);
    } else if (u.trialEnd) {
      next.status = 'trialing';
      next.trialEnd = u.trialEnd;
      next.currentPeriodEnd = u.trialEnd;
    }
    this.subscriptions.set(subId, next);
    await this.emit(next, 'updated');
    return { ...next };
  }

  async cancelSubscriptionNow(subId: string) {
    this.calls.push({ op: 'subscriptions.cancel', id: subId });
    const sub = this.subscriptions.get(subId);
    if (!sub || sub.status === 'canceled') return;
    Object.assign(sub, { status: 'canceled', canceledAt: new Date(), cancelAtPeriodEnd: false });
    await this.emit(sub, 'deleted');
  }

  async createPortalSession(input: { customerId: string; returnUrl: string; flow?: { type: 'payment_method_update' } }) {
    this.calls.push({ op: 'billingPortal.sessions.create' });
    this.portalSessions.push({ customerId: input.customerId, returnUrl: input.returnUrl, flow: input.flow?.type });
    return { url: `https://billing.stripe.test/p/${input.customerId}?return=${encodeURIComponent(input.returnUrl)}` };
  }

  /**
   * Time passes to the end of the current period (or trial): a subscription set to cancel ends; a trial converts and
   * charges the card (past_due when it declines); an active one renews.
   */
  async advance(subId: string) {
    const sub = this.subscriptions.get(subId);
    if (!sub || sub.status === 'canceled') return;
    if (sub.cancelAtPeriodEnd) {
      Object.assign(sub, { status: 'canceled', canceledAt: new Date(), cancelAtPeriodEnd: false });
      await this.emit(sub, 'deleted');
      return;
    }
    const card = sub.defaultPaymentMethodId ? this.paymentMethods.get(sub.defaultPaymentMethodId) : undefined;
    if (!card || card.declines) sub.status = 'past_due';
    else {
      sub.status = 'active';
      this.invoice(sub, FAKE_PRICES[sub.priceId!]!.amount);
    }
    sub.trialEnd = sub.trialEnd && sub.trialEnd.getTime() > Date.now() ? new Date() : sub.trialEnd;
    sub.currentPeriodEnd = new Date(Date.now() + 30 * DAY_MS);
    await this.emit(sub, 'updated');
  }

  /** Only the calls that change something in Stripe. */
  writes() {
    return this.calls.filter((c) => c.op !== 'paymentMethods.retrieve' && c.op !== 'subscriptions.retrieve');
  }
}
