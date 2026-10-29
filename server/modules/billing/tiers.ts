import 'server-only';
/** Product limits of a plan. `-1` means unlimited. */
export type TierLimits = {
  lines: number;
  agents: number;
  aiRepliesPerMonth: number;
  seats: number;
  docs: number;
};

/** The JSYNQ plan slugs of the three Attende tiers (hidden from JSYNQ's own catalog). */
export const TIER_SLUGS = ['attende-essencial', 'attende-profissional', 'attende-escala'] as const;
export type TierSlug = (typeof TIER_SLUGS)[number];

/** Trial rules decided by the product owner: 7 days, with a card, capped outbound. */
export const TRIAL_DAYS = 7;
export const TRIAL_OUTBOUND_CAP = 50;
export const DEFAULT_TIER: TierSlug = 'attende-essencial';
/** What a workspace that already pays a JSYNQ plan gets in Attende, at no extra cost. */
export const INCLUDED_TIER: TierSlug = 'attende-profissional';

/** Reference tiers (limits only; prices live in `catalog.ts`). */
export const TIERS: Record<TierSlug, TierLimits> = {
  'attende-essencial': { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 },
  'attende-profissional': { lines: 3, agents: 3, aiRepliesPerMonth: 5000, seats: 5, docs: 100 },
  'attende-escala': { lines: 10, agents: 10, aiRepliesPerMonth: 20000, seats: 15, docs: 500 },
};

export const TIER_TITLES: Record<TierSlug, string> = {
  'attende-essencial': 'Essencial',
  'attende-profissional': 'Profissional',
  'attende-escala': 'Escala',
};

/** Slugs of the first catalog (entitlements migrated from JSYNQ may still carry them). */
const LEGACY_SLUGS: Record<string, TierSlug> = {
  attende_starter: 'attende-essencial',
  attende_growth: 'attende-profissional',
  attende_scale: 'attende-escala',
};

export const isTierSlug = (slug: unknown): slug is TierSlug => typeof slug === 'string' && Object.hasOwn(TIERS, slug);

/** The tier a slug names: a current slug, a legacy one, or the bare name (`profissional`). Null otherwise. */
export function normalizeTierSlug(slug: unknown): TierSlug | null {
  if (typeof slug !== 'string') return null;
  const value = slug.trim().toLowerCase();
  if (isTierSlug(value)) return value;
  if (Object.hasOwn(LEGACY_SLUGS, value)) return LEGACY_SLUGS[value]!;
  const prefixed = `attende-${value}`;
  return isTierSlug(prefixed) ? prefixed : null;
}

/** Plan limits with per-field overrides (absent/invalid fall back to the tier). */
export function resolveLimits(slug: string | null | undefined, overrides: Partial<TierLimits> = {}): TierLimits {
  const base = TIERS[normalizeTierSlug(slug) ?? DEFAULT_TIER];
  const pick = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    lines: pick(overrides.lines, base.lines),
    agents: pick(overrides.agents, base.agents),
    aiRepliesPerMonth: pick(overrides.aiRepliesPerMonth, base.aiRepliesPerMonth),
    seats: pick(overrides.seats, base.seats),
    docs: pick(overrides.docs, base.docs),
  };
}
