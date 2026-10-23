import type { SalesBotListItem, SalesBotListResponse } from "lib/automations/types"
import { computeBotsHubMetrics } from "./botsHubMetrics"

const bot = (id: string, started: number, completed: number): SalesBotListItem =>
  ({ id, name: id, status: "active", channels: [], stepCount: 3, version: 1, updatedAt: "t", stats30d: { started, completed } }) as SalesBotListItem

const list = (items: SalesBotListItem[], totals: Partial<SalesBotListResponse["totals"]> = {}): SalesBotListResponse => ({
  items,
  total: items.length,
  page: 1,
  limit: 25,
  totals: { all: items.length, active: items.length, paused: 0, draft: 0, ...totals },
})

describe("computeBotsHubMetrics", () => {
  it("is null while there is nothing loaded", () => {
    expect(computeBotsHubMetrics(null)).toBeNull()
  })

  it("sums the 30-day stats and computes the completion rate when the page is the whole list", () => {
    const m = computeBotsHubMetrics(list([bot("a", 10, 4), bot("b", 30, 21)], { paused: 1, draft: 2, all: 2 }))
    expect(m).toMatchObject({ active: 2, all: 2, paused: 1, drafts: 2, started30d: 40, completed30d: 25 })
    expect(m?.completionRate).toBeCloseTo(0.625)
  })

  it("does not invent 30-day numbers from a partial page (status totals still come from the server)", () => {
    const m = computeBotsHubMetrics(list([bot("a", 10, 4)], { all: 9, active: 5 }))
    expect(m).toMatchObject({ active: 5, all: 9, started30d: null, completed30d: null, completionRate: null })
  })

  it("has no completion rate when nothing started", () => {
    expect(computeBotsHubMetrics(list([bot("a", 0, 0)]))).toMatchObject({ started30d: 0, completionRate: null })
  })
})
