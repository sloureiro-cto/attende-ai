import type { AdvancedAutomationNode, AdvancedAutomationStatsSummary } from "lib/automations/types"
import {
  areaPath,
  axisLabelIndexes,
  buildFunnel,
  computeKpis,
  flowOrder,
  linePath,
  nearestIndex,
  niceMax,
  parseStatsRange,
  rankDropOffs,
  seriesTotals,
  trendGeometry,
} from "./statsMath"

const msg = (id: string, over: Record<string, unknown> = {}): AdvancedAutomationNode =>
  ({
    id,
    kind: "send_message",
    text: id,
    replyMode: "buttons",
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    x: 0,
    y: 0,
    ...over,
  }) as AdvancedAutomationNode
const stop = (id: string): AdvancedAutomationNode => ({ id, kind: "stop", x: 0, y: 0 }) as AdvancedAutomationNode
const edge = (from: string, output: string, to: string) => ({ id: `${from}_${output}_${to}`, from, output, to })

const bot = {
  startNodeId: "ask",
  nodes: [msg("ask"), msg("next", { replyMode: "none", options: undefined }), stop("end"), msg("orphan")],
  edges: [edge("ask", "a", "next"), edge("ask", "b", "end"), edge("next", "next", "end")],
}

const stats = (over: Partial<AdvancedAutomationStatsSummary> = {}): AdvancedAutomationStatsSummary => ({
  started: 100,
  completed: 40,
  handedOff: 10,
  stopped: 5,
  failed: 5,
  completionRate: 0.4,
  nodes: {
    ask: { reached: 100, exits: { a: 50, b: 20 }, reachedPct: 1 },
    next: { reached: 50, exits: { next: 50 }, reachedPct: 0.5 },
    end: { reached: 70, exits: {}, reachedPct: 0.7 },
  },
  ...over,
})

describe("parseStatsRange", () => {
  it("snaps to a supported range", () => {
    expect(parseStatsRange("7")).toBe(7)
    expect(parseStatsRange(["90"])).toBe(90)
    expect(parseStatsRange("15")).toBe(30)
    expect(parseStatsRange(undefined)).toBe(30)
    expect(parseStatsRange("abc")).toBe(30)
  })
})

describe("computeKpis", () => {
  it("derives rates and the unfinished runs", () => {
    const k = computeKpis(stats())
    expect(k.completionRate).toBe(0.4)
    expect(k.successRate).toBeCloseTo(0.5)
    expect(k.inProgress).toBe(40)
  })
  it("never goes negative or divides by zero", () => {
    const k = computeKpis(stats({ started: 0, completed: 3 }))
    expect(k.completionRate).toBe(0)
    expect(k.successRate).toBe(0)
    expect(k.inProgress).toBe(0)
  })
})

describe("flowOrder", () => {
  it("walks from the start in exit order and appends unreachable steps last", () => {
    expect(flowOrder(bot).map((n) => n.id)).toEqual(["ask", "next", "end", "orphan"])
  })
  it("survives cycles", () => {
    const cyc = { startNodeId: "a", nodes: [msg("a"), msg("b")], edges: [edge("a", "a", "b"), edge("b", "a", "a")] }
    expect(flowOrder(cyc).map((n) => n.id)).toEqual(["a", "b"])
  })
})

describe("buildFunnel", () => {
  const steps = buildFunnel(bot, stats())
  it("numbers steps in flow order with their reach", () => {
    expect(steps.map((s) => [s.id, s.order, s.reached])).toEqual([
      ["ask", 1, 100],
      ["next", 2, 50],
      ["end", 3, 70],
      ["orphan", 4, 0],
    ])
    expect(steps[0]?.reachedShare).toBe(1)
  })
  it("computes exits and the drop-off of a branching step", () => {
    const ask = steps[0]
    expect(ask?.exits.map((e) => [e.id, e.count, e.share])).toEqual([
      ["a", 50, 0.5],
      ["b", 20, 0.2],
    ])
    expect(ask?.dropOff).toBe(30)
    expect(ask?.dropOffRate).toBeCloseTo(0.3)
  })
  it("never reports a drop-off for terminal steps or when everyone moved on", () => {
    expect(steps[1]?.dropOff).toBe(0)
    expect(steps[2]?.terminal).toBe(true)
    expect(steps[2]?.dropOff).toBe(0)
  })
  it("handles a step that never recorded traffic", () => {
    expect(steps[3]).toMatchObject({ reached: 0, dropOff: 0, dropOffRate: 0 })
  })
})

describe("rankDropOffs", () => {
  it("lists the worst steps first and ignores thin traffic and terminals", () => {
    const steps = buildFunnel(bot, stats())
    expect(rankDropOffs(steps).map((s) => s.id)).toEqual(["ask"])
    expect(
      rankDropOffs(buildFunnel(bot, stats({ nodes: { ask: { reached: 3, exits: {}, reachedPct: 0.03 } } })))
    ).toEqual([])
  })
})

describe("trend geometry", () => {
  const points = [0, 1, 2, 3].map((i) => ({
    day: `2026-10-0${i + 1}`,
    started: i * 3,
    completed: i,
    handedOff: 0,
    stopped: 0,
    failed: 0,
  }))
  const box = { width: 400, height: 200, left: 40, right: 10, top: 10, bottom: 30 }
  const geo = trendGeometry(points, box)

  it("niceMax rounds up to 1/2/5 steps", () => {
    expect([0, 1, 3, 7, 42, 130].map(niceMax)).toEqual([1, 1, 5, 10, 50, 200])
  })
  it("maps the axis ends onto the plot area", () => {
    expect(geo.max).toBe(10)
    expect(geo.x(0)).toBe(40)
    expect(geo.x(3)).toBe(390)
    expect(geo.y(0)).toBe(170)
    expect(geo.y(10)).toBe(10)
  })
  it("builds closed area and open line paths", () => {
    const values = points.map((p) => p.started)
    expect(linePath(values, geo).startsWith("M40.0,170.0 L")).toBe(true)
    expect(areaPath(values, geo, 170).endsWith("Z")).toBe(true)
    expect(areaPath([], geo, 170)).toBe("")
  })
  it("finds the nearest point for the crosshair", () => {
    expect(nearestIndex(41, 4, geo)).toBe(0)
    expect(nearestIndex(250, 4, geo)).toBe(2)
    expect(nearestIndex(9999, 4, geo)).toBe(3)
  })
  it("keeps axis labels sparse and ordered", () => {
    expect(axisLabelIndexes(3)).toEqual([0, 1, 2])
    const idx = axisLabelIndexes(90)
    expect(idx[0]).toBe(0)
    expect(idx[idx.length - 1]).toBe(89)
    expect(idx.length).toBeLessThanOrEqual(6)
  })
  it("sums a series", () => {
    expect(seriesTotals(points)).toMatchObject({ started: 18, completed: 6 })
  })
})
