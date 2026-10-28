import 'server-only';
import { PlanModel, type IPlan } from './models';
import { TIER_SLUGS, TRIAL_DAYS, TRIAL_OUTBOUND_CAP, isTierSlug, resolveLimits, type TierLimits } from './tiers';

export type CatalogPlan = {
  slug: string;
  name: string;
  limits: TierLimits;
  /** Minor units (cents), read from the synced Stripe prices only. */
  prices: Array<{ currency: string; interval: 'month' | 'year'; amount: number }>;
};

export type PlanCatalog = { trial: { days: number; requiresCard: true; outboundCap: number }; plans: CatalogPlan[] };

const sellable = (slug: string) => ({ slug, active: true, 'prices.0': { $exists: true } });

/** Public tier catalog (same shape as JSYNQ's old `GET /api/attende/signup/plans`). */
export async function listCatalog(): Promise<PlanCatalog> {
  const plans = await PlanModel.find({ slug: { $in: [...TIER_SLUGS] }, active: true }).lean<IPlan[]>();
  return {
    trial: { days: TRIAL_DAYS, requiresCard: true, outboundCap: TRIAL_OUTBOUND_CAP },
    plans: plans
      .filter((p) => isTierSlug(p.slug) && p.prices.some((x) => x.active))
      .sort((a, b) => TIER_SLUGS.indexOf(a.slug as never) - TIER_SLUGS.indexOf(b.slug as never))
      .map((p) => ({
        slug: p.slug,
        name: p.title,
        limits: resolveLimits(p.slug, p.limits),
        prices: p.prices
          .filter((x) => x.active && (x.interval === 'month' || x.interval === 'year') && (x.intervalCount ?? 1) === 1)
          .map((x) => ({ currency: x.currency.toLowerCase(), interval: x.interval, amount: x.amount })),
      })),
  };
}

export async function findSellablePlan(slug: string): Promise<IPlan | null> {
  if (!isTierSlug(slug)) return null;
  return PlanModel.findOne(sellable(slug)).lean<IPlan | null>();
}

/** Monthly price in BRL for Brazil, USD elsewhere, falling back to the currency the plan has. */
export function pickMonthlyPrice(plan: IPlan, country: string) {
  const monthly = plan.prices.filter((p) => p.active && p.interval === 'month' && (p.intervalCount ?? 1) === 1);
  const wanted = /^(br|brazil)$/i.test(country.trim()) ? 'brl' : 'usd';
  return monthly.find((p) => p.currency.toLowerCase() === wanted) ?? monthly.find((p) => p.currency.toLowerCase() === 'brl') ?? monthly[0] ?? null;
}
