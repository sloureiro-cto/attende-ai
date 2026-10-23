import { formatMoney, formatNumber, formatPercent, localeOf, plural } from "./format"

describe("attende format", () => {
  it("maps app languages to locales, falling back to English", () => {
    expect(localeOf("portuguese")).toBe("pt-BR")
    expect(localeOf("nope")).toBe("en-US")
  })
  it("keeps the data's currency whatever the language", () => {
    expect(formatMoney(100, "usd", "portuguese")).toContain("US$")
    expect(formatMoney(100, "brl", "english")).toContain("R$")
  })
  it("tells an unknown amount from zero", () => {
    expect(formatMoney(null, "usd", "english")).toBeNull()
    expect(formatMoney(0, "usd", "english")).toBe("$0.00")
  })
  it("formats numbers, percents and plurals per locale", () => {
    expect(formatNumber(1234, "portuguese")).toBe("1.234")
    expect(formatPercent(0.42, "english")).toBe("42%")
    expect(plural(1, "portuguese", { one: "{count} conversa", other: "{count} conversas" })).toBe("1 conversa")
    expect(plural(3, "portuguese", { one: "{count} conversa", other: "{count} conversas" })).toBe("3 conversas")
    expect(plural(0, "english", { zero: "No conversations", one: "{count} conversation", other: "{count} conversations" })).toBe("No conversations")
  })
})
