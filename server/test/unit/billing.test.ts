import { ATTENDE_PLANS, listCatalog, priceFor, tierOfPrice } from '../../modules/billing/catalog';
import {
  agentsMustPause,
  decideAccess,
  deriveEntitlements,
  entitlementsWithoutAttendePlan,
  mapStripeStatus,
  readJsynqSubscription,
  type Entitlements,
} from '../../modules/billing/deriveEntitlements';
import type Stripe from 'stripe';
import { mapSubscription } from '../../modules/billing/stripeGateway';
import { TIERS, TRIAL_OUTBOUND_CAP, normalizeTierSlug, resolveLimits } from '../../modules/billing/tiers';

const trialEnd = new Date('2026-11-01T00:00:00Z');
const periodEnd = new Date('2026-12-01T00:00:00Z');
const starter = { slug: 'attende-essencial' };

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
      tier: 'attende-essencial',
      limits: TIERS['attende-essencial'],
      status: 'trialing',
      trialEndsAt: trialEnd,
      currentPeriodEnd: trialEnd,
      trialOutboundCap: TRIAL_OUTBOUND_CAP,
      source: 'attende',
    });
  });

  it('an active plan has no trial fields', () => {
    expect(deriveEntitlements({ plan: { slug: 'attende-profissional' }, stripeStatus: 'active', trialEndDate: trialEnd, currentPeriodEnd: periodEnd })).toEqual({
      tier: 'attende-profissional',
      limits: TIERS['attende-profissional'],
      status: 'active',
      currentPeriodEnd: periodEnd,
      source: 'attende',
    });
  });

  it('plan limit overrides win over the tier defaults', () => {
    expect(deriveEntitlements({ plan: { slug: 'attende-essencial', limits: { agents: 2 } }, stripeStatus: 'active' })?.limits).toEqual({ ...TIERS['attende-essencial'], agents: 2 });
  });

  it('moving to a foreign price means the customer left the product', () => {
    const previous: Entitlements = { tier: 'attende-essencial', limits: TIERS['attende-essencial'], status: 'active' };
    expect(deriveEntitlements({ plan: null, stripeStatus: 'active', previous })?.status).toBe('canceled');
    expect(deriveEntitlements({ plan: null, stripeStatus: 'past_due', previous })?.status).toBe('past_due');
  });

  it('changes nothing on an incomplete payment', () => {
    expect(deriveEntitlements({ plan: starter, stripeStatus: 'incomplete' })).toBeNull();
  });
});

describe('resolveLimits', () => {
  it('falls back to Essencial for an unknown slug and ignores bad overrides', () => {
    expect(resolveLimits('nope', { docs: Number.NaN })).toEqual(TIERS['attende-essencial']);
  });
});

describe('decideAccess', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  it('no plan -> 403 ATTENDE_NOT_ENTITLED', () => expect(decideAccess(null, now)).toMatchObject({ allowed: false, status: 403, reference: 'ATTENDE_NOT_ENTITLED' }));
  it('canceled -> 402 ATTENDE_SUBSCRIPTION_INACTIVE', () =>
    expect(decideAccess({ tier: 't', limits: TIERS['attende-essencial'], status: 'canceled' }, now)).toMatchObject({ status: 402, reference: 'ATTENDE_SUBSCRIPTION_INACTIVE' }));
  it('trial past its end -> 402 ATTENDE_TRIAL_EXPIRED even before the webhook', () =>
    expect(decideAccess({ tier: 't', limits: TIERS['attende-essencial'], status: 'trialing', trialEndsAt: new Date('2026-10-19T00:00:00Z') }, now)).toMatchObject({ reference: 'ATTENDE_TRIAL_EXPIRED' }));
  it('past_due keeps access', () => expect(decideAccess({ tier: 't', limits: TIERS['attende-essencial'], status: 'past_due' }, now)).toEqual({ allowed: true }));
});

describe('agentsMustPause (replaces the JSYNQ limits validUntil / suspended)', () => {
  const now = new Date('2026-12-02T00:00:00Z');
  it('a running trial keeps the agents; an ended one pauses them', () => {
    const trial = deriveEntitlements({ plan: starter, stripeStatus: 'trialing', trialEndDate: trialEnd, currentPeriodEnd: trialEnd })!;
    expect(agentsMustPause(trial, 3, new Date('2026-10-30T00:00:00Z'))).toBe(false);
    expect(agentsMustPause(trial, 3, now)).toBe(true);
  });

  it('paid: the period end plus the grace days, then pause (a missed renewal webhook never leaves it open)', () => {
    const ent = deriveEntitlements({ plan: starter, stripeStatus: 'active', currentPeriodEnd: periodEnd })!;
    expect(agentsMustPause(ent, 3, new Date(periodEnd.getTime() + 2 * 86_400_000))).toBe(false);
    expect(agentsMustPause(ent, 3, new Date(periodEnd.getTime() + 4 * 86_400_000))).toBe(true);
  });

  it('canceled pauses; no entitlements is not ours to pause', () => {
    expect(agentsMustPause({ tier: 't', limits: TIERS['attende-essencial'], status: 'canceled' }, 3, now)).toBe(true);
    expect(agentsMustPause(null, 3, now)).toBe(false);
  });
});

describe('catalog', () => {
  const USD = { 'attende-essencial': 3900, 'attende-profissional': 7900, 'attende-escala': 19900 };
  const BRL = { 'attende-essencial': 19700, 'attende-profissional': 39700, 'attende-escala': 99700 };

  it('bills in USD: the public catalog shows only the USD flat prices, in tier order', async () => {
    const catalog = await listCatalog();
    expect(catalog.currency).toBe('usd');
    expect(catalog.plans.map((p) => [p.slug, p.prices])).toEqual(
      Object.entries(USD).map(([slug, amount]) => [slug, [{ currency: 'usd', interval: 'month', amount }]])
    );
    expect(catalog.trial).toEqual({ days: 7, requiresCard: true, outboundCap: TRIAL_OUTBOUND_CAP });
  });

  it('keeps the BRL prices, not in use yet', () => {
    for (const [slug, amount] of Object.entries(BRL)) {
      const brl = ATTENDE_PLANS[slug as keyof typeof BRL].prices.find((p) => p.currency === 'brl')!;
      expect(brl).toMatchObject({ amount, inUse: false });
      expect(tierOfPrice(brl.id)?.slug).toBe(slug);
    }
  });

  it('price ids map back to their tier; other prices are not Attende', () => {
    expect(priceFor('profissional')?.id).toBe('price_1UVkc5DZMOxX7DKDF18TucA3');
    expect(tierOfPrice('price_1UVkc6DZMOxX7DKDZZfY4XJ7')).toMatchObject({ slug: 'attende-escala', price: { currency: 'usd', amount: 19900 } });
    expect(tierOfPrice('price_jsynq_pro')).toBeNull();
    expect(tierOfPrice(null)).toBeNull();
  });

  it('normalizes tier names, legacy slugs included', () => {
    expect(normalizeTierSlug('attende-escala')).toBe('attende-escala');
    expect(normalizeTierSlug('Profissional')).toBe('attende-profissional');
    expect(normalizeTierSlug('attende_starter')).toBe('attende-essencial');
    expect(normalizeTierSlug('pro')).toBeNull();
  });
});

describe('reading the JSYNQ subscription', () => {
  const plan = (slug: string) => ({ slug });
  const usdProfissional = 'price_1UVkc5DZMOxX7DKDF18TucA3';

  it('an attende-* plan is an Attende subscription', () => {
    expect(readJsynqSubscription({ plan: plan('attende-profissional'), status: 'trialing', stripeSubscriptionId: 'sub_1', stripePriceId: usdProfissional, trialEndDate: '2026-11-05T00:00:00.000Z' })).toMatchObject({
      kind: 'attende',
      tier: 'attende-profissional',
      status: 'trialing',
      trialEnd: new Date('2026-11-05T00:00:00.000Z'),
    });
  });

  it('once JSYNQ moved it to free (canceled, past due), the Attende price still tells it apart', () => {
    expect(readJsynqSubscription({ plan: plan('free'), status: 'canceled', stripeSubscriptionId: 'sub_1', stripePriceId: usdProfissional })).toMatchObject({ kind: 'attende', status: 'canceled' });
  });

  it('a paid JSYNQ plan includes Attende with the Profissional limits; free does not', () => {
    const paid = readJsynqSubscription({ plan: plan('pro'), status: 'active', stripeSubscriptionId: 'sub_9', stripePriceId: 'price_pro' });
    expect(paid).toEqual({ kind: 'jsynq_plan', planSlug: 'pro', status: 'active', paid: true });
    expect(entitlementsWithoutAttendePlan(paid as never, null)).toEqual({ tier: 'attende-profissional', limits: TIERS['attende-profissional'], status: 'active', source: 'jsynq_plan' });
    const free = readJsynqSubscription({ plan: plan('free'), status: 'active', stripePriceId: 'price_free' });
    expect(free).toEqual({ kind: 'none', status: 'active' });
    expect(entitlementsWithoutAttendePlan(free as never, null)).toBeNull();
    expect(readJsynqSubscription(null)).toEqual({ kind: 'none', status: null });
  });

  it('losing the JSYNQ plan takes Attende with it (past due keeps it while Stripe retries)', () => {
    const included: Entitlements = { tier: 'attende-profissional', limits: TIERS['attende-profissional'], status: 'active', source: 'jsynq_plan' };
    expect(entitlementsWithoutAttendePlan({ kind: 'none', status: 'canceled' }, included)?.status).toBe('canceled');
    expect(entitlementsWithoutAttendePlan({ kind: 'none', status: 'past_due' }, included)?.status).toBe('past_due');
    // An Attende customer is never touched by this path.
    expect(entitlementsWithoutAttendePlan({ kind: 'none', status: 'active' }, { ...included, source: 'attende' })).toBeNull();
  });
});

describe('Stripe mapping', () => {
  const stripeSub = (over: Record<string, unknown>) =>
    ({
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      currency: 'usd',
      items: { data: [{ id: 'si_1', quantity: 3, price: { id: 'price_1', currency: 'usd' }, current_period_end: 1795000000 }] },
      trial_end: null,
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
      metadata: { app: 'attende' },
      ...over,
    }) as unknown as Stripe.Subscription;

  it('a live subscription is not canceling', () => {
    expect(mapSubscription(stripeSub({}))).toMatchObject({ itemId: 'si_1', quantity: 3, priceId: 'price_1', currency: 'usd', cancelAtPeriodEnd: false, canceledAt: null, currentPeriodEnd: new Date(1795000000 * 1000) });
  });

  it('cancel at period end, by the flag or by cancel_at, keeps when it was requested', () => {
    expect(mapSubscription(stripeSub({ cancel_at_period_end: true, canceled_at: 1792000000 }))).toMatchObject({ cancelAtPeriodEnd: true, canceledAt: new Date(1792000000 * 1000) });
    expect(mapSubscription(stripeSub({ cancel_at: 1795000000, canceled_at: 1792000000 })).cancelAtPeriodEnd).toBe(true);
  });

  it('an ended subscription is canceled, not pending cancellation', () => {
    expect(mapSubscription(stripeSub({ status: 'canceled', cancel_at_period_end: true, canceled_at: 1792000000 }))).toMatchObject({ status: 'canceled', cancelAtPeriodEnd: false, canceledAt: new Date(1792000000 * 1000) });
  });
});
