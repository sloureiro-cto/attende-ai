import { areaPath, axisLabelIndexes, type ChartBox, linePath, nearestIndex, niceMax } from "components/bots-app/stats/statsMath"
import type { SeriesPoint } from "./types"

export { areaPath, axisLabelIndexes, linePath, nearestIndex }
export type { ChartBox }

export const ACTIVITY_SERIES = ["conversations", "aiReplies", "humanReplies"] as const
export type ActivitySeriesKey = (typeof ACTIVITY_SERIES)[number]

export type ActivityGeometry = {
  max: number
  ticks: number[]
  x: (index: number) => number
  y: (value: number) => number
}

/** Shared y scale for the three lines (they are all counts per day), ending on a clean number. */
export function activityGeometry(series: SeriesPoint[], box: ChartBox): ActivityGeometry {
  const peak = series.reduce((m, p) => Math.max(m, p.conversations, p.aiReplies, p.humanReplies), 0)
  const max = niceMax(peak)
  const innerW = box.width - box.left - box.right
  const innerH = box.height - box.top - box.bottom
  const last = Math.max(1, series.length - 1)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f * 100) / 100).filter((v, i, all) => all.indexOf(v) === i)
  return {
    max,
    ticks,
    x: (index) => box.left + (innerW * index) / last,
    y: (value) => box.top + innerH - (innerH * value) / max,
  }
}

export const seriesValues = (series: SeriesPoint[], key: ActivitySeriesKey): number[] => series.map((p) => p[key])

export type OutcomeSegment = { outcome: string; count: number; share: number; start: number }

/** Stacked-bar segments (0-1 of the total). Zero-count outcomes are dropped; shares are recomputed from the counts so they always add up. */
export function outcomeSegments(items: Array<{ outcome: string; count: number }>): OutcomeSegment[] {
  const total = items.reduce((sum, i) => sum + Math.max(0, i.count), 0)
  if (total === 0) return []
  let start = 0
  const out: OutcomeSegment[] = []
  for (const item of items) {
    if (item.count <= 0) continue
    const share = item.count / total
    out.push({ outcome: item.outcome, count: item.count, share, start })
    start += share
  }
  return out
}
