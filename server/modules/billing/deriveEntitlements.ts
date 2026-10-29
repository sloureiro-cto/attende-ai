import 'server-only';
import { tierOfPrice } from './catalog';
import { INCLUDED_TIER, TRIAL_OUTBOUND_CAP, normalizeTierSlug, resolveLimits, type TierLimits, type TierSlug } from './tiers';

export type EntitlementStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
/** `attende`: an `attende-*` JSYNQ subscription. `jsynq_plan`: included in a paid JSYNQ plan. */
export type EntitlementSource = 'attende' | 'jsynq_plan';

export type Entitlements = {
  tier: string;
  limits: TierLimits;
  status: EntitlementStatus;
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  /** Max outbound messages while `trialing`. */
  trialOutboundCap?: number;
  /** Absent on rows written before it existed: `attende`. */
  source?: EntitlementSource;
};

export function mapStripeStatus(stripeStatus: string): EntitlementStatus | null {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'paused':
    case 'incomplete_expired':
      return 'canceled';
    // `incomplete`: payment not confirmed yet. Grant nothing, change nothing.
    default:
      return null;
  }
}

/**
 * Pure derivation of a workspace's entitlements from its Stripe subscription. `plan` is the
 * catalog plan of the subscription's price (null when the price is not one of ours).
 * Returns `null` when nothing must change: an `incomplete` payment, or a foreign plan on a
 * workspace that never had ours.
 */
export function deriveEntitlements(input: {
  plan: { slug: string; limits?: Partial<TierLimits> } | null;
  stripeStatus: string;
  trialEndDate?: Date | null;
  currentPeriodEnd?: Date | null;
  previous?: Entitlements | null;
}): Entitlements | null {
  const status = mapStripeStatus(input.stripeStatus);
  if (!status) return null;
  if (!input.plan) {
    const prev = input.previous;
    if (!prev) return null;
    // Moved to a price that is not ours: the customer left the product.
    return { tier: prev.tier, limits: prev.limits, status: status === 'active' || status === 'trialing' ? 'canceled' : status, source: 'attende' };
  }
  const trialing = status === 'trialing';
  return {
    source: 'attende',
    tier: normalizeTierSlug(input.plan.slug) ?? input.plan.slug,
    limits: resolveLimits(input.plan.slug, input.plan.limits),
    status,
    ...(trialing && input.trialEndDate ? { trialEndsAt: input.trialEndDate } : {}),
    ...(input.currentPeriodEnd ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
    ...(trialing ? { trialOutboundCap: TRIAL_OUTBOUND_CAP } : {}),
  };
}

const date = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** The workspace's JSYNQ subscription (`GET /api/subscriptions/me`), read for Attende. */
export type JsynqBilling =
  /** An `attende-*` subscription: by plan slug, or by price once JSYNQ moved the plan to `free` (canceled, past due). */
  | { kind: 'attende'; tier: TierSlug; status: string; stripeSubscriptionId: string; priceId: string | null; trialEnd: Date | null; currentPeriodEnd: Date | null; canceledAt: Date | null }
  /** Any other JSYNQ plan. `paid`: not free, active or trialing. */
  | { kind: 'jsynq_plan'; planSlug: string; status: string; paid: boolean }
  /** No subscription, or the free plan of a workspace that never had an Attende one. */
  | { kind: 'none'; status: string | null };

export function readJsynqSubscription(
  me: { plan?: { slug?: string } | string | null; status?: string; stripeSubscriptionId?: string; stripePriceId?: string; trialEndDate?: unknown; currentPeriodEnd?: unknown; canceledAt?: unknown } | null
): JsynqBilling {
  if (!me) return { kind: 'none', status: null };
  const planSlug = typeof me.plan === 'object' && me.plan ? (me.plan.slug ?? null) : null;
  const status = me.status ?? 'unknown';
  const tier = normalizeTierSlug(planSlug) ?? tierOfPrice(me.stripePriceId)?.slug ?? null;
  if (tier && me.stripeSubscriptionId) {
    return {
      kind: 'attende',
      tier,
      status,
      stripeSubscriptionId: me.stripeSubscriptionId,
      priceId: me.stripePriceId ?? null,
      trialEnd: date(me.trialEndDate),
      currentPeriodEnd: date(me.currentPeriodEnd),
      canceledAt: date(me.canceledAt),
    };
  }
  if (!planSlug || planSlug === 'free') return { kind: 'none', status };
  return { kind: 'jsynq_plan', planSlug, status, paid: status === 'active' || status === 'trialing' };
}

/** A workspace that pays a JSYNQ plan gets Attende with the Profissional limits, no trial, no Attende billing. */
export const includedEntitlements = (): Entitlements => ({ tier: INCLUDED_TIER, limits: resolveLimits(INCLUDED_TIER), status: 'active', source: 'jsynq_plan' });

/**
 * Entitlements of a workspace whose JSYNQ subscription is not an Attende one. `null` = nothing to change: a workspace
 * that never had Attende stays without it. One that had Attende through its JSYNQ plan loses it with that plan
 * (`past_due` keeps access while Stripe retries).
 */
export function entitlementsWithoutAttendePlan(billing: Exclude<JsynqBilling, { kind: 'attende' }>, previous: Entitlements | null): Entitlements | null {
  if (billing.kind === 'jsynq_plan' && billing.paid) return includedEntitlements();
  if (previous?.source !== 'jsynq_plan') return null;
  const lapsed: EntitlementStatus = mapStripeStatus(billing.status ?? '') === 'past_due' ? 'past_due' : 'canceled';
  return { tier: previous.tier, limits: previous.limits, status: lapsed, source: 'jsynq_plan' };
}

export const ACCESS_CODES = {
  NOT_ENTITLED: 'ATTENDE_NOT_ENTITLED',
  TRIAL_EXPIRED: 'ATTENDE_TRIAL_EXPIRED',
  SUBSCRIPTION_INACTIVE: 'ATTENDE_SUBSCRIPTION_INACTIVE',
  QUOTA_EXCEEDED: 'ATTENDE_QUOTA_EXCEEDED',
} as const;

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reference: (typeof ACCESS_CODES)[keyof typeof ACCESS_CODES]; message: string; status: 402 | 403 };

/** Pure gate decision, shared by the middleware and the entitlements endpoint. */
export function decideAccess(ent: Entitlements | null, now: Date = new Date()): AccessDecision {
  if (!ent) return { allowed: false, status: 403, reference: ACCESS_CODES.NOT_ENTITLED, message: 'This workspace does not have an Attende-ai plan' };
  if (ent.status === 'canceled') return { allowed: false, status: 402, reference: ACCESS_CODES.SUBSCRIPTION_INACTIVE, message: 'The Attende-ai subscription is not active' };
  if (ent.status === 'trialing' && ent.trialEndsAt && new Date(ent.trialEndsAt).getTime() < now.getTime()) {
    // The webhook may not have flipped the status yet: the trial end date is the source of truth.
    return { allowed: false, status: 402, reference: ACCESS_CODES.TRIAL_EXPIRED, message: 'The Attende-ai trial has ended' };
  }
  // `past_due` keeps access (Stripe retries the charge); the app shows a billing banner.
  return { allowed: true };
}

export const isOverLimit = (limit: number | undefined, used: number): boolean => limit !== undefined && limit >= 0 && used >= limit;

const DAY_MS = 86_400_000;

/**
 * Whether the workspace's Attende agents must stop answering. Pure. Same rules as the app gate,
 * plus the safety net the JSYNQ limits used to give (`validUntil`): a paid workspace whose period
 * ended more than `graceDays` ago without a renewal webhook stops too. A workspace without
 * entitlements is not ours to pause.
 */
export function agentsMustPause(ent: Entitlements | null, graceDays: number, now: Date = new Date()): boolean {
  if (!ent) return false;
  if (!decideAccess(ent, now).allowed) return true;
  if ((ent.status === 'active' || ent.status === 'past_due') && ent.currentPeriodEnd) {
    return new Date(ent.currentPeriodEnd).getTime() + graceDays * DAY_MS < now.getTime();
  }
  return false;
}
