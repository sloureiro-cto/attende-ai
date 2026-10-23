import { agentsCsv, dailyCsv, exportFileName, outcomesCsv } from "./exports"
import { overview } from "./fixtures"

const label = (k: string) => k

describe("report CSV exports", () => {
  it("exports the daily series with a header", () => {
    const o = overview()
    const lines = dailyCsv(o.series, label).trim().split("\r\n")
    expect(lines[0]).toBe("tableDay,seriesConversations,seriesCustomerMessages,seriesAiReplies,seriesHumanReplies,seriesHandoffs,seriesLeads")
    expect(lines).toHaveLength(1 + o.series.length)
    expect(lines[1]).toBe("2026-10-01,10,0,30,0,0,0")
  })

  it("keeps missing rates empty, never 0", () => {
    const o = overview()
    const lines = agentsCsv(o.byAgent, label, "Everything else").trim().split("\r\n")
    expect(lines[3]).toBe("Everything else,10,0,,,,2")
    expect(lines[1]).toBe("Sofia,80,300,15,70,35,18")
  })

  it("neutralises formulas in agent names", () => {
    const o = overview()
    const evil = [{ ...(o.byAgent[0] as (typeof o.byAgent)[number]), name: "=SUM(A1)" }]
    expect(agentsCsv(evil, label, "x")).toContain("'=SUM(A1)")
  })

  it("exports outcomes in percent", () => {
    const o = overview()
    const lines = outcomesCsv(o.outcomes, label, (x) => x).trim().split("\r\n")
    expect(lines[1]).toBe("resolved_by_ai,60,50")
  })

  it("names files by kind and period", () => {
    expect(exportFileName("daily", "2026-10-01", "2026-10-07")).toBe("attende-report-daily-2026-10-01_2026-10-07.csv")
  })
})
