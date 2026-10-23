import type { AttendeTierId, AttendeTierLimits } from "lib/attende/plans"
import { formatPrice } from "lib/attende/plans"

/** Slugs the backend uses for the three tiers (`GET /api/attende/signup/plans`). */
export const ATTENDE_PLAN_SLUGS = ["attende_starter", "attende_growth", "attende_scale"] as const
export type AttendePlanSlug = (typeof ATTENDE_PLAN_SLUGS)[number]

export const DEFAULT_PLAN_SLUG: AttendePlanSlug = "attende_starter"

export type SignupPlanPrice = { currency: string; interval: "month" | "year"; amount: number }
export type SignupPlan = {
  slug: AttendePlanSlug
  tier: AttendeTierId
  name: string
  limits: Partial<AttendeTierLimits>
  prices: SignupPlanPrice[]
}
export type SignupTrial = { days: number; requiresCard: boolean; outboundCap: number }
export type SignupPlansResponse = { trial: SignupTrial; plans: SignupPlan[] }

export const DEFAULT_TRIAL: SignupTrial = { days: 7, requiresCard: true, outboundCap: 50 }

const isSlug = (value: unknown): value is AttendePlanSlug => typeof value === "string" && (ATTENDE_PLAN_SLUGS as readonly string[]).includes(value)
const tierOf = (slug: AttendePlanSlug): AttendeTierId => slug.replace("attende_", "") as AttendeTierId

/**
 * Accepts `starter`, `attende_starter` or anything else. Unknown values fall back to the default tier, so a bad `?plan=`
 * never breaks the page.
 */
export function normalizePlanSlug(input: string | null | undefined): AttendePlanSlug {
  const value = (input ?? "").trim().toLowerCase()
  if (isSlug(value)) return value
  const prefixed = `attende_${value}`
  return isSlug(prefixed) ? prefixed : DEFAULT_PLAN_SLUG
}

const positive = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback)

/** Tolerant parser for the plans response: anything malformed is dropped, the trial block falls back on the documented defaults. */
export function parseSignupPlans(payload: unknown): SignupPlansResponse {
  const root = (payload && typeof payload === "object" ? payload : {}) as { trial?: Record<string, unknown>; plans?: unknown }
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
  return { trial, plans }
}

/** Brazil is billed in BRL and everyone else in USD (the backend decides by country; this only mirrors it for the label). */
export function preferredCurrency(language: "english" | "portuguese" | "spanish"): "brl" | "usd" {
  return language === "portuguese" ? "brl" : "usd"
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
