import { activityGeometry, outcomeSegments, seriesValues } from "./chartMath"
import { point } from "./fixtures"

const BOX = { width: 400, height: 200, left: 40, right: 10, top: 10, bottom: 30 }

describe("activity geometry", () => {
  it("uses one clean max for all three lines", () => {
    const geo = activityGeometry([point(1, { conversations: 7, aiReplies: 41, humanReplies: 3 }), point(2, { aiReplies: 12 })], BOX)
    expect(geo.max).toBe(50)
    expect(geo.ticks[0]).toBe(0)
    expect(geo.ticks[geo.ticks.length - 1]).toBe(50)
  })

  it("maps zero to the baseline and the max to the top", () => {
    const geo = activityGeometry([point(1, { aiReplies: 10 }), point(2, { aiReplies: 10 })], BOX)
    expect(geo.y(0)).toBe(BOX.height - BOX.bottom)
    expect(geo.y(geo.max)).toBe(BOX.top)
    expect(geo.x(0)).toBe(BOX.left)
    expect(geo.x(1)).toBe(BOX.width - BOX.right)
  })

  it("does not divide by zero on an all-zero or single-point series", () => {
    const flat = activityGeometry([point(1)], BOX)
    expect(Number.isFinite(flat.y(0))).toBe(true)
    expect(Number.isFinite(flat.x(0))).toBe(true)
  })

  it("reads one series", () => {
    expect(seriesValues([point(1, { aiReplies: 2 }), point(2, { aiReplies: 5 })], "aiReplies")).toEqual([2, 5])
  })
})

describe("outcome segments", () => {
  it("drops empty outcomes and always adds up to 1", () => {
    const segments = outcomeSegments([
      { outcome: "a", count: 3 },
      { outcome: "b", count: 0 },
      { outcome: "c", count: 1 },
    ])
    expect(segments.map((s) => s.outcome)).toEqual(["a", "c"])
    expect(segments.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1)
    expect(segments[1]?.start).toBeCloseTo(0.75)
  })

  it("is empty when nothing happened", () => {
    expect(outcomeSegments([{ outcome: "a", count: 0 }])).toEqual([])
    expect(outcomeSegments([])).toEqual([])
  })
})
