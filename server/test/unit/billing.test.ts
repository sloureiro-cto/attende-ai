import { decideAccess, deriveEntitlements, mapStripeStatus, type Entitlements } from '../../modules/billing/deriveEntitlements';
import type Stripe from 'stripe';
import { toJsynqLimits } from '../../modules/billing/jsynqLimits';
import { mapInvoice, mapSubscription } from '../../modules/billing/stripeGateway';
import { planCatalogFromStripe, tierOfPrice, type StripePriceRow } from '../../modules/billing/planSeed';
import { TIERS, TRIAL_OUTBOUND_CAP, resolveLimits } from '../../modules/billing/tiers';

const trialEnd = new Date('2026-11-01T00:00:00Z');
const periodEnd = new Date('2026-12-01T00:00:00Z');
const starter = { slug: 'attende_starter' };

describe('mapStripeStatus', () => {
  it.each([
    ['trialing', 'trialing'],
    ['active', 'active'],
    ['past_due', 'past_due'],
    ['unpaid', 'past_due'],
    ['canceled', 'canceled'],
    ['paused', 'canceled'],
    ['incomplete_expired', 'canceled'],
  ])('%s -> %s', (stripe, expected) => expect(mapStripeStatus(stripe)).toBe(expected));
  it('grants nothing for incomplete / unknown payments', () => {
    expect(mapStripeStatus('incomplete')).toBeNull();
    expect(mapStripeStatus('')).toBeNull();
  });
});

describe('deriveEntitlements', () => {
  it('is a no-op for a foreign price on a workspace that never had a plan', () => {
    expect(deriveEntitlements({ plan: null, stripeStatus: 'active' })).toBeNull();
  });

  it('derives a trial with the outbound cap and the trial end', () => {
    expect(deriveEntitlements({ plan: starter, stripeStatus: 'trialing', trialEndDate: trialEnd, currentPeriodEnd: trialEnd })).toEqual({
      tier: 'attende_starter',
      limits: TIERS.attende_starter,
      status: 'trialing',
      trialEndsAt: trialEnd,
      currentPeriodEnd: trialEnd,
      trialOutboundCap: TRIAL_OUTBOUND_CAP,
    });
  });

  it('an active plan has no trial fields', () => {
    expect(deriveEntitlements({ plan: { slug: 'attende_growth' }, stripeStatus: 'active', trialEndDate: trialEnd, currentPeriodEnd: periodEnd })).toEqual({
      tier: 'attende_growth',
      limits: TIERS.attende_growth,
      status: 'active',
      currentPeriodEnd: periodEnd,
    });
  });

  it('plan limit overrides win over the tier defaults', () => {
    expect(deriveEntitlements({ plan: { slug: 'attende_starter', limits: { agents: 2 } }, stripeStatus: 'active' })?.limits).toEqual({ ...TIERS.attende_starter, agents: 2 });
  });

  it('moving to a foreign price means the customer left the product', () => {
    const previous: Entitlements = { tier: 'attende_starter', limits: TIERS.attende_starter, status: 'active' };
    expect(deriveEntitlements({ plan: null, stripeStatus: 'active', previous })?.status).toBe('canceled');
    expect(deriveEntitlements({ plan: null, stripeStatus: 'past_due', previous })?.status).toBe('past_due');
  });

  it('changes nothing on an incomplete payment', () => {
    expect(deriveEntitlements({ plan: starter, stripeStatus: 'incomplete' })).toBeNull();
  });
});

describe('resolveLimits', () => {
  it('falls back to starter for an unknown slug and ignores bad overrides', () => {
    expect(resolveLimits('nope', { docs: Number.NaN })).toEqual(TIERS.attende_starter);
  });
});

describe('decideAccess', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  it('no plan -> 403 ATTENDE_NOT_ENTITLED', () => expect(decideAccess(null, now)).toMatchObject({ allowed: false, status: 403, reference: 'ATTENDE_NOT_ENTITLED' }));
  it('canceled -> 402 ATTENDE_SUBSCRIPTION_INACTIVE', () =>
    expect(decideAccess({ tier: 't', limits: TIERS.attende_starter, status: 'canceled' }, now)).toMatchObject({ status: 402, reference: 'ATTENDE_SUBSCRIPTION_INACTIVE' }));
  it('trial past its end -> 402 ATTENDE_TRIAL_EXPIRED even before the webhook', () =>
    expect(decideAccess({ tier: 't', limits: TIERS.attende_starter, status: 'trialing', trialEndsAt: new Date('2026-10-19T00:00:00Z') }, now)).toMatchObject({ reference: 'ATTENDE_TRIAL_EXPIRED' }));
  it('past_due keeps access', () => expect(decideAccess({ tier: 't', limits: TIERS.attende_starter, status: 'past_due' }, now)).toEqual({ allowed: true }));
});

describe('toJsynqLimits', () => {
  it('trial: valid until the trial end, outbound capped, strict profile', () => {
    const ent = deriveEntitlements({ plan: starter, stripeStatus: 'trialing', trialEndDate: trialEnd, currentPeriodEnd: trialEnd })!;
    expect(toJsynqLimits(ent, 3)).toEqual({
      status: 'active',
      validUntil: trialEnd.toISOString(),
      limits: { messagingChannels: 1, agents: 1, aiRepliesPerMonth: 1000, knowledgeDocuments: 20, members: 2, outboundMessages: { max: 50, windowEndsAt: trialEnd.toISOString() } },
      rateLimitProfile: 'strict',
    });
  });

  it('paid: period end plus grace, no outbound cap', () => {
    const ent = deriveEntitlements({ plan: starter, stripeStatus: 'active', currentPeriodEnd: periodEnd })!;
    const out = toJsynqLimits(ent, 3);
    expect(out.validUntil).toBe(new Date(periodEnd.getTime() + 3 * 86_400_000).toISOString());
    expect(out.limits.outboundMessages).toBeNull();
    expect(out.rateLimitProfile).toBe('standard');
  });

  it('canceled -> suspended', () => {
    expect(toJsynqLimits({ tier: 't', limits: TIERS.attende_starter, status: 'canceled' }, 3).status).toBe('suspended');
  });
});

describe('plan seed', () => {
  const price = (over: Partial<StripePriceRow>): StripePriceRow => ({
    id: 'price_1',
    active: true,
    currency: 'BRL',
    unitAmount: 19700,
    interval: 'month',
    intervalCount: 1,
    lookupKey: null,
    productId: 'prod_1',
    productMetadata: {},
    ...over,
  });

  it('finds the tier by product metadata or lookup key, never by guessing', () => {
    expect(tierOfPrice(price({ productMetadata: { attende_tier: 'attende_growth' } }))).toBe('attende_growth');
    expect(tierOfPrice(price({ lookupKey: 'attende_scale_usd_month' }))).toBe('attende_scale');
    expect(tierOfPrice(price({ lookupKey: 'pro_month' }))).toBeNull();
  });

  it('plans create / update / noop', () => {
    const prices = [price({ id: 'price_a', lookupKey: 'attende_starter_brl_month' })];
    const first = planCatalogFromStripe(prices, []);
    expect(first.find((c) => c.slug === 'attende_starter')).toMatchObject({ action: 'create', doc: { active: true, prices: [{ id: 'price_a', currency: 'brl', amount: 19700 }] } });
    expect(first.find((c) => c.slug === 'attende_growth')).toMatchObject({ action: 'create', doc: { active: false, prices: [] } });
    const again = planCatalogFromStripe(prices, first.map((c) => c.doc));
    expect(again.every((c) => c.action === 'noop')).toBe(true);
    const changed = planCatalogFromStripe([price({ id: 'price_a', lookupKey: 'attende_starter_brl_month', unitAmount: 24700 })], first.map((c) => c.doc));
    expect(changed.find((c) => c.slug === 'attende_starter')?.action).toBe('update');
  });
});

describe('Stripe mapping', () => {
  const stripeSub = (over: Record<string, unknown>) =>
    ({
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      items: { data: [{ price: { id: 'price_1' }, current_period_end: 1795000000 }] },
      trial_end: null,
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
      metadata: { app: 'attende' },
      ...over,
    }) as unknown as Stripe.Subscription;

  it('a live subscription is not canceling', () => {
    expect(mapSubscription(stripeSub({}))).toMatchObject({ cancelAtPeriodEnd: false, canceledAt: null, currentPeriodEnd: new Date(1795000000 * 1000) });
  });

  it('cancel at period end, by the flag or by cancel_at, keeps when it was requested', () => {
    expect(mapSubscription(stripeSub({ cancel_at_period_end: true, canceled_at: 1792000000 }))).toMatchObject({ cancelAtPeriodEnd: true, canceledAt: new Date(1792000000 * 1000) });
    expect(mapSubscription(stripeSub({ cancel_at: 1795000000, canceled_at: 1792000000 })).cancelAtPeriodEnd).toBe(true);
  });

  it('an ended subscription is canceled, not pending cancellation', () => {
    expect(mapSubscription(stripeSub({ status: 'canceled', cancel_at_period_end: true, canceled_at: 1792000000 }))).toMatchObject({ status: 'canceled', cancelAtPeriodEnd: false, canceledAt: new Date(1792000000 * 1000) });
  });

  it('maps an invoice to the fields the billing page renders', () => {
    const inv = { id: 'in_1', number: null, created: 1792700000, amount_paid: 49700, currency: 'brl', status: 'open', hosted_invoice_url: 'https://x/1', invoice_pdf: null, lines: {} } as unknown as Stripe.Invoice;
    expect(mapInvoice(inv)).toEqual({ id: 'in_1', number: null, created: 1792700000, amountPaid: 49700, currency: 'brl', status: 'open', hostedInvoiceUrl: 'https://x/1', invoicePdf: null });
  });
});
