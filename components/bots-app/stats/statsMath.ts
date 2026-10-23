import { nodeOutputs } from "lib/automations/botGraph"
import type { SalesBotDetail, SalesBotNode, SalesBotStatsSummary } from "lib/automations/types"

/** One UTC day of run counters, as `GET /sales-bots/:id/stats/series` returns it (zero-filled). */
export type DailyStatsPoint = {
  day: string
  started: number
  completed: number
  handedOff: number
  stopped: number
  failed: number
}

export const STATS_RANGES = [7, 30, 90] as const
export type StatsRange = (typeof STATS_RANGES)[number]
export const DEFAULT_STATS_RANGE: StatsRange = 30

/** `?days=` from the URL, snapped to a supported range. */
export function parseStatsRange(value: unknown): StatsRange {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return (STATS_RANGES as readonly number[]).includes(n) ? (n as StatsRange) : DEFAULT_STATS_RANGE
}

export type StatsKpis = {
  started: number
  completed: number
  handedOff: number
  stopped: number
  failed: number
  /** completed / started, 0-1. */
  completionRate: number
  /** (completed + handed off) / started: leads that reached an end the bot is happy with. */
  successRate: number
  /** Started runs with no recorded end yet (waiting, or ended before the window). Never negative. */
  inProgress: number
}

export function computeKpis(summary: SalesBotStatsSummary): StatsKpis {
  const { started, completed, handedOff, stopped, failed } = summary
  const ended = completed + handedOff + stopped + failed
  return {
    started,
    completed,
    handedOff,
    stopped,
    failed,
    completionRate: started > 0 ? completed / started : 0,
    successRate: started > 0 ? (completed + handedOff) / started : 0,
    inProgress: Math.max(0, started - ended),
  }
}

export type FunnelExit = {
  id: string
  count: number
  /** share of the runs that reached the step, 0-1 */ share: number
}

export type FunnelStep = {
  id: string
  /** 1-based position in the flow (first reached, left to right). */
  order: number
  node: SalesBotNode
  reached: number
  /** reached / started, 0-1 (what the API calls reachedPct). */
  reachedShare: number
  exits: FunnelExit[]
  /** A step with no outputs (stop, handoff, go to bot): nothing can be lost there. */
  terminal: boolean
  /** Reached the step but never took an exit: still waiting, or the run ended there. */
  dropOff: number
  /** dropOff / reached, 0-1. */
  dropOffRate: number
}

/** Steps in flow order: breadth-first from the start, following exits in their on-canvas order. */
export function flowOrder(bot: Pick<SalesBotDetail, "startNodeId" | "nodes" | "edges">): SalesBotNode[] {
  const byId = new Map(bot.nodes.map((n) => [n.id, n]))
  const seen = new Set<string>()
  const out: SalesBotNode[] = []
  const queue = [bot.startNodeId]
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id)) continue
    const node = byId.get(id)
    if (!node) continue
    seen.add(id)
    out.push(node)
    for (const output of nodeOutputs(node)) {
      for (const edge of bot.edges) if (edge.from === id && edge.output === output) queue.push(edge.to)
    }
  }
  // Steps the start cannot reach (edited away) keep their numbers if they ever recorded traffic.
  for (const node of bot.nodes) if (!seen.has(node.id)) out.push(node)
  return out
}

/** Per-step funnel from the saved graph plus the summed counters. Steps with no traffic are kept (they show 0). */
export function buildFunnel(
  bot: Pick<SalesBotDetail, "startNodeId" | "nodes" | "edges">,
  stats: SalesBotStatsSummary
): FunnelStep[] {
  const steps: FunnelStep[] = []
  let order = 0
  for (const node of flowOrder(bot)) {
    const recorded = stats.nodes[node.id]
    const reached = recorded?.reached ?? 0
    const reachable = nodeOutputs(node)
    const exits: FunnelExit[] = reachable
      .map((id) => ({ id, count: recorded?.exits?.[id] ?? 0 }))
      .filter((e) => e.count > 0)
      .map((e) => ({ ...e, share: reached > 0 ? e.count / reached : 0 }))
    const terminal = reachable.length === 0
    const taken = exits.reduce((sum, e) => sum + e.count, 0)
    const dropOff = terminal ? 0 : Math.max(0, reached - taken)
    order += 1
    steps.push({
      id: node.id,
      order,
      node,
      reached,
      reachedShare: stats.started > 0 ? Math.min(1, reached / stats.started) : 0,
      exits,
      terminal,
      dropOff,
      dropOffRate: reached > 0 ? dropOff / reached : 0,
    })
  }
  return steps
}

/** The steps where most leads stop, worst first. Needs enough traffic to mean something. */
export function rankDropOffs(steps: FunnelStep[], limit = 3, minReached = 5): FunnelStep[] {
  return steps
    .filter((s) => !s.terminal && s.reached >= minReached && s.dropOff > 0)
    .sort((a, b) => b.dropOff - a.dropOff || b.dropOffRate - a.dropOffRate || a.order - b.order)
    .slice(0, limit)
}

// --- trend chart geometry (pure so the SVG component stays dumb) -------------------------------

/** Rounds a max up to a 1/2/5 x 10^n step so the y axis ends on a clean number. */
export function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

export type ChartBox = { width: number; height: number; left: number; right: number; top: number; bottom: number }

export type TrendGeometry = {
  max: number
  ticks: number[]
  x: (index: number) => number
  y: (value: number) => number
}

export function trendGeometry(series: DailyStatsPoint[], box: ChartBox): TrendGeometry {
  const peak = series.reduce((m, p) => Math.max(m, p.started, p.completed), 0)
  const max = niceMax(peak)
  const innerW = box.width - box.left - box.right
  const innerH = box.height - box.top - box.bottom
  const last = Math.max(1, series.length - 1)
  const ticks = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => Math.round(max * f * 100) / 100)
    .filter((v, i, all) => all.indexOf(v) === i)
  return {
    max,
    ticks,
    x: (index) => box.left + (innerW * index) / last,
    y: (value) => box.top + innerH - (innerH * value) / max,
  }
}

export function linePath(values: number[], geo: Pick<TrendGeometry, "x" | "y">): string {
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${geo.x(i).toFixed(1)},${geo.y(v).toFixed(1)}`).join(" ")
}

export function areaPath(values: number[], geo: Pick<TrendGeometry, "x" | "y">, baseline: number): string {
  if (values.length === 0) return ""
  const line = linePath(values, geo)
  return `${line} L${geo.x(values.length - 1).toFixed(1)},${baseline} L${geo.x(0).toFixed(1)},${baseline} Z`
}

/** Index of the point nearest to an x position (for the hover crosshair). */
export function nearestIndex(x: number, count: number, geo: Pick<TrendGeometry, "x">): number {
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i < count; i += 1) {
    const d = Math.abs(geo.x(i) - x)
    if (d < bestDistance) {
      best = i
      bestDistance = d
    }
  }
  return best
}

/** Evenly spread x-axis label indexes (always includes first and last, never crowds). */
export function axisLabelIndexes(count: number, maxLabels = 6): number[] {
  if (count <= 0) return []
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i)
  const out = new Set<number>([0, count - 1])
  const slots = maxLabels - 1
  for (let i = 1; i < slots; i += 1) out.add(Math.round((i * (count - 1)) / slots))
  return [...out].sort((a, b) => a - b)
}

export function seriesTotals(
  series: DailyStatsPoint[]
): Pick<DailyStatsPoint, "started" | "completed" | "handedOff" | "stopped" | "failed"> {
  return series.reduce(
    (acc, p) => ({
      started: acc.started + p.started,
      completed: acc.completed + p.completed,
      handedOff: acc.handedOff + p.handedOff,
      stopped: acc.stopped + p.stopped,
      failed: acc.failed + p.failed,
    }),
    { started: 0, completed: 0, handedOff: 0, stopped: 0, failed: 0 }
  )
}
