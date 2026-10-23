import { nextCharge, parseAttendeSubscription, parseAttendeUsage } from "../model"

const plan = (slug: string) => ({
  slug,
  availablePrices: [
    { id: "price_m", amount: 9900, currency: "usd", interval: "month" },
    { id: "price_m", amount: 49700, currency: "brl", interval: "month" },
    { id: "price_y", amount: 99000, currency: "usd", interval: "year" },
  ],
})

describe("parseAttendeSubscription", () => {
  it("ignores another product's subscription on the same workspace", () => {
    expect(parseAttendeSubscription({ plan: plan("pro"), stripePriceId: "price_m", status: "active" })).toBeNull()
    expect(parseAttendeSubscription(null)).toBeNull()
  })
  it("uses the customer's billing currency, not the interface language", () => {
    const brl = parseAttendeSubscription({ plan: plan("attende_growth"), stripePriceId: "price_m", status: "active" }, "brl")
    expect(brl?.price).toEqual({ amount: 497, currency: "BRL", interval: "month", intervalCount: 1 })
    const usd = parseAttendeSubscription({ plan: plan("attende_growth"), stripePriceId: "price_m", status: "active" }, "usd")
    expect(usd?.price?.currency).toBe("USD")
  })
  it("leaves the price unknown when the currency can't be resolved instead of guessing", () => {
    expect(parseAttendeSubscription({ plan: plan("attende_growth"), stripePriceId: "price_m", status: "active" })?.price).toBeNull()
    expect(parseAttendeSubscription({ plan: plan("attende_growth"), stripePriceId: "price_y", status: "active" })?.price?.interval).toBe("year")
  })
})

describe("nextCharge", () => {
  const base = { planSlug: "attende_growth", price: null, trialEndsAt: "2026-10-30T00:00:00.000Z", currentPeriodEnd: "2026-11-22T00:00:00.000Z", canceledAt: null }
  it("is the trial end while trialing and the period end while active", () => {
    expect(nextCharge({ ...base, status: "trialing" })?.date).toBe("2026-10-30T00:00:00.000Z")
    expect(nextCharge({ ...base, status: "active" })?.date).toBe("2026-11-22T00:00:00.000Z")
  })
  it("is never shown when nothing will be charged", () => {
    expect(nextCharge(null)).toBeNull()
    expect(nextCharge({ ...base, status: "active", canceledAt: "2026-10-01T00:00:00.000Z" })).toBeNull()
    expect(nextCharge({ ...base, status: "past_due" })).toBeNull()
  })
})

describe("parseAttendeUsage", () => {
  it("reads used vs limit and returns null (not zeros) when the API sends no usage", () => {
    expect(parseAttendeUsage({ usage: { month: "2026-10", aiReplies: { used: 12, limit: 1000 }, lines: { used: 1, limit: 1 } } })?.rows).toEqual([
      { key: "aiReplies", used: 12, limit: 1000 },
      { key: "lines", used: 1, limit: 1 },
    ])
    expect(parseAttendeUsage({ usage: null })).toBeNull()
    expect(parseAttendeUsage(undefined)).toBeNull()
  })
})
