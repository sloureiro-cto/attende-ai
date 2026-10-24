import { isCanceled, nextCharge, parseAttendeInvoices, parseAttendeSubscription, parseAttendeUsage, pendingCancellation } from "../model"

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
      cancelAtPeriodEnd: false,
      canceledAt: null,
    })
  })
  it("reads a cancellation scheduled at the period end", () => {
    expect(
      parseAttendeSubscription({ subscription: subscription({ cancelAtPeriodEnd: true, canceledAt: "2026-10-20T12:00:00.000Z" }) })
    ).toMatchObject({ cancelAtPeriodEnd: true, canceledAt: "2026-10-20T12:00:00.000Z" })
    expect(parseAttendeSubscription({ subscription: subscription({ cancelAtPeriodEnd: "yes" }) })?.cancelAtPeriodEnd).toBe(false)
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
  const base = { planSlug: "attende_growth", price: null, trialEndsAt: "2026-10-30T00:00:00.000Z", currentPeriodEnd: "2026-11-22T00:00:00.000Z", cancelAtPeriodEnd: false, canceledAt: null }
  it("is the trial end while trialing and the period end while active", () => {
    expect(nextCharge({ ...base, status: "trialing" })?.date).toBe("2026-10-30T00:00:00.000Z")
    expect(nextCharge({ ...base, status: "active" })?.date).toBe("2026-11-22T00:00:00.000Z")
  })
  it("is never shown when nothing will be charged", () => {
    expect(nextCharge(null)).toBeNull()
    expect(nextCharge({ ...base, status: "active", canceledAt: "2026-10-01T00:00:00.000Z" })).toBeNull()
    expect(nextCharge({ ...base, status: "past_due" })).toBeNull()
    expect(nextCharge({ ...base, status: "active", cancelAtPeriodEnd: true })).toBeNull()
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

describe("pendingCancellation / isCanceled", () => {
  const base = { planSlug: "attende_growth", price: null, trialEndsAt: null, currentPeriodEnd: "2026-11-22T00:00:00.000Z", cancelAtPeriodEnd: false, canceledAt: null }
  it("dates a scheduled cancellation at the period end, and it is not yet canceled", () => {
    const sub = { ...base, status: "active", cancelAtPeriodEnd: true, canceledAt: "2026-10-20T12:00:00.000Z" }
    expect(pendingCancellation(sub)).toEqual({ date: "2026-11-22T00:00:00.000Z" })
    expect(isCanceled(sub)).toBe(false)
  })
  it("a trial set to end falls back to the trial end", () => {
    expect(pendingCancellation({ ...base, status: "trialing", currentPeriodEnd: null, trialEndsAt: "2026-10-30T00:00:00.000Z", cancelAtPeriodEnd: true })).toEqual({ date: "2026-10-30T00:00:00.000Z" })
  })
  it("nothing pending without the flag or once the subscription ended", () => {
    expect(pendingCancellation({ ...base, status: "active" })).toBeNull()
    expect(pendingCancellation({ ...base, status: "canceled", cancelAtPeriodEnd: true })).toBeNull()
    expect(pendingCancellation(null)).toBeNull()
    expect(isCanceled({ ...base, status: "canceled", canceledAt: "2026-10-20T12:00:00.000Z" })).toBe(true)
    expect(isCanceled(null)).toBe(false)
  })
})

describe("parseAttendeInvoices", () => {
  const invoice = { id: "in_1", number: "A-1", created: 1792700000, amountPaid: 49700, currency: "brl", status: "paid", hostedInvoiceUrl: "https://x/1", invoicePdf: null }
  it("reads the invoices list and keeps the fields the page renders", () => {
    expect(parseAttendeInvoices({ invoices: [invoice] })).toEqual([invoice])
  })
  it("drops broken rows and tolerates a missing list", () => {
    expect(parseAttendeInvoices({ invoices: [invoice, { id: "in_2" }, null, { ...invoice, id: "in_3", number: "" }] }).map((i) => [i.id, i.number])).toEqual([
      ["in_1", "A-1"],
      ["in_3", null],
    ])
    expect(parseAttendeInvoices({})).toEqual([])
    expect(parseAttendeInvoices(null)).toEqual([])
  })
})
