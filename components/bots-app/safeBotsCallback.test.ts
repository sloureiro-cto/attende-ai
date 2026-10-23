import { safeBotsCallback } from "./safeBotsCallback"

describe("safeBotsCallback", () => {
  const fallback = "/bots"

  it("keeps relative paths", () => {
    expect(safeBotsCallback("/bots/abc?tab=stats", fallback)).toBe("/bots/abc?tab=stats")
  })

  it("rejects anything that could leave the origin", () => {
    expect(safeBotsCallback("https://evil.example", fallback)).toBe(fallback)
    expect(safeBotsCallback("//evil.example", fallback)).toBe(fallback)
    expect(safeBotsCallback("/\\evil.example", fallback)).toBe(fallback)
    expect(safeBotsCallback("javascript:alert(1)", fallback)).toBe(fallback)
    expect(safeBotsCallback("/ok\nSet-Cookie: x", fallback)).toBe(fallback)
  })

  it("never loops back into the login page", () => {
    expect(safeBotsCallback("/login?callbackUrl=%2Fbots", fallback)).toBe(fallback)
  })

  it("uses the fallback for empty values", () => {
    expect(safeBotsCallback(null, fallback)).toBe(fallback)
    expect(safeBotsCallback("", fallback)).toBe(fallback)
  })
})
