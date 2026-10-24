import { nextCharge, parseAttendeSubscription, parseAttendeUsage } from "../model"

const subscription = (extra: Record<string, unknown> = {}) => ({
  planSlug: "attende_growth",
  status: "active",
  price: { amount: 497, currency: "brl", interval: "month", intervalCount: 1 },
  trialEndsAt: null,
  currentPeriodEnd: "2026-11-22T00:00:00.000Z",
  ...extra,
})

describe("parseAttendeSubscription", () => {
  it("reads the subscription block of /attende/entitlements (amount already in major units)", () => {
    const sub = parseAttendeSubscription({ subscription: subscription() })
    expect(sub).toEqual({
      planSlug: "attende_growth",
      status: "active",
      price: { amount: 497, currency: "BRL", interval: "month", intervalCount: 1 },
      trialEndsAt: null,
      currentPeriodEnd: "2026-11-22T00:00:00.000Z",
      canceledAt: null,
    })
  })
  it("is null without a subscription", () => {
    expect(parseAttendeSubscription({ subscription: null })).toBeNull()
    expect(parseAttendeSubscription(null)).toBeNull()
  })
  it("leaves the price unknown when the backend could not resolve it instead of guessing", () => {
    expect(parseAttendeSubscription({ subscription: subscription({ price: null }) })?.price).toBeNull()
    expect(
      parseAttendeSubscription({
        subscription: subscription({ price: { amount: 990, currency: "usd", interval: "year" } }),
      })?.price
    ).toEqual({
      amount: 990,
      currency: "USD",
      interval: "year",
      intervalCount: 1,
    })
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
  it("keeps a meter whose count JSYNQ could not give as unavailable (null), never 0", () => {
    const usage = parseAttendeUsage({
      usage: { month: "2026-10", aiReplies: { used: null, limit: 1000 }, agents: { used: 2, limit: 3 } },
    })
    expect(usage?.rows).toEqual([
      { key: "aiReplies", used: null, limit: 1000 },
      { key: "agents", used: 2, limit: 3 },
    ])
  })
})
