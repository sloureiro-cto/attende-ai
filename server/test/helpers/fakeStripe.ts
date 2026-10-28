import Stripe from 'stripe';
import { stripeGateway, type BillingInvoice, type BillingSubscription, type StripeGateway } from '../../modules/billing/stripeGateway';

export const STRIPE_WEBHOOK_SECRET = 'stripe-test-signing-secret';
const real = stripeGateway('sk_test_dummy', STRIPE_WEBHOOK_SECRET);
let seq = 0;
const id = (prefix: string) => `${prefix}_${(++seq).toString(36)}${Date.now().toString(36)}`;

/** In-memory Stripe: customers, payment methods and subscriptions; real signature verification. */
export class FakeStripe implements StripeGateway {
  customers = new Map<string, { email: string }>();
  paymentMethods = new Map<string, { customerId: string | null; fingerprint: string }>();
  subscriptions = new Map<string, BillingSubscription>();
  /** Invoices by customer id, newest first. */
  invoices = new Map<string, BillingInvoice[]>();
  listInvoicesCalls: Array<{ customerId: string; limit: number }> = [];
  failNextSubscription: Error | null = null;

  addCard(pmId: string, fingerprint = `fp_${pmId}`) {
    this.paymentMethods.set(pmId, { customerId: null, fingerprint });
  }

  async createCustomer(input: { email: string }) {
    const cid = id('cus');
    this.customers.set(cid, { email: input.email });
    return { id: cid };
  }
  async createSetupIntent(customerId: string) {
    return { clientSecret: `seti_${customerId}_secret_x` };
  }
  async retrievePaymentMethod(pmId: string) {
    const pm = this.paymentMethods.get(pmId);
    if (!pm) throw new Error('No such payment method');
    return { id: pmId, type: 'card', customerId: pm.customerId, fingerprint: pm.fingerprint };
  }
  async attachPaymentMethod(pmId: string, customerId: string) {
    this.paymentMethods.get(pmId)!.customerId = customerId;
  }
  async createSubscription(input: Parameters<StripeGateway['createSubscription']>[0]) {
    if (this.failNextSubscription) {
      const e = this.failNextSubscription;
      this.failNextSubscription = null;
      throw e;
    }
    const now = Date.now();
    const sub: BillingSubscription = {
      id: id('sub'),
      status: 'trialing',
      customerId: input.customerId,
      priceId: input.priceId,
      trialEnd: new Date(now + input.trialDays * 86_400_000),
      currentPeriodEnd: new Date(now + input.trialDays * 86_400_000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: input.metadata,
    };
    this.subscriptions.set(sub.id, sub);
    return sub;
  }
  async retrieveSubscription(subId: string) {
    const sub = this.subscriptions.get(subId);
    if (!sub) throw new Error('No such subscription');
    return { ...sub };
  }
  async cancelSubscription(subId: string) {
    const sub = this.subscriptions.get(subId);
    if (sub) sub.status = 'canceled';
  }
  async listInvoices(customerId: string, limit: number) {
    this.listInvoicesCalls.push({ customerId, limit });
    return (this.invoices.get(customerId) ?? []).slice(0, limit);
  }
  async createPortalSession(input: { customerId: string; returnUrl: string }) {
    return { url: `https://billing.stripe.test/p/${input.customerId}?return=${encodeURIComponent(input.returnUrl)}` };
  }
  constructEvent(rawBody: Buffer, signature: string) {
    return real.constructEvent(rawBody, signature);
  }
  async listPrices() {
    return [];
  }

  /** A signed webhook request body + header for an event about `subscription`. */
  signedEvent(type: string, subscription: BillingSubscription) {
    const payload = JSON.stringify({ id: id('evt'), object: 'event', type, data: { object: { id: subscription.id, object: 'subscription', metadata: subscription.metadata } } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: STRIPE_WEBHOOK_SECRET });
    return { payload, header };
  }
}
