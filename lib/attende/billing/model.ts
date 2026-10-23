import type { AttendeTierLimits } from "lib/attende/plans"
import type { BillingTranslationKey } from "lib/i18n/translations/attende/billing"

export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "none"

export type AttendeBilling = {
  tier: string | null
  status: BillingStatus
  limits: Partial<AttendeTierLimits> | null
  trialEndsAt: string | null
  trialOutboundCap: number
  trialOutboundUsed: number
}

const STATUSES: readonly BillingStatus[] = ["trialing", "active", "past_due", "canceled", "none"]
const num = (value: unknown, fallback = 0): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback)

/**
 * `workspace.entitlements.attende`, read defensively: the field is optional upstream and a workspace that never had Attende-ai
 * simply has none (-> status "none"). Nothing here throws on odd data.
 */
export function parseAttendeBilling(workspace: unknown): AttendeBilling {
  const block = (workspace as { entitlements?: { attende?: Record<string, unknown> } } | null | undefined)?.entitlements?.attende
  if (!block || typeof block !== "object") return { tier: null, status: "none", limits: null, trialEndsAt: null, trialOutboundCap: 0, trialOutboundUsed: 0 }

  const status = STATUSES.includes(block.status as BillingStatus) ? (block.status as BillingStatus) : "none"
  const limits = block.limits && typeof block.limits === "object" ? (block.limits as Partial<AttendeTierLimits>) : null
  const endsAt = typeof block.trialEndsAt === "string" || block.trialEndsAt instanceof Date ? new Date(block.trialEndsAt) : null
  return {
    tier: typeof block.tier === "string" ? block.tier : null,
    status,
    limits,
    trialEndsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
    trialOutboundCap: num(block.trialOutboundCap),
    trialOutboundUsed: num(block.trialOutboundUsed),
  }
}

export const STATUS_KEY = {
  trialing: "billStatusTrialing",
  active: "billStatusActive",
  past_due: "billStatusPastDue",
  canceled: "billStatusCanceled",
  none: "billStatusNone",
} as const satisfies Record<BillingStatus, BillingTranslationKey>

export type LimitRow = { key: "billLimitLines" | "billLimitAgents" | "billLimitReplies" | "billLimitSeats" | "billLimitDocs"; value: number; unlimited: boolean }

const ROWS: ReadonlyArray<[LimitRow["key"], keyof AttendeTierLimits]> = [
  ["billLimitLines", "lines"],
  ["billLimitAgents", "agents"],
  ["billLimitReplies", "aiRepliesPerMonth"],
  ["billLimitSeats", "seats"],
  ["billLimitDocs", "docs"],
]

/** Limit rows for the plan card. `-1` is the backend's "unlimited"; limits the plan does not define are left out. */
export function limitRows(limits: Partial<AttendeTierLimits> | null): LimitRow[] {
  if (!limits) return []
  const rows: LimitRow[] = []
  for (const [key, field] of ROWS) {
    const value = limits[field]
    if (typeof value === "number" && Number.isFinite(value)) rows.push({ key, value, unlimited: value < 0 })
  }
  return rows
}

/** What to say about the trial clock. `null` outside a trial. */
export type TrialClock = { kind: "days"; days: number } | { kind: "today" } | { kind: "ended" } | null

export function trialClock(status: BillingStatus, trialEndsAt: string | null, now: Date = new Date()): TrialClock {
  if (status !== "trialing" || !trialEndsAt) return null
  const ms = Date.parse(trialEndsAt) - now.getTime()
  if (!Number.isFinite(ms)) return null
  if (ms <= 0) return { kind: "ended" }
  const days = Math.ceil(ms / 86_400_000)
  return days <= 1 ? { kind: "today" } : { kind: "days", days }
}

/** Display name of the tier slug (`attende_growth` -> `Growth`). */
export function tierName(tier: string | null): string | null {
  if (!tier) return null
  const name = tier.replace(/^attende_/, "")
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : null
}

/** Reasons the backend gives for refusing work because of the plan (`/api/attende/*` error codes). */
export const SUBSCRIPTION_BLOCK_CODES = ["ATTENDE_TRIAL_EXPIRED", "ATTENDE_SUBSCRIPTION_INACTIVE"] as const
export type SubscriptionBlockCode = (typeof SUBSCRIPTION_BLOCK_CODES)[number]
export const isSubscriptionBlockCode = (code: unknown): code is SubscriptionBlockCode =>
  typeof code === "string" && (SUBSCRIPTION_BLOCK_CODES as readonly string[]).includes(code)

/** Does the plan state alone mean the person is blocked (used by the billing page headline)? */
export function blockedBy(status: BillingStatus, clock: TrialClock): SubscriptionBlockCode | null {
  if (clock?.kind === "ended") return "ATTENDE_TRIAL_EXPIRED"
  if (status === "past_due" || status === "canceled") return "ATTENDE_SUBSCRIPTION_INACTIVE"
  return null
}

// ---- Attende subscription (Stripe) and usage ---------------------------------------------------

/**
 * The workspace's Stripe subscription, only when it is an Attende-ai plan (`attende_*`). A JSYNQ subscription on the same
 * workspace is NOT shown here: managing it from this page would change the wrong product.
 */
export type AttendeSubscription = {
  planSlug: string
  status: string
  /** Price of the plan in major units with its own currency and period; null when the price can't be resolved. */
  price: { amount: number; currency: string; interval: "month" | "year"; intervalCount: number } | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
}

type RawPrice = { id?: unknown; amount?: unknown; currency?: unknown; interval?: unknown; intervalCount?: unknown }

const iso = (value: unknown): string | null => {
  if (typeof value !== "string" && !(value instanceof Date)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Reads `/subscriptions/me`. `preferredCurrency` is the Stripe customer's currency when the session knows it: a price
 * that exists in several currencies (USD with a BRL option) is shown in the one the customer is billed in, never guessed
 * from the interface language. Amounts from Stripe are in minor units.
 */
export function parseAttendeSubscription(raw: unknown, preferredCurrency?: string | null): AttendeSubscription | null {
  const sub = raw as { plan?: { slug?: unknown; availablePrices?: RawPrice[] }; stripePriceId?: unknown; status?: unknown; trialEndDate?: unknown; currentPeriodEnd?: unknown; canceledAt?: unknown } | null
  const slug = typeof sub?.plan?.slug === "string" ? sub.plan.slug : ""
  if (!slug.startsWith("attende_")) return null
  const candidates = (Array.isArray(sub?.plan?.availablePrices) ? sub!.plan!.availablePrices! : []).filter(
    (p) => p && (p.id === sub?.stripePriceId || !sub?.stripePriceId) && typeof p.amount === "number" && typeof p.currency === "string"
  )
  const wanted = preferredCurrency?.toLowerCase()
  const chosen = (wanted && candidates.find((p) => String(p.currency).toLowerCase() === wanted)) || (candidates.length === 1 ? candidates[0] : undefined)
  return {
    planSlug: slug,
    status: typeof sub?.status === "string" ? sub.status : "unknown",
    price: chosen
      ? {
          amount: (chosen.amount as number) / 100,
          currency: String(chosen.currency).toUpperCase(),
          interval: chosen.interval === "year" ? "year" : "month",
          intervalCount: typeof chosen.intervalCount === "number" && chosen.intervalCount > 0 ? chosen.intervalCount : 1,
        }
      : null,
    trialEndsAt: iso(sub?.trialEndDate),
    currentPeriodEnd: iso(sub?.currentPeriodEnd),
    canceledAt: iso(sub?.canceledAt),
  }
}

/**
 * When Stripe will charge next, only when a charge is really scheduled: an active or trialing Attende subscription that
 * was not canceled. Trial -> the trial end; active -> the end of the current period.
 */
export function nextCharge(sub: AttendeSubscription | null): { date: string; price: AttendeSubscription["price"] } | null {
  if (!sub || sub.canceledAt) return null
  if (sub.status === "trialing" && sub.trialEndsAt) return { date: sub.trialEndsAt, price: sub.price }
  if (sub.status === "active" && sub.currentPeriodEnd) return { date: sub.currentPeriodEnd, price: sub.price }
  return null
}

export type UsageMeterRow = { key: "aiReplies" | "lines" | "agents" | "docs"; used: number; limit: number | null }
export type AttendeUsage = { month: string | null; rows: UsageMeterRow[]; trialOutbound: { used: number; cap: number } | null }

/** `GET /api/attende/entitlements` -> `usage`. `null` when the API did not return usage (never shown as zeros). */
export function parseAttendeUsage(raw: unknown): AttendeUsage | null {
  const usage = (raw as { usage?: Record<string, unknown> | null } | null)?.usage
  if (!usage || typeof usage !== "object") return null
  const pair = (value: unknown): { used: number; limit: number | null } | null => {
    const v = value as { used?: unknown; limit?: unknown } | null
    if (!v || typeof v.used !== "number" || !Number.isFinite(v.used)) return null
    return { used: v.used, limit: typeof v.limit === "number" && v.limit >= 0 ? v.limit : null }
  }
  const rows: UsageMeterRow[] = []
  for (const key of ["aiReplies", "lines", "agents", "docs"] as const) {
    const p = pair(usage[key])
    if (p) rows.push({ key, ...p })
  }
  const outbound = usage.trialOutbound as { used?: unknown; cap?: unknown } | null
  return {
    month: typeof usage.month === "string" ? usage.month : null,
    rows,
    trialOutbound: outbound && typeof outbound.used === "number" && typeof outbound.cap === "number" ? { used: outbound.used, cap: outbound.cap } : null,
  }
}
