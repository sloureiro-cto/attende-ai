import 'server-only';
import { TIER_SLUGS, TIER_TITLES, TRIAL_DAYS, TRIAL_OUTBOUND_CAP, normalizeTierSlug, resolveLimits, type TierLimits, type TierSlug } from './tiers';

/**
 * The Attende plan catalog. The plans `attende-essencial`, `attende-profissional` and `attende-escala` exist in JSYNQ
 * production (hidden from JSYNQ's own catalog); each has two live flat prices on JSYNQ's Stripe account (tiered volume
 * with one tier: `flat_amount`, `unit_amount 0`, so the member count JSYNQ sets as quantity never changes the price).
 * Ids are not secret.
 *
 * Billing currency: USD for everyone. JSYNQ's `POST /api/subscriptions/upgrade-to-trial` always picks the USD price and
 * Stripe cannot change a subscription's currency, so the BRL prices are kept here, marked `inUse: false`, for when the
 * subscription is created another way (see RUNBOOK.md, "Currency"). Switching is then a change of `BILLING_CURRENCY`
 * plus `inUse` here.
 */
export const BILLING_CURRENCY = 'usd' as const;

export type CatalogPrice = { id: string; currency: 'usd' | 'brl'; interval: 'month'; amount: number; inUse: boolean };
export type CatalogEntry = { slug: TierSlug; title: string; productId: string; prices: CatalogPrice[] };

export const ATTENDE_PLANS: Record<TierSlug, CatalogEntry> = {
  'attende-essencial': {
    slug: 'attende-essencial',
    title: TIER_TITLES['attende-essencial'],
    productId: 'prod_VWo46LlixRkvXw',
    prices: [
      { id: 'price_1UVkc4DZMOxX7DKD5psGhUN1', currency: 'usd', interval: 'month', amount: 3900, inUse: true },
      { id: 'price_1UVkc4DZMOxX7DKDf85txFzh', currency: 'brl', interval: 'month', amount: 19700, inUse: false },
    ],
  },
  'attende-profissional': {
    slug: 'attende-profissional',
    title: TIER_TITLES['attende-profissional'],
    productId: 'prod_VWo4SemrEPKGHT',
    prices: [
      { id: 'price_1UVkc5DZMOxX7DKDF18TucA3', currency: 'usd', interval: 'month', amount: 7900, inUse: true },
      { id: 'price_1UVkc5DZMOxX7DKDLJgWBG1L', currency: 'brl', interval: 'month', amount: 39700, inUse: false },
    ],
  },
  'attende-escala': {
    slug: 'attende-escala',
    title: TIER_TITLES['attende-escala'],
    productId: 'prod_VWo4vpmUQ2yCIN',
    prices: [
      { id: 'price_1UVkc6DZMOxX7DKDZZfY4XJ7', currency: 'usd', interval: 'month', amount: 19900, inUse: true },
      { id: 'price_1UVkc6DZMOxX7DKD4XTGjJJN', currency: 'brl', interval: 'month', amount: 99700, inUse: false },
    ],
  },
};

export type CatalogPlan = {
  slug: TierSlug;
  name: string;
  limits: TierLimits;
  /** Minor units (cents). Only the prices in use. */
  prices: Array<{ currency: string; interval: 'month'; amount: number }>;
};

export type PlanCatalog = {
  trial: { days: number; requiresCard: true; outboundCap: number };
  currency: string;
  plans: CatalogPlan[];
};

/** Public tier catalog (`GET /api/attende/signup/plans`), in the billing currency. */
export async function listCatalog(): Promise<PlanCatalog> {
  return {
    trial: { days: TRIAL_DAYS, requiresCard: true, outboundCap: TRIAL_OUTBOUND_CAP },
    currency: BILLING_CURRENCY,
    plans: TIER_SLUGS.map((slug) => ({
      slug,
      name: ATTENDE_PLANS[slug].title,
      limits: resolveLimits(slug),
      prices: ATTENDE_PLANS[slug].prices.filter((p) => p.inUse).map(({ currency, interval, amount }) => ({ currency, interval, amount })),
    })),
  };
}

/** The price a new subscription (or a plan change) of `slug` uses, in `currency`. */
export function priceFor(slug: string, currency: string = BILLING_CURRENCY): CatalogPrice | null {
  const tier = normalizeTierSlug(slug);
  if (!tier) return null;
  return ATTENDE_PLANS[tier].prices.find((p) => p.currency === currency.toLowerCase()) ?? null;
}

/** The tier and catalog price of a Stripe price id (in use or not). Null for any price that is not Attende's. */
export function tierOfPrice(priceId: string | null | undefined): { slug: TierSlug; price: CatalogPrice } | null {
  if (!priceId) return null;
  for (const slug of TIER_SLUGS) {
    const price = ATTENDE_PLANS[slug].prices.find((p) => p.id === priceId);
    if (price) return { slug, price };
  }
  return null;
}
