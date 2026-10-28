import 'server-only';
/** Product limits of a plan. `-1` means unlimited. */
export type TierLimits = {
  lines: number;
  agents: number;
  aiRepliesPerMonth: number;
  seats: number;
  docs: number;
};

export const TIER_SLUGS = ['attende_starter', 'attende_growth', 'attende_scale'] as const;
export type TierSlug = (typeof TIER_SLUGS)[number];

/** Trial rules decided by the product owner: 7 days, with a card, capped outbound. */
export const TRIAL_DAYS = 7;
export const TRIAL_OUTBOUND_CAP = 50;
export const DEFAULT_TIER: TierSlug = 'attende_starter';

/** Reference tiers (limits only; prices live in Stripe, never here). */
export const TIERS: Record<TierSlug, TierLimits> = {
  attende_starter: { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 },
  attende_growth: { lines: 3, agents: 3, aiRepliesPerMonth: 5000, seats: 5, docs: 100 },
  attende_scale: { lines: 10, agents: 10, aiRepliesPerMonth: 20000, seats: 15, docs: 500 },
};

export const TIER_TITLES: Record<TierSlug, string> = {
  attende_starter: 'Starter',
  attende_growth: 'Growth',
  attende_scale: 'Scale',
};

export const isTierSlug = (slug: unknown): slug is TierSlug => typeof slug === 'string' && Object.hasOwn(TIERS, slug);

/** Plan limits with per-field overrides from the plan document (absent/invalid fall back to the tier). */
export function resolveLimits(slug: string | null | undefined, overrides: Partial<TierLimits> = {}): TierLimits {
  const base = isTierSlug(slug) ? TIERS[slug] : TIERS[DEFAULT_TIER];
  const pick = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    lines: pick(overrides.lines, base.lines),
    agents: pick(overrides.agents, base.agents),
    aiRepliesPerMonth: pick(overrides.aiRepliesPerMonth, base.aiRepliesPerMonth),
    seats: pick(overrides.seats, base.seats),
    docs: pick(overrides.docs, base.docs),
  };
}
