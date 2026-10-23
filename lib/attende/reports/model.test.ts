import { emptyOverview, kpi, overview, point } from "./fixtures"
import {
  addDays,
  csvCell,
  daysBetween,
  deriveInsights,
  describeDelta,
  filtersToApiQuery,
  filtersToSearchParams,
  formatDuration,
  formatKpi,
  formatDayRange as formatRange,
  formatReportDay,
  formatShare,
  isEmptyOverview,
  parseReportFilters,
  presetRange,
  previousHasData,
  reportBases,
  toCsv,
} from "./model"
import type { AgentBreakdownRow } from "./types"

const NOW = new Date("2026-10-22T15:00:00.000Z")

describe("report filters from the URL", () => {
  it("defaults to the last 30 days ending today (UTC)", () => {
    const { filters, preset } = parseReportFilters({}, NOW)
    expect(preset).toBe(30)
    expect(filters).toEqual({ from: "2026-09-23", to: "2026-10-22", channel: null, agentId: null })
    expect(daysBetween(filters.from, filters.to)).toBe(30)
  })

  it("accepts the 7 and 90 day presets and ignores unknown ones", () => {
    expect(parseReportFilters({ days: "7" }, NOW).filters.from).toBe("2026-10-16")
    expect(parseReportFilters({ days: "90" }, NOW).preset).toBe(90)
    expect(parseReportFilters({ days: "45" }, NOW).preset).toBe(30)
  })

  it("accepts a custom range and recognises a preset-sized one ending today", () => {
    expect(parseReportFilters({ from: "2026-08-01", to: "2026-08-31" }, NOW)).toMatchObject({ preset: "custom" })
    expect(parseReportFilters({ from: "2026-10-16", to: "2026-10-22" }, NOW).preset).toBe(7)
  })

  it.each([
    [{ from: "2026-10-20", to: "2026-10-10" }, "start after end"],
    [{ from: "2026-10-01", to: "2026-10-23" }, "end in the future"],
    [{ from: "2025-01-01", to: "2026-10-22" }, "more than 366 days"],
    [{ from: "nope", to: "2026-10-22" }, "not a date"],
    [{ from: "2026-02-30", to: "2026-03-05" }, "impossible date"],
  ])("falls back to the default window: %j (%s)", (params) => {
    expect(parseReportFilters(params, NOW).preset).toBe(30)
  })

  it("keeps a 366 day window and rejects 367", () => {
    const to = "2026-10-22"
    expect(parseReportFilters({ from: addDays(to, -365), to }, NOW).preset).toBe("custom")
    expect(parseReportFilters({ from: addDays(to, -366), to }, NOW).preset).toBe(30)
  })

  it("only trusts known channels and well-formed agent ids", () => {
    const id = "a".repeat(24)
    expect(parseReportFilters({ channel: "sms", agent: id }, NOW).filters).toMatchObject({ channel: "sms", agentId: id })
    expect(parseReportFilters({ channel: "fax", agent: "../x" }, NOW).filters).toMatchObject({ channel: null, agentId: null })
    expect(parseReportFilters({ agent: "none" }, NOW).filters.agentId).toBe("none")
  })

  it("reads URLSearchParams too and round-trips through the URL", () => {
    const parsed = parseReportFilters(new URLSearchParams("days=7&channel=whatsapp"), NOW)
    const params = filtersToSearchParams(parsed.filters, parsed.preset)
    expect(params.toString()).toBe("days=7&channel=whatsapp")
    expect(parseReportFilters(params, NOW)).toEqual(parsed)
    expect(filtersToSearchParams(presetRange(30, NOW) as never, 30).toString()).toBe("")
  })

  it("maps to the backend query with agentId", () => {
    expect(filtersToApiQuery({ from: "2026-10-01", to: "2026-10-07", channel: "sms", agentId: "none" })).toEqual({ from: "2026-10-01", to: "2026-10-07", channel: "sms", agentId: "none" })
    expect(filtersToApiQuery({ from: "2026-10-01", to: "2026-10-07", channel: null, agentId: null })).toEqual({ from: "2026-10-01", to: "2026-10-07" })
  })
})

describe("deltas", () => {
  it("compares rates in percentage points and counts in percent", () => {
    expect(describeDelta(kpi(0.55, 0.4), "percent", "up")).toEqual({ direction: "up", tone: "good", pct: null, points: 15 })
    expect(describeDelta(kpi(120, 100), "count", "neutral")).toEqual({ direction: "up", tone: "neutral", pct: 20, points: null })
  })

  it("colours by what is good news for that metric", () => {
    expect(describeDelta(kpi(0.2, 0.3), "percent", "down")?.tone).toBe("good")
    expect(describeDelta(kpi(0.4, 0.3), "percent", "down")?.tone).toBe("bad")
    expect(describeDelta(kpi(30_000, 60_000), "duration", "down")?.tone).toBe("good")
    expect(describeDelta(kpi(5, 5), "count", "up")?.tone).toBe("flat")
  })

  it("returns null when there is nothing honest to compare", () => {
    expect(describeDelta(kpi(5, null), "count", "up")).toBeNull()
    expect(describeDelta(kpi(null, 5), "count", "up")).toBeNull()
  })

  it("has no percent when the previous period was zero", () => {
    expect(describeDelta(kpi(8, 0), "count", "up")).toEqual({ direction: "up", tone: "good", pct: null, points: null })
  })
})

describe("formatting", () => {
  it("formats durations with the locale's units", () => {
    expect(formatDuration(45_000, "english")).toBe("45 sec")
    expect(formatDuration(45_000, "portuguese")).toBe("45 s")
    expect(formatDuration(190_000, "english")).toBe("3 min")
    expect(formatDuration(4_800_000, "portuguese")).toBe("1 h 20 min")
    expect(formatDuration(7_200_000, "english")).toBe("2 hr")
    expect(formatDuration(3 * 86_400_000, "portuguese")).toBe("3 dias")
  })

  it("never turns a missing value into 0: it returns null for the view to say so", () => {
    expect(formatShare(null, "english")).toBeNull()
    expect(formatKpi(null, "count", "english")).toBeNull()
    expect(formatKpi(null, "duration", "english")).toBeNull()
    expect(formatDuration(null, "english")).toBeNull()
    expect(formatDuration(-1, "english")).toBeNull()
    expect(formatKpi(0, "count", "english")).toBe("0")
  })

  it("writes shares as the locale does", () => {
    expect(formatShare(0.426, "english")).toBe("42.6%")
    expect(formatShare(0.426, "portuguese")).toBe("42,6%")
    expect(formatShare(0.5, "portuguese")).toBe("50%")
  })

  it("writes report days in UTC, whatever the browser time zone", () => {
    expect(formatReportDay("2026-10-01", "english")).toBe("Oct 1")
    expect(formatReportDay("2026-10-01", "portuguese")).toBe("1 de out.")
  })

  it("writes a period as a range, adding the year only when needed", () => {
    const now = new Date("2026-10-22T12:00:00Z")
    // Intl puts thin / no-break spaces around the dash; compare with plain spaces.
    const formatDayRange = (...args: Parameters<typeof formatRange>) => formatRange(...args).replace(/[\u2009\u202f\u00a0]/g, " ")
    expect(formatDayRange("2026-10-01", "2026-10-30", "english", { now })).toBe("Oct 1 – 30")
    expect(formatDayRange("2026-09-23", "2026-10-22", "portuguese", { now })).toBe("23 de set. – 22 de out.")
    expect(formatDayRange("2025-12-23", "2026-01-22", "english", { now })).toBe("Dec 23, 2025 – Jan 22, 2026")
    expect(formatDayRange("2026-10-01", "2026-10-30", "english", { now, withYear: true })).toBe("Oct 1 – 30, 2026")
    expect(formatDayRange("2026-10-22", "2026-10-22", "english", { now })).toBe("Oct 22")
  })
})

describe("what a number is measured on", () => {
  it("takes the numerator and denominator of each rate from the outcome counts", () => {
    expect(reportBases(overview())).toEqual({
      handoff: { count: 24, total: 120 },
      // possible AI resolution leaves the open conversations out of the base, like the backend formula
      resolution: { count: 60, total: 102, open: 18 },
      leads: { count: 25, total: 120 },
    })
  })

  it("has no base when nothing started", () => {
    expect(reportBases(emptyOverview())).toEqual({ handoff: null, resolution: null, leads: null })
  })

  it("treats a previous period with no activity at all as having no data", () => {
    expect(previousHasData(overview())).toBe(true)
    const o = overview()
    o.kpis = { ...o.kpis, conversations: kpi(120, 0), aiReplies: kpi(400, 0), humanReplies: kpi(60, 0), automationReplies: kpi(30, 0) }
    expect(previousHasData(o)).toBe(false)
  })
})

describe("empty state and insights", () => {
  it("recognises a brand-new account", () => {
    expect(isEmptyOverview(emptyOverview())).toBe(true)
    expect(isEmptyOverview(overview())).toBe(false)
  })

  it("is not empty when only messages arrived", () => {
    const o = emptyOverview()
    o.series = [point(1, { inboundMessages: 3 })]
    expect(isEmptyOverview(o)).toBe(false)
  })

  it("derives insights only with enough volume, most actionable first, at most four", () => {
    const small = overview({ kpis: { ...overview().kpis, conversations: kpi(4, 3) } })
    expect(deriveInsights(small)).toEqual([])
    const keys = deriveInsights(overview()).map((i) => i.key)
    expect(keys).toEqual(["resolutionUp", "handoffDown", "topHandoffReason", "busiestDay"])
  })

  it("names the best agent when nothing more urgent competes", () => {
    const base = overview()
    const quiet = overview({ kpis: { ...base.kpis, aiResolutionRate: kpi(0.5, 0.5), handoffRate: kpi(0.2, 0.2) }, topHandoffReasons: [], series: [point(1, { conversations: 2 })] })
    expect(deriveInsights(quiet).map((i) => i.key)).toEqual(["bestAgent"])
  })

  it("never names the unattributed bucket as the best agent", () => {
    const o = overview()
    const unattributed = o.byAgent[2] as AgentBreakdownRow
    o.byAgent = [{ ...unattributed, aiResolutionRate: 0.99, conversations: 50, name: "Ghost" }, o.byAgent[1] as AgentBreakdownRow]
    expect(deriveInsights(o).some((i) => i.key === "bestAgent")).toBe(false)
  })

  it("does not compare with a previous period that has no data", () => {
    const o = overview()
    o.kpis = { ...o.kpis, conversations: kpi(120, 0), aiReplies: kpi(400, 0), humanReplies: kpi(60, 0), automationReplies: kpi(30, 0) }
    const keys = deriveInsights(o).map((i) => i.key)
    expect(keys).not.toContain("resolutionUp")
    expect(keys).not.toContain("handoffDown")
  })

  it("flags a slow AI first reply", () => {
    const base = overview()
    const o = overview({
      kpis: { ...base.kpis, aiResolutionRate: kpi(0.5, 0.5), handoffRate: kpi(0.2, 0.2), firstResponseAiMedianMs: kpi(15 * 60_000, 10 * 60_000) },
      topHandoffReasons: [],
    })
    expect(deriveInsights(o).map((i) => i.key)[0]).toBe("slowAiResponse")
  })
})

describe("csv", () => {
  it("quotes and neutralises spreadsheet formulas in free text", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"')
    expect(csvCell("+55 11")).toBe("'+55 11")
    expect(csvCell("a,b")).toBe('"a,b"')
    expect(csvCell(-5)).toBe("-5")
    expect(csvCell(null)).toBe("")
    expect(csvCell(Number.NaN)).toBe("")
  })

  it("joins rows with CRLF", () => {
    expect(toCsv([["a", 1], ["b", null]])).toBe("a,1\r\nb,\r\n")
  })
})
