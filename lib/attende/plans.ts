/**
 * Reference limits of the three Attende-ai tiers. These mirror the backend's plan rules (the backend is the
 * enforcement point); the page only presents them. NO prices live here: they come from the plans endpoint
 * (`server/modules/billing/catalog.ts`).
 */
export type AttendeTierId = "essencial" | "profissional" | "escala"

export type AttendeTierLimits = {
  lines: number
  agents: number
  aiRepliesPerMonth: number
  seats: number
  docs: number
}

export type AttendeTier = { id: AttendeTierId; popular?: boolean; limits: AttendeTierLimits }

export const ATTENDE_TIERS: readonly AttendeTier[] = [
  { id: "essencial", limits: { lines: 1, agents: 1, aiRepliesPerMonth: 1000, seats: 2, docs: 20 } },
  { id: "profissional", popular: true, limits: { lines: 3, agents: 3, aiRepliesPerMonth: 5000, seats: 5, docs: 100 } },
  { id: "escala", limits: { lines: 10, agents: 10, aiRepliesPerMonth: 20000, seats: 15, docs: 500 } },
] as const

export const TRIAL_DAYS = 7

export type AttendePrice = { amountCents: number; currency: string; interval: "month" | "year" }
export function formatPrice(price: AttendePrice, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: price.currency, maximumFractionDigits: price.amountCents % 100 === 0 ? 0 : 2 }).format(
      price.amountCents / 100
    )
  } catch {
    return `${(price.amountCents / 100).toFixed(2)} ${price.currency}`
  }
}
