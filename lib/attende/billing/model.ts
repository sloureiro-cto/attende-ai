import type { AttendeTierLimits } from "lib/attende/plans"
import type { BillingTranslationKey } from "lib/i18n/translations/attende/billing"

export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "none"

export type AttendeBilling = {
  tier: string | null
  status: BillingStatus
  limits: Partial<AttendeTierLimits> | null
  trialEndsAt: string | null
  /** Outbound messages allowed during the trial; 0 outside a trial or when the backend did not say. */
  trialOutboundCap: number
  /** Outbound messages sent during the trial. `null` = not available right now (never shown as 0). */
  trialOutboundUsed: number | null
}

const STATUSES: readonly BillingStatus[] = ["trialing", "active", "past_due", "canceled", "none"]
const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback
const numOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

const NO_PLAN: AttendeBilling = {
  tier: null,
  status: "none",
  limits: null,
  trialEndsAt: null,
  trialOutboundCap: 0,
  trialOutboundUsed: null,
}

/**
 * Plan state from `GET /attende/entitlements` (Attende backend): the `entitlements` block (tier, status, limits, trial end)
 * and the trial outbound counter of `usage.trialOutbound`. Read defensively: a workspace without an Attende-ai plan answers
 * `entitlements: null` (-> status "none"). Nothing here throws on odd data.
 */
export function parseAttendeBilling(raw: unknown): AttendeBilling {
  const body = raw as
    | {
        entitlements?: Record<string, unknown> | null
        usage?: { trialOutbound?: { used?: unknown; cap?: unknown } | null } | null
      }
    | null
    | undefined
  const block = body?.entitlements
  if (!block || typeof block !== "object") return NO_PLAN

  const status = STATUSES.includes(block.status as BillingStatus) ? (block.status as BillingStatus) : "none"
  const limits = block.limits && typeof block.limits === "object" ? (block.limits as Partial<AttendeTierLimits>) : null
  const endsAt = typeof block.trialEndsAt === "string" ? new Date(block.trialEndsAt) : null
  const outbound = body?.usage?.trialOutbound
  return {
    tier: typeof block.tier === "string" ? block.tier : null,
    status,
    limits,
    trialEndsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
    trialOutboundCap: num(outbound?.cap),
    trialOutboundUsed: numOrNull(outbound?.used),
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

/** The workspace's Attende-ai subscription (the `subscription` block of `GET /attende/entitlements`). */
export type AttendeSubscription = {
  planSlug: string | null
  status: string
  /** Price of the plan in major units with its own currency and period; null when the price can't be resolved. */
  price: { amount: number; currency: string; interval: "month" | "year"; intervalCount: number } | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  /** The customer scheduled the end at the period end (in the portal) and can still undo it there. */
  cancelAtPeriodEnd: boolean
  /** When the cancellation was requested or the subscription ended. Also set while `cancelAtPeriodEnd` is pending. */
  canceledAt: string | null
}

const iso = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Reads `subscription` from `GET /attende/entitlements`: `{planSlug, status, price: {amount, currency, interval,
 * intervalCount} | null, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, canceledAt}`. The amount is already in major units. `null` = no subscription.
 */
export function parseAttendeSubscription(raw: unknown): AttendeSubscription | null {
  const sub = (raw as { subscription?: Record<string, unknown> | null } | null | undefined)?.subscription
  if (!sub || typeof sub !== "object") return null
  const price = sub.price as
    | { amount?: unknown; currency?: unknown; interval?: unknown; intervalCount?: unknown }
    | null
    | undefined
  const validPrice =
    price &&
    typeof price.amount === "number" &&
    Number.isFinite(price.amount) &&
    typeof price.currency === "string" &&
    price.currency
  return {
    planSlug: typeof sub.planSlug === "string" && sub.planSlug ? sub.planSlug : null,
    status: typeof sub.status === "string" ? sub.status : "unknown",
    price: validPrice
      ? {
          amount: price.amount as number,
          currency: String(price.currency).toUpperCase(),
          interval: price.interval === "year" ? "year" : "month",
          intervalCount: typeof price.intervalCount === "number" && price.intervalCount > 0 ? price.intervalCount : 1,
        }
      : null,
    trialEndsAt: iso(sub.trialEndsAt),
    currentPeriodEnd: iso(sub.currentPeriodEnd),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd === true,
    canceledAt: iso(sub.canceledAt),
  }
}

/**
 * When a scheduled cancellation takes effect: the end of the paid period (or of the trial). `null` when none is pending.
 * The customer can still undo it in the Stripe portal until then.
 */
export function pendingCancellation(sub: AttendeSubscription | null): { date: string } | null {
  if (!sub?.cancelAtPeriodEnd || (sub.status !== "active" && sub.status !== "trialing")) return null
  const date = sub.currentPeriodEnd ?? sub.trialEndsAt
  return date ? { date } : null
}

/** The subscription ended or was canceled for good (not a cancellation still pending at the period end). */
export const isCanceled = (sub: AttendeSubscription | null): boolean => Boolean(sub?.canceledAt) && !sub?.cancelAtPeriodEnd

/**
 * When Stripe will charge next, only when a charge is really scheduled: an active or trialing Attende subscription that
 * was not canceled and is not set to end. Trial -> the trial end; active -> the end of the current period.
 */
export function nextCharge(sub: AttendeSubscription | null): { date: string; price: AttendeSubscription["price"] } | null {
  if (!sub || sub.canceledAt || sub.cancelAtPeriodEnd) return null
  if (sub.status === "trialing" && sub.trialEndsAt) return { date: sub.trialEndsAt, price: sub.price }
  if (sub.status === "active" && sub.currentPeriodEnd) return { date: sub.currentPeriodEnd, price: sub.price }
  return null
}

/** One meter. `used: null` = the count is not available right now (the backend could not read it): never shown as 0. */
export type UsageMeterRow = {
  key: "aiReplies" | "lines" | "agents" | "docs"
  used: number | null
  limit: number | null
}
export type AttendeUsage = { month: string | null; rows: UsageMeterRow[] }

/** `GET /attende/entitlements` -> `usage`. `null` when the API did not return usage (never shown as zeros). */
export function parseAttendeUsage(raw: unknown): AttendeUsage | null {
  const usage = (raw as { usage?: Record<string, unknown> | null } | null)?.usage
  if (!usage || typeof usage !== "object") return null
  const rows: UsageMeterRow[] = []
  for (const key of ["aiReplies", "lines", "agents", "docs"] as const) {
    const v = usage[key] as { used?: unknown; limit?: unknown } | null | undefined
    if (!v || typeof v !== "object") continue
    rows.push({ key, used: numOrNull(v.used), limit: typeof v.limit === "number" && v.limit >= 0 ? v.limit : null })
  }
  return { month: typeof usage.month === "string" ? usage.month : null, rows }
}

// ---- Invoices ----------------------------------------------------------------------------------

/** One Stripe invoice (`GET /attende/billing/invoices`). `created` is in Unix seconds, `amountPaid` in minor units. */
export type AttendeInvoice = {
  id: string
  number: string | null
  created: number
  amountPaid: number
  currency: string
  status: string | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

const strOrNull = (value: unknown): string | null => (typeof value === "string" && value ? value : null)

/** `{invoices: [...]}` -> invoices. Rows without an id, a date or an amount are dropped rather than shown wrong. */
export function parseAttendeInvoices(raw: unknown): AttendeInvoice[] {
  const list = (raw as { invoices?: unknown } | null | undefined)?.invoices
  if (!Array.isArray(list)) return []
  const out: AttendeInvoice[] = []
  for (const item of list) {
    const row = (item ?? {}) as Record<string, unknown>
    const id = strOrNull(row.id)
    const created = numOrNull(row.created)
    const amountPaid = numOrNull(row.amountPaid)
    const currency = strOrNull(row.currency)
    if (!id || created === null || amountPaid === null || !currency) continue
    out.push({
      id,
      number: strOrNull(row.number),
      created,
      amountPaid,
      currency,
      status: strOrNull(row.status),
      hostedInvoiceUrl: strOrNull(row.hostedInvoiceUrl),
      invoicePdf: strOrNull(row.invoicePdf),
    })
  }
  return out
}
