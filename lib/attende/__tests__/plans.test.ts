import { ATTENDE_TIERS, formatPrice } from "../plans"

describe("ATTENDE_TIERS", () => {
  it("mirrors the reference limits of the three tiers", () => {
    expect(ATTENDE_TIERS.map((t) => [t.id, t.limits.lines, t.limits.agents, t.limits.aiRepliesPerMonth, t.limits.seats, t.limits.docs])).toEqual([
      ["essencial", 1, 1, 1000, 2, 20],
      ["profissional", 3, 3, 5000, 5, 100],
      ["escala", 10, 10, 20000, 15, 500],
    ])
  })
  it("carries no price", () => {
    expect(JSON.stringify(ATTENDE_TIERS)).not.toMatch(/price|amount|currency/i)
  })
  it("marks exactly one tier as popular", () => {
    expect(ATTENDE_TIERS.filter((t) => t.popular).map((t) => t.id)).toEqual(["profissional"])
  })
})

describe("formatPrice", () => {
  it("formats in the viewer's locale and drops .00", () => {
    expect(formatPrice({ amountCents: 19700, currency: "BRL", interval: "month" }, "pt-BR")).toMatch(/197/)
    expect(formatPrice({ amountCents: 19750, currency: "USD", interval: "month" }, "en-US")).toContain("197.5")
  })
  it("survives an invalid currency code", () => {
    expect(formatPrice({ amountCents: 1000, currency: "??", interval: "month" }, "en-US")).toContain("10.00")
  })
})
