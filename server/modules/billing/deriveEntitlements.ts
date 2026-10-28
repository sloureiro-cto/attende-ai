import 'server-only';
import { TRIAL_OUTBOUND_CAP, resolveLimits, type TierLimits } from './tiers';

export type EntitlementStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export type Entitlements = {
  tier: string;
  limits: TierLimits;
  status: EntitlementStatus;
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  /** Max outbound messages while `trialing`. */
  trialOutboundCap?: number;
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
    return { tier: prev.tier, limits: prev.limits, status: status === 'active' || status === 'trialing' ? 'canceled' : status };
  }
  const trialing = status === 'trialing';
  return {
    tier: input.plan.slug,
    limits: resolveLimits(input.plan.slug, input.plan.limits),
    status,
    ...(trialing && input.trialEndDate ? { trialEndsAt: input.trialEndDate } : {}),
    ...(input.currentPeriodEnd ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
    ...(trialing ? { trialOutboundCap: TRIAL_OUTBOUND_CAP } : {}),
  };
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
