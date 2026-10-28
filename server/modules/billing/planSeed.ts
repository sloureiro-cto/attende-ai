import 'server-only';
import type { IPlan, PlanPrice } from './models';
import { TIER_SLUGS, TIER_TITLES, type TierSlug } from './tiers';

export type StripePriceRow = {
  id: string;
  active: boolean;
  currency: string;
  unitAmount: number | null;
  interval: string | null;
  intervalCount: number;
  lookupKey: string | null;
  productId: string;
  productMetadata: Record<string, string>;
};

/**
 * Which tier a Stripe price belongs to: its product carries `metadata.attende_tier=<slug>`, or the
 * price's lookup key starts with `<slug>_` (e.g. `attende_starter_brl_month`). Anything else is
 * another product's price and is ignored.
 */
export function tierOfPrice(p: StripePriceRow): TierSlug | null {
  const meta = p.productMetadata?.attende_tier;
  if (meta && (TIER_SLUGS as readonly string[]).includes(meta)) return meta as TierSlug;
  const byKey = TIER_SLUGS.find((slug) => p.lookupKey?.startsWith(`${slug}_`));
  return byKey ?? null;
}

export type PlanChange = { slug: TierSlug; action: 'create' | 'update' | 'noop'; doc: Omit<IPlan, 'active'> & { active: boolean } };

/** Pure planner for scripts/seed-plans.ts: the catalog documents the Stripe prices imply. */
export function planCatalogFromStripe(prices: StripePriceRow[], existing: Array<Pick<IPlan, 'slug' | 'title' | 'prices' | 'limits' | 'stripeProductId'>>): PlanChange[] {
  return TIER_SLUGS.map((slug) => {
    const mine = prices.filter((p) => tierOfPrice(p) === slug && p.unitAmount !== null && (p.interval === 'month' || p.interval === 'year'));
    const planPrices: PlanPrice[] = mine
      .map((p) => ({ id: p.id, currency: p.currency.toLowerCase(), interval: p.interval as 'month' | 'year', intervalCount: p.intervalCount, amount: p.unitAmount!, active: p.active }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const current = existing.find((e) => e.slug === slug);
    const doc = {
      slug,
      title: current?.title ?? TIER_TITLES[slug],
      ...(current?.limits ? { limits: current.limits } : {}),
      stripeProductId: mine[0]?.productId ?? current?.stripeProductId,
      prices: planPrices,
      active: planPrices.some((p) => p.active),
    };
    if (!current) return { slug, action: 'create' as const, doc };
    const same = JSON.stringify([...current.prices].sort((a, b) => a.id.localeCompare(b.id)).map((p) => ({ ...p }))) === JSON.stringify(planPrices);
    return { slug, action: same ? ('noop' as const) : ('update' as const), doc };
  });
}
