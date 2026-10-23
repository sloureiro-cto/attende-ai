import { statsEntries, statsKeys, translateStats } from "./statsStrings"

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",")

describe("stats strings", () => {
  it.each(statsKeys)("%s exists in en, pt and es with the same placeholders", (key) => {
    const entry = statsEntries[key]
    for (const lang of ["en", "pt", "es"] as const) expect(entry[lang].trim()).not.toBe("")
    expect(placeholders(entry.pt)).toBe(placeholders(entry.en))
    expect(placeholders(entry.es)).toBe(placeholders(entry.en))
  })

  it("fills placeholders", () => {
    expect(translateStats("portuguese", "stepReached", { count: 7 })).toBe("7 chegaram")
    expect(translateStats("english", "subtitle", { name: "Quotes" })).toContain("Quotes")
    expect(translateStats("portuguese", "kpiCompletedHint", { pct: "40%", started: 100 })).toBe("40% do total de 100 iniciadas")
  })

  it("speaks of automations, not bots", () => {
    for (const key of statsKeys) for (const lang of ["en", "pt", "es"] as const) expect(statsEntries[key][lang]).not.toMatch(/\bbots?\b/i)
  })
})
