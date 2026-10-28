import 'server-only';
import Stripe from 'stripe';

/** The subset of a Stripe subscription this service reads. */
export type BillingSubscription = {
  id: string;
  status: string;
  customerId: string;
  priceId: string | null;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  /** Set to end at the period end (the customer canceled in the portal and can still undo it). */
  cancelAtPeriodEnd: boolean;
  /** When the cancellation was requested, or when the subscription ended. */
  canceledAt: Date | null;
  metadata: Record<string, string>;
};

/** One Stripe invoice, as the billing page lists it. `created` is in Unix seconds, `amountPaid` in minor units. */
export type BillingInvoice = {
  id: string;
  number: string | null;
  created: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

export type BillingEvent = { id: string; type: string; subscriptionId: string | null; metadata: Record<string, string> };

/** Everything this service does with Stripe, behind a port so tests never call Stripe. */
export interface StripeGateway {
  createCustomer(input: { email: string; name?: string; metadata: Record<string, string> }): Promise<{ id: string }>;
  createSetupIntent(customerId: string): Promise<{ clientSecret: string }>;
  retrievePaymentMethod(id: string): Promise<{ id: string; type: string; customerId: string | null; fingerprint: string | null }>;
  attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<void>;
  createSubscription(input: {
    customerId: string;
    priceId: string;
    trialDays: number;
    paymentMethodId: string;
    metadata: Record<string, string>;
    idempotencyKey: string;
  }): Promise<BillingSubscription>;
  retrieveSubscription(id: string): Promise<BillingSubscription>;
  cancelSubscription(id: string): Promise<void>;
  /** The customer's most recent invoices, newest first. */
  listInvoices(customerId: string, limit: number): Promise<BillingInvoice[]>;
  createPortalSession(input: { customerId: string; returnUrl: string; flow?: { type: 'payment_method_update' } | { type: 'subscription_update'; subscriptionId: string } }): Promise<{ url: string }>;
  /** Verifies the `Stripe-Signature` header against the raw body. Throws on a bad signature. */
  constructEvent(rawBody: Buffer, signature: string): BillingEvent;
  listPrices(): Promise<Array<{ id: string; active: boolean; currency: string; unitAmount: number | null; interval: string | null; intervalCount: number; lookupKey: string | null; productId: string; productMetadata: Record<string, string> }>>;
}

const toDate = (s: number | null | undefined) => (typeof s === 'number' ? new Date(s * 1000) : null);

export function mapSubscription(sub: Stripe.Subscription): BillingSubscription {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  // Newer API versions moved the period to the item; older ones keep it on the subscription.
  const periodEnd = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return {
    id: sub.id,
    status: sub.status,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    priceId: item?.price?.id ?? null,
    trialEnd: toDate(sub.trial_end),
    currentPeriodEnd: toDate(periodEnd),
    // The portal may schedule the end with `cancel_at` instead of the flag; both mean "ends, can be undone".
    cancelAtPeriodEnd: sub.status !== 'canceled' && (sub.cancel_at_period_end === true || typeof sub.cancel_at === 'number'),
    canceledAt: toDate(sub.canceled_at),
    metadata: (sub.metadata ?? {}) as Record<string, string>,
  };
}

export function mapInvoice(inv: Stripe.Invoice): BillingInvoice {
  return {
    id: inv.id ?? '',
    number: inv.number ?? null,
    created: inv.created,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    status: inv.status ?? null,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdf: inv.invoice_pdf ?? null,
  };
}

/** Subscription id carried by an event: the subscription itself, or the invoice's subscription. */
function subscriptionIdOf(object: unknown): string | null {
  const o = object as { object?: string; id?: string; subscription?: unknown; parent?: { subscription_details?: { subscription?: unknown } } };
  if (o?.object === 'subscription') return o.id ?? null;
  const sub = o?.subscription ?? o?.parent?.subscription_details?.subscription;
  if (typeof sub === 'string') return sub;
  if (sub && typeof sub === 'object' && 'id' in sub) return String((sub as { id: string }).id);
  return null;
}

export function stripeGateway(secretKey: string, webhookSecret: string): StripeGateway {
  const stripe = new Stripe(secretKey);
  return {
    async createCustomer(input) {
      const c = await stripe.customers.create({ email: input.email, name: input.name, metadata: input.metadata });
      return { id: c.id };
    },
    async createSetupIntent(customerId) {
      const si = await stripe.setupIntents.create({ customer: customerId, payment_method_types: ['card'], usage: 'off_session' });
      return { clientSecret: si.client_secret ?? '' };
    },
    async retrievePaymentMethod(id) {
      const pm = await stripe.paymentMethods.retrieve(id);
      return {
        id: pm.id,
        type: pm.type,
        customerId: typeof pm.customer === 'string' ? pm.customer : (pm.customer?.id ?? null),
        fingerprint: pm.card?.fingerprint ?? null,
      };
    },
    async attachPaymentMethod(paymentMethodId, customerId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
    },
    async createSubscription(input) {
      const sub = await stripe.subscriptions.create(
        {
          customer: input.customerId,
          items: [{ price: input.priceId }],
          trial_period_days: input.trialDays,
          default_payment_method: input.paymentMethodId,
          metadata: input.metadata,
          trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        },
        { idempotencyKey: input.idempotencyKey }
      );
      return mapSubscription(sub);
    },
    async retrieveSubscription(id) {
      return mapSubscription(await stripe.subscriptions.retrieve(id));
    },
    async cancelSubscription(id) {
      await stripe.subscriptions.cancel(id);
    },
    async listInvoices(customerId, limit) {
      const page = await stripe.invoices.list({ customer: customerId, limit });
      return page.data.map(mapInvoice);
    },
    async createPortalSession(input) {
      const flow: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined =
        input.flow?.type === 'payment_method_update'
          ? { type: 'payment_method_update' }
          : input.flow?.type === 'subscription_update'
            ? { type: 'subscription_update', subscription_update: { subscription: input.flow.subscriptionId } }
            : undefined;
      const s = await stripe.billingPortal.sessions.create({ customer: input.customerId, return_url: input.returnUrl, ...(flow ? { flow_data: flow } : {}) });
      return { url: s.url };
    },
    constructEvent(rawBody, signature) {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      const object = event.data.object as { metadata?: Record<string, string> };
      return { id: event.id, type: event.type, subscriptionId: subscriptionIdOf(event.data.object), metadata: object?.metadata ?? {} };
    },
    async listPrices() {
      const out = [];
      for await (const p of stripe.prices.list({ active: true, expand: ['data.product'], limit: 100 })) {
        const product = p.product as Stripe.Product;
        out.push({
          id: p.id,
          active: p.active,
          currency: p.currency,
          unitAmount: p.unit_amount,
          interval: p.recurring?.interval ?? null,
          intervalCount: p.recurring?.interval_count ?? 1,
          lookupKey: p.lookup_key,
          productId: typeof p.product === 'string' ? p.product : product.id,
          productMetadata: (typeof p.product === 'string' ? {} : product.metadata) as Record<string, string>,
        });
      }
      return out;
    },
  };
}

/** Marker on every subscription this service creates; events of other products are ignored. */
export const SUBSCRIPTION_APP_TAG = 'attende';
