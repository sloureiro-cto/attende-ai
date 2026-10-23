import { formatDate, formatNumber, formatPercent as formatPercentIntl, localeOf } from "lib/attende/format"
import type { AgentBreakdownRow, KpiKey, KpiValue, OverviewResponse, ReportChannel, ReportFilters, SeriesPoint } from "./types"
import { REPORT_CHANNELS } from "./types"

export const REPORT_PRESETS = [7, 30, 90] as const
export type ReportPreset = (typeof REPORT_PRESETS)[number] | "custom"
export const DEFAULT_PRESET = 30
/** The backend refuses wider windows. */
export const MAX_RANGE_DAYS = 366

const DAY_MS = 86_400_000
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export const toDay = (d: Date): string => d.toISOString().slice(0, 10)
const dayToMs = (day: string): number => Date.parse(`${day}T00:00:00.000Z`)
/** A real calendar day: `2026-02-30` rolls over to March in `Date`, so the round trip must match. */
export const isDay = (value: unknown): value is string => typeof value === "string" && DAY_RE.test(value) && !Number.isNaN(dayToMs(value)) && toDay(new Date(dayToMs(value))) === value
/** Inclusive number of days between two `YYYY-MM-DD` days. */
export const daysBetween = (from: string, to: string): number => Math.round((dayToMs(to) - dayToMs(from)) / DAY_MS) + 1
export const addDays = (day: string, n: number): string => toDay(new Date(dayToMs(day) + n * DAY_MS))

/** Last `days` days ending today (UTC), inclusive: the same window the backend uses for its default. */
export function presetRange(days: number, now: Date = new Date()): { from: string; to: string } {
  const to = toDay(now)
  return { from: addDays(to, -(days - 1)), to }
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams

const readParam = (params: Params, key: string): string | null => {
  const raw = params instanceof URLSearchParams ? params.get(key) : params[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

/** An agent id, or the backend's literal `none`. Anything else is dropped (ids are never trusted from the URL). */
const AGENT_ID_RE = /^([a-f0-9]{24}|none)$/i

export type ParsedReportFilters = { filters: ReportFilters; preset: ReportPreset }

/**
 * URL -> filters. Invalid or out-of-range values fall back to the default window instead of failing:
 * `?days=7|30|90` or a custom `?from=&to=` (max 366 days, not in the future).
 */
export function parseReportFilters(params: Params, now: Date = new Date()): ParsedReportFilters {
  const channelRaw = readParam(params, "channel")
  const channel = (REPORT_CHANNELS as readonly string[]).includes(channelRaw ?? "") ? (channelRaw as ReportChannel) : null
  const agentRaw = readParam(params, "agent")
  const agentId = agentRaw && AGENT_ID_RE.test(agentRaw) ? agentRaw.toLowerCase() : null

  const from = readParam(params, "from")
  const to = readParam(params, "to")
  const today = toDay(now)
  if (isDay(from) && isDay(to) && from <= to && to <= today && daysBetween(from, to) <= MAX_RANGE_DAYS) {
    const span = daysBetween(from, to)
    const matchesPreset = (REPORT_PRESETS as readonly number[]).includes(span) && to === today
    return { filters: { from, to, channel, agentId }, preset: matchesPreset ? (span as ReportPreset) : "custom" }
  }

  const daysRaw = Number(readParam(params, "days"))
  const days = (REPORT_PRESETS as readonly number[]).includes(daysRaw) ? daysRaw : DEFAULT_PRESET
  return { filters: { ...presetRange(days, now), channel, agentId }, preset: days as ReportPreset }
}

/** Filters -> the query string the page keeps in the URL (presets stay short: `?days=7`). */
export function filtersToSearchParams(filters: ReportFilters, preset: ReportPreset): URLSearchParams {
  const p = new URLSearchParams()
  if (preset === "custom") {
    p.set("from", filters.from)
    p.set("to", filters.to)
  } else if (preset !== DEFAULT_PRESET) {
    p.set("days", String(preset))
  }
  if (filters.channel) p.set("channel", filters.channel)
  if (filters.agentId) p.set("agent", filters.agentId)
  return p
}

/** Filters -> the backend query (`agentId`, not `agent`). */
export function filtersToApiQuery(filters: ReportFilters): Record<string, string> {
  const q: Record<string, string> = { from: filters.from, to: filters.to }
  if (filters.channel) q.channel = filters.channel
  if (filters.agentId) q.agentId = filters.agentId
  return q
}

// --- KPI presentation --------------------------------------------------------------------------

export type KpiFormat = "count" | "percent" | "duration" | "ratio"
/** Which direction is good news; `neutral` metrics only show the change, never green or red. */
export type BetterWhen = "up" | "down" | "neutral"

export type KpiTileSpec = {
  key: KpiKey
  format: KpiFormat
  betterWhen: BetterWhen
  /** The number is a proxy or an estimate: the tile shows an info badge with the exact definition. */
  estimate: boolean
}

/** The six headline KPIs of the dashboard, in reading order. */
export const HEADLINE_KPIS: readonly KpiTileSpec[] = [
  { key: "conversations", format: "count", betterWhen: "neutral", estimate: false },
  { key: "aiReplies", format: "count", betterWhen: "neutral", estimate: false },
  // A proxy (an upper bound): its change is shown, but never coloured as good or bad news.
  { key: "aiResolutionRate", format: "percent", betterWhen: "neutral", estimate: true },
  { key: "handoffRate", format: "percent", betterWhen: "down", estimate: false },
  { key: "firstResponseAiMedianMs", format: "duration", betterWhen: "down", estimate: true },
  // Leads are linked by a time window and can come from Automations, rules or people: not credited to the AI.
  { key: "leadsCreated", format: "count", betterWhen: "neutral", estimate: true },
]

/** Secondary metrics shown below the headline tiles. */
export const SECONDARY_KPIS: readonly KpiTileSpec[] = [
  { key: "firstResponseHumanMedianMs", format: "duration", betterWhen: "down", estimate: true },
  { key: "humanReplies", format: "count", betterWhen: "neutral", estimate: false },
  { key: "automationReplies", format: "count", betterWhen: "neutral", estimate: false },
  { key: "messagesPerActiveConversationDay", format: "ratio", betterWhen: "neutral", estimate: false },
  { key: "afterHoursShare", format: "percent", betterWhen: "neutral", estimate: false },
]

/** KPI keys that depend on a metric the backend reports as `notAvailable`. */
export const KPI_NOT_AVAILABLE_KEY: Partial<Record<KpiKey, string>> = {
  afterHoursShare: "after_hours_share",
}

export type DeltaTone = "good" | "bad" | "flat" | "neutral"
export type KpiDelta = {
  direction: "up" | "down" | "flat"
  tone: DeltaTone
  /** Whole percent, absolute (`12`). null when there is no baseline (previous is 0 or unknown). */
  pct: number | null
  /** Percentage-point change for rate KPIs (absolute), null for others. */
  points: number | null
}

/**
 * Compares a KPI with the previous period. Rates are compared in percentage points (the honest way to
 * compare two shares); counts and times in percent. Returns null when there is nothing to compare.
 */
export function describeDelta(kpi: KpiValue, format: KpiFormat, betterWhen: BetterWhen): KpiDelta | null {
  if (kpi.value === null || kpi.previous === null || kpi.delta === null) return null
  const direction: KpiDelta["direction"] = kpi.delta === 0 ? "flat" : kpi.delta > 0 ? "up" : "down"
  let tone: DeltaTone = "neutral"
  if (direction === "flat") tone = "flat"
  else if (betterWhen !== "neutral") tone = direction === betterWhen ? "good" : "bad"
  if (format === "percent") {
    return { direction, tone, pct: null, points: Math.round(Math.abs(kpi.delta) * 1000) / 10 }
  }
  return { direction, tone, pct: kpi.deltaPct === null ? null : Math.round(Math.abs(kpi.deltaPct) * 100), points: null }
}

// --- formatting (Intl through lib/attende/format.ts; `language` is the app language: english | portuguese | spanish) ---

/** `0.426` -> `42.6%` / `42,6 %`. null when there is nothing to show: the caller writes "No data", never 0. */
export function formatShare(share: number | null, language: string): string | null {
  if (share === null || !Number.isFinite(share)) return null
  return formatPercentIntl(share, language, 1)
}

export const formatCount = (n: number | null, language: string): string | null => (n === null || !Number.isFinite(n) ? null : formatNumber(Math.round(n), language))
export const formatRatio = (n: number | null, language: string): string | null =>
  n === null || !Number.isFinite(n) ? null : formatNumber(n, language, { maximumFractionDigits: 1 })

const unit = (value: number, u: "second" | "minute" | "hour" | "day", language: string): string => formatNumber(value, language, { style: "unit", unit: u, unitDisplay: "short" })

/** `45_000` -> `45 s`, `190_000` -> `3 min`, `4_800_000` -> `1 h 20 min`, in the locale's units. Estimates are rounded on purpose. */
export function formatDuration(ms: number | null, language: string): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return unit(seconds, "second", language)
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return unit(minutes, "minute", language)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours >= 24) return unit(Math.round((hours + rest / 60) / 24), "day", language)
  return rest === 0 ? unit(hours, "hour", language) : `${unit(hours, "hour", language)} ${unit(rest, "minute", language)}`
}

export function formatKpi(value: number | null, format: KpiFormat, language: string): string | null {
  switch (format) {
    case "percent":
      return formatShare(value, language)
    case "duration":
      return formatDuration(value, language)
    case "ratio":
      return formatRatio(value, language)
    default:
      return formatCount(value, language)
  }
}

const UTC_DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" }
const dayDate = (day: string): Date => new Date(dayToMs(day))

/** A report day (`YYYY-MM-DD`, UTC) as the locale writes it. Always in UTC, so a browser west of Greenwich never shows the day before. */
export function formatReportDay(day: string, language: string, long = false): string {
  return formatDate(dayDate(day), language, long ? { ...UTC_DAY, year: "numeric", weekday: "short" } : UTC_DAY)
}

/**
 * An inclusive UTC day range: "1 – 30 de out." / "Oct 1 – 30"; the year is added when the range is not in the
 * current year or crosses one ("23 de dez. de 2025 – 22 de jan. de 2026").
 */
export function formatDayRange(from: string, to: string, language: string, opts: { withYear?: boolean; now?: Date } = {}): string {
  const thisYear = (opts.now ?? new Date()).getUTCFullYear()
  const needsYear = opts.withYear || from.slice(0, 4) !== to.slice(0, 4) || Number(to.slice(0, 4)) !== thisYear
  const options: Intl.DateTimeFormatOptions = needsYear ? { ...UTC_DAY, year: "numeric" } : UTC_DAY
  if (from === to) return formatDate(dayDate(from), language, options)
  const fmt = new Intl.DateTimeFormat(localeOf(language), options)
  return typeof fmt.formatRange === "function" ? fmt.formatRange(dayDate(from), dayDate(to)) : `${fmt.format(dayDate(from))} – ${fmt.format(dayDate(to))}`
}

// --- what a number is measured on ------------------------------------------------------------

/**
 * True when the previous window has any recorded activity. The API returns 0 (not null) for a window with no
 * aggregated rows (before reports were turned on, or before the backfill), so a previous period with no activity
 * at all is treated as "no data" and no change is shown against it.
 */
export function previousHasData(o: OverviewResponse): boolean {
  const k = o.kpis
  return [k.conversations, k.aiReplies, k.humanReplies, k.automationReplies].some((v) => (v.previous ?? 0) > 0)
}

export type RateBasis = { count: number; total: number }
export type ReportBases = {
  /** handed_off / conversations started (the backend's `handoffRate`). */
  handoff: RateBasis | null
  /** resolved_by_ai / (conversations started - open) (the backend's `aiResolutionRate`), plus the open ones left out. */
  resolution: (RateBasis & { open: number }) | null
  /** conversations with a linked lead / conversations started. */
  leads: RateBasis | null
}

/**
 * Numerator and denominator of the headline rates, from the outcome counts of the same filters (every started
 * conversation has exactly one outcome, so `outcomes.total` is the conversation count). null when the base is 0.
 */
export function reportBases(o: OverviewResponse): ReportBases {
  const count = (outcome: string) => o.outcomes.items.find((i) => i.outcome === outcome)?.count ?? 0
  const total = o.outcomes.total
  const open = count("open")
  const settled = total - open
  return {
    handoff: total > 0 ? { count: count("handed_off"), total } : null,
    resolution: settled > 0 ? { count: count("resolved_by_ai"), total: settled, open } : null,
    leads: total > 0 && o.kpis.leadsCreated.value !== null ? { count: o.kpis.leadsCreated.value, total } : null,
  }
}

// --- empty / insights --------------------------------------------------------------------------

const sum = (series: SeriesPoint[], pick: (p: SeriesPoint) => number): number => series.reduce((acc, p) => acc + pick(p), 0)

/** A brand-new account: nothing happened in the window (the friendly 'first report' state). */
export function isEmptyOverview(o: OverviewResponse): boolean {
  const conversations = o.kpis.conversations.value ?? 0
  const traffic = sum(o.series, (p) => p.inboundMessages + p.aiReplies + p.humanReplies)
  return conversations === 0 && traffic === 0 && o.byAgent.length === 0
}

export type InsightKey = "busiestDay" | "topHandoffReason" | "resolutionUp" | "resolutionDown" | "handoffUp" | "handoffDown" | "bestAgent" | "slowAiResponse"
/** Raw values only: the view formats them for the language (days, durations, percents, plurals). */
export type Insight =
  | { key: "resolutionUp" | "resolutionDown" | "handoffUp" | "handoffDown"; params: { points: number } }
  | { key: "slowAiResponse"; params: { ms: number } }
  | { key: "topHandoffReason"; params: { reason: string; count: number } }
  | { key: "busiestDay"; params: { day: string; count: number } }
  | { key: "bestAgent"; params: { name: string; share: number } }

/**
 * Pure client-side reading of the numbers, most actionable first (changes, then speed, then the rest).
 * Needs enough volume to say anything (no insight from 3 chats), and compares with the previous period only when
 * that period has data. At most four are shown.
 */
export function deriveInsights(o: OverviewResponse): Insight[] {
  const out: Insight[] = []
  const conversations = o.kpis.conversations.value ?? 0
  if (conversations < 10) return out

  if (previousHasData(o)) {
    const res = o.kpis.aiResolutionRate
    if (res.value !== null && res.previous !== null && Math.abs(res.value - res.previous) >= 0.05) {
      out.push({ key: res.value > res.previous ? "resolutionUp" : "resolutionDown", params: { points: Math.round(Math.abs(res.value - res.previous) * 100) } })
    }
    const handoff = o.kpis.handoffRate
    if (handoff.value !== null && handoff.previous !== null && Math.abs(handoff.value - handoff.previous) >= 0.05) {
      out.push({ key: handoff.value > handoff.previous ? "handoffUp" : "handoffDown", params: { points: Math.round(Math.abs(handoff.value - handoff.previous) * 100) } })
    }
  }

  const median = o.kpis.firstResponseAiMedianMs.value
  if (median !== null && median > 10 * 60_000) out.push({ key: "slowAiResponse", params: { ms: median } })

  const top = o.topHandoffReasons[0]
  if (top && top.count >= 3) out.push({ key: "topHandoffReason", params: { reason: top.reason, count: top.count } })

  const busiest = o.series.reduce<SeriesPoint | null>((best, p) => (best === null || p.conversations > best.conversations ? p : best), null)
  if (busiest && busiest.conversations >= 5) out.push({ key: "busiestDay", params: { day: busiest.day, count: busiest.conversations } })

  const agents = o.byAgent.filter((a) => a.agentId !== null && a.name && a.conversations >= 10 && a.aiResolutionRate !== null)
  const best = agents.reduce<AgentBreakdownRow | null>((b, a) => (b === null || (a.aiResolutionRate ?? 0) > (b.aiResolutionRate ?? 0) ? a : b), null)
  if (best && agents.length >= 2) out.push({ key: "bestAgent", params: { name: best.name ?? "", share: best.aiResolutionRate ?? 0 } })
  return out.slice(0, 4)
}

// --- CSV ---------------------------------------------------------------------------------------

/** A cell that a spreadsheet could read as a formula gets a leading quote (agent names and reasons are free text). */
export function csvCell(value: string | number | null | undefined): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  let text = value ?? ""
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const toCsv = (rows: Array<Array<string | number | null | undefined>>): string => `${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`
