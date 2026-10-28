import 'server-only';
import type { JsynqLimitsInput } from '../../lib/jsynq';
import type { Entitlements } from './deriveEntitlements';

const DAY_MS = 86_400_000;

/**
 * The JSYNQ limits document (P3 `PUT .../limits`) for an entitlement. Pure.
 * - `validUntil`: trial end while trialing, otherwise the paid period end plus a grace window, so
 *   a missed webhook can never leave a workspace open forever.
 * - canceled -> `suspended`. past_due keeps working until `validUntil`.
 * - while trialing, outbound sends are capped (trial window ends with the trial).
 */
export function toJsynqLimits(ent: Entitlements, graceDays: number): JsynqLimitsInput {
  const trialing = ent.status === 'trialing';
  const validUntil = trialing
    ? (ent.trialEndsAt ?? null)
    : ent.currentPeriodEnd
      ? new Date(new Date(ent.currentPeriodEnd).getTime() + graceDays * DAY_MS)
      : null;
  return {
    status: ent.status === 'canceled' ? 'suspended' : 'active',
    validUntil: validUntil ? new Date(validUntil).toISOString() : null,
    limits: {
      messagingChannels: ent.limits.lines,
      agents: ent.limits.agents,
      aiRepliesPerMonth: ent.limits.aiRepliesPerMonth,
      knowledgeDocuments: ent.limits.docs,
      members: ent.limits.seats,
      outboundMessages:
        trialing && ent.trialOutboundCap
          ? { max: ent.trialOutboundCap, windowEndsAt: ent.trialEndsAt ? new Date(ent.trialEndsAt).toISOString() : null }
          : null,
    },
    rateLimitProfile: trialing ? 'strict' : 'standard',
  };
}
