import { draftFromText, draftToText, parseAmountInput, parsePrice, serializePrice } from "../price"

describe("price text", () => {
  it("writes one unambiguous sentence in the agent's language", () => {
    expect(serializePrice({ kind: "fixed", currency: "BRL", amount: 150, unit: "service" }, "pt")).toBe("R$ 150,00 por serviço")
    expect(serializePrice({ kind: "from", currency: "USD", amount: 39, unit: "month" }, "pt")).toBe("a partir de US$ 39,00/mês")
    expect(serializePrice({ kind: "on_request", currency: "", amount: null, unit: "none" }, "pt")).toBe("sob consulta")
    expect(serializePrice({ kind: "from", currency: "EUR", amount: 1234.5, unit: "year" }, "en")).toBe("from €1,234.50/year")
  })

  it("keeps the currency of the data, whatever the language", () => {
    expect(serializePrice({ kind: "fixed", currency: "USD", amount: 10, unit: "none" }, "pt")).toContain("US$")
    expect(serializePrice({ kind: "fixed", currency: "BRL", amount: 10, unit: "none" }, "en")).toContain("R$")
  })

  it("never writes a price without currency or amount (empty is not zero)", () => {
    expect(serializePrice({ kind: "fixed", currency: "", amount: 10, unit: "none" }, "pt")).toBeNull()
    expect(serializePrice({ kind: "fixed", currency: "BRL", amount: null, unit: "none" }, "pt")).toBeNull()
    expect(serializePrice({ kind: "fixed", currency: "BRL", amount: 0, unit: "none" }, "pt")).toBe("R$ 0,00")
  })

  it("reads back what it wrote, in any language", () => {
    for (const lang of ["pt", "en", "es"] as const) {
      for (const p of [
        { kind: "fixed" as const, currency: "BRL", amount: 150, unit: "service" as const },
        { kind: "from" as const, currency: "USD", amount: 1234.56, unit: "month" as const },
        { kind: "fixed" as const, currency: "EUR", amount: 9.9, unit: "initial" as const },
      ]) {
        const text = serializePrice(p, lang)!
        expect([text, parsePrice(text, "pt")]).toEqual([text, p])
      }
    }
  })

  it("leaves anything else as free text", () => {
    expect(parsePrice("R$ 150")).toBeNull()
    expect(parsePrice("de 100 a 200 reais")).toBeNull()
    expect(draftFromText("R$ 150", "pt", "portuguese")).toMatchObject({ mode: "custom", custom: "R$ 150" })
    expect(draftFromText("", "pt", "portuguese").mode).toBe("none")
  })
})

describe("amount typed in the UI language", () => {
  it("reads Portuguese and English separators", () => {
    expect(parseAmountInput("1.234,56", "portuguese")).toBe(1234.56)
    expect(parseAmountInput("150,5", "portuguese")).toBe(150.5)
    expect(parseAmountInput("150.5", "portuguese")).toBe(150.5)
    expect(parseAmountInput("1.500", "portuguese")).toBe(1500)
    expect(parseAmountInput("1,234.56", "english")).toBe(1234.56)
    expect(parseAmountInput("0", "english")).toBe(0)
  })

  it("rejects what is not an amount", () => {
    expect(parseAmountInput("", "english")).toBeNull()
    expect(parseAmountInput("abc", "english")).toBeNull()
    expect(parseAmountInput("-5", "english")).toBeNull()
    expect(parseAmountInput("1.2.3,4", "portuguese")).toBeNull()
    expect(parseAmountInput("10,999", "portuguese")).toBeNull()
  })
})

describe("draft to text", () => {
  it("serializes complete drafts and reports what is missing", () => {
    const base = { currency: "BRL", amount: "150", unit: "service" as const, custom: "" }
    expect(draftToText({ ...base, mode: "fixed" }, "pt", "portuguese")).toEqual({ text: "R$ 150,00 por serviço", problem: null })
    expect(draftToText({ ...base, mode: "fixed", currency: "" }, "pt", "portuguese").problem).toBe("currency")
    expect(draftToText({ ...base, mode: "fixed", amount: "" }, "pt", "portuguese").problem).toBe("amount")
    expect(draftToText({ ...base, mode: "none" }, "pt", "portuguese")).toEqual({ text: "", problem: null })
    expect(draftToText({ ...base, mode: "custom", custom: "x".repeat(61) }, "pt", "portuguese").problem).toBe("length")
  })
})
