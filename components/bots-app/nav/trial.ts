export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "none"

const DAY_MS = 86_400_000

/** Whole days left until `trialEndsAt` (ceil, so "ends later today" is 1 and an ended trial is 0). */
export function trialDaysLeft(trialEndsAt: string | Date | null | undefined, now: Date = new Date()): number | null {
  if (!trialEndsAt) return null
  const end = trialEndsAt instanceof Date ? trialEndsAt.getTime() : Date.parse(trialEndsAt)
  if (!Number.isFinite(end)) return null
  return Math.max(0, Math.ceil((end - now.getTime()) / DAY_MS))
}
