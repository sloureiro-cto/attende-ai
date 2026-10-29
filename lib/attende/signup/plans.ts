import type { AttendeTierId, AttendeTierLimits } from "lib/attende/plans"
import { formatPrice } from "lib/attende/plans"

/** Slugs of the three tiers: the JSYNQ plans `GET /api/attende/signup/plans` answers. */
export const ATTENDE_PLAN_SLUGS = ["attende-essencial", "attende-profissional", "attende-escala"] as const
export type AttendePlanSlug = (typeof ATTENDE_PLAN_SLUGS)[number]

export const DEFAULT_PLAN_SLUG: AttendePlanSlug = "attende-essencial"
/** Every account is billed in this currency for now (the backend decides; the catalog says it too). */
export const BILLING_CURRENCY = "usd"

export type SignupPlanPrice = { currency: string; interval: "month" | "year"; amount: number }
export type SignupPlan = {
  slug: AttendePlanSlug
  tier: AttendeTierId
  name: string
  limits: Partial<AttendeTierLimits>
  prices: SignupPlanPrice[]
}
export type SignupTrial = { days: number; requiresCard: boolean; outboundCap: number }
export type SignupPlansResponse = { trial: SignupTrial; currency: string; plans: SignupPlan[] }

export const DEFAULT_TRIAL: SignupTrial = { days: 7, requiresCard: true, outboundCap: 50 }

const isSlug = (value: unknown): value is AttendePlanSlug => typeof value === "string" && (ATTENDE_PLAN_SLUGS as readonly string[]).includes(value)
const tierOf = (slug: AttendePlanSlug): AttendeTierId => slug.replace("attende-", "") as AttendeTierId

/** Links shared before the tiers were renamed. */
const LEGACY: Record<string, AttendePlanSlug> = {
  starter: "attende-essencial",
  growth: "attende-profissional",
  scale: "attende-escala",
  attende_starter: "attende-essencial",
  attende_growth: "attende-profissional",
  attende_scale: "attende-escala",
}

/**
 * Accepts `profissional`, `attende-profissional`, the old names, or anything else. Unknown values fall back to the
 * default tier, so a bad `?plan=` never breaks the page.
 */
export function normalizePlanSlug(input: string | null | undefined): AttendePlanSlug {
  const value = (input ?? "").trim().toLowerCase()
  if (isSlug(value)) return value
  if (Object.hasOwn(LEGACY, value)) return LEGACY[value]!
  const prefixed = `attende-${value}`
  return isSlug(prefixed) ? prefixed : DEFAULT_PLAN_SLUG
}

const positive = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback)

/** Tolerant parser for the plans response: anything malformed is dropped, the trial block falls back on the documented defaults. */
export function parseSignupPlans(payload: unknown): SignupPlansResponse {
  const root = (payload && typeof payload === "object" ? payload : {}) as { trial?: Record<string, unknown>; currency?: unknown; plans?: unknown }
  const trial: SignupTrial = {
    days: positive(root.trial?.days, DEFAULT_TRIAL.days),
    requiresCard: root.trial?.requiresCard !== false,
    outboundCap: positive(root.trial?.outboundCap, DEFAULT_TRIAL.outboundCap),
  }
  const plans: SignupPlan[] = []
  for (const row of Array.isArray(root.plans) ? root.plans : []) {
    if (!row || typeof row !== "object") continue
    const record = row as Record<string, unknown>
    if (!isSlug(record.slug)) continue
    const prices: SignupPlanPrice[] = []
    for (const price of Array.isArray(record.prices) ? record.prices : []) {
      const p = price as Record<string, unknown> | null
      if (!p || typeof p.currency !== "string" || typeof p.amount !== "number" || !Number.isFinite(p.amount) || p.amount < 0) continue
      prices.push({ currency: p.currency.toLowerCase(), interval: p.interval === "year" ? "year" : "month", amount: p.amount })
    }
    plans.push({
      slug: record.slug,
      tier: tierOf(record.slug),
      name: typeof record.name === "string" && record.name ? record.name : tierOf(record.slug),
      limits: (record.limits && typeof record.limits === "object" ? record.limits : {}) as Partial<AttendeTierLimits>,
      prices,
    })
  }
  const currency = typeof root.currency === "string" && root.currency ? root.currency.toLowerCase() : BILLING_CURRENCY
  return { trial, currency, plans }
}

/**
 * The currency prices are shown in. Everyone is billed in USD for now, whatever the language or country (JSYNQ's
 * subscription is created in USD); the argument is kept so a per-country currency is a change here only.
 */
export function preferredCurrency(_language?: "english" | "portuguese" | "spanish"): string {
  return BILLING_CURRENCY
}

/** The monthly price in the preferred currency, else any monthly price. `null` when the plan has none. */
export function pickMonthlyPrice(plan: SignupPlan | undefined, currency: string): SignupPlanPrice | null {
  if (!plan) return null
  const monthly = plan.prices.filter((p) => p.interval === "month")
  return monthly.find((p) => p.currency === currency.toLowerCase()) ?? monthly[0] ?? null
}

export function formatSignupPrice(price: SignupPlanPrice, locale: string): string {
  return formatPrice({ amountCents: price.amount, currency: price.currency.toUpperCase(), interval: price.interval }, locale)
}
