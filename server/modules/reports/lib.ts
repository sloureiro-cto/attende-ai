import 'server-only';
/**
 * Report math ported from the JSYNQ reference (`attende-reports`: classifyConversation, latency, handoffReasons,
 * dayRange, buildOverview). Pure functions: the sync job and the query service share them.
 */
import type {
  AgentBreakdownRow,
  ChannelBreakdownRow,
  ConversationOutcome,
  HandoffReasonCount,
  KpiValue,
  OutcomesDistribution,
  OverviewKpis,
  OverviewResponse,
  ReportChannel,
  ReportStatus,
  SeriesPoint,
} from '../../../lib/attende/reports/types';
import { AppError } from '../../lib/errors';

export const REPORT_CHANNELS: readonly ReportChannel[] = ['whatsapp', 'instagram', 'sms'];
export const CONVERSATION_OUTCOMES: readonly ConversationOutcome[] = ['resolved_by_ai', 'handed_off', 'human_handled', 'abandoned', 'open'];
export const REPORT_MAX_DAYS = 366;
export const REPORT_DEFAULT_DAYS = 30;
/** A conversation counts as "settled" once nothing happened for this long. */
export const CONVERSATION_QUIET_HOURS = 24;
export const DAY_MS = 86_400_000;

/** First-response latency histogram: upper bounds in ms; the last bucket is open-ended. */
export const FIRST_RESPONSE_BUCKET_EDGES_MS = [30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000, 7_200_000, 21_600_000, 43_200_000, 86_400_000] as const;
export const FIRST_RESPONSE_BUCKET_COUNT = FIRST_RESPONSE_BUCKET_EDGES_MS.length + 1;

export type LatencyAccumulator = { sumMs: number; count: number; buckets: number[] };

/** One `report_daily_stats` row (workspace, UTC day, channel, agent). */
export type DailyStatsRow = {
  day: string;
  channel: ReportChannel;
  agentId: string | null;
  inboundMessages: number;
  aiReplies: number;
  automationReplies: number;
  humanReplies: number;
  aiFailed: number;
  conversationsActive: number;
  conversationsStarted: number;
  handoffEvents: number;
  outcomeResolvedByAi: number;
  outcomeHandedOff: number;
  outcomeHumanHandled: number;
  outcomeAbandoned: number;
  outcomeOpen: number;
  leadsCreated: number;
  frAi: LatencyAccumulator;
  frHuman: LatencyAccumulator;
  handoffReasons: HandoffReasonCount[];
};

// --- outcome ----------------------------------------------------------------------------------------

export type ConversationFacts = {
  handedOff: boolean;
  aiReplyCount: number;
  humanReplyCount: number;
  lastMessageAt: Date | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  createdAt: Date;
};

/**
 * Outcome of a conversation as of `now`. Resolution is not recorded anywhere, so "resolved by AI" is a PROXY: the AI
 * answered, no person stepped in, the AI said the last word and the contact stayed quiet for CONVERSATION_QUIET_HOURS.
 * Handoff beats everything; recent activity is `open`; any human reply means a person handled it.
 */
export function classifyConversation(facts: ConversationFacts, now: Date, quietHours = CONVERSATION_QUIET_HOURS): ConversationOutcome {
  if (facts.handedOff) return 'handed_off';
  const last = facts.lastMessageAt ?? facts.createdAt;
  if (now.getTime() - last.getTime() < quietHours * 3_600_000) return 'open';
  if (facts.humanReplyCount > 0) return 'human_handled';
  if (facts.aiReplyCount > 0 && facts.lastMessageDirection === 'outbound') return 'resolved_by_ai';
  return 'abandoned';
}

// --- latency ----------------------------------------------------------------------------------------

export const emptyLatency = (): LatencyAccumulator => ({ sumMs: 0, count: 0, buckets: new Array<number>(FIRST_RESPONSE_BUCKET_COUNT).fill(0) });

export function bucketIndex(ms: number): number {
  const i = FIRST_RESPONSE_BUCKET_EDGES_MS.findIndex((edge) => ms < edge);
  return i === -1 ? FIRST_RESPONSE_BUCKET_EDGES_MS.length : i;
}

/** Adds one sample (negative values are clock skew: ignored). */
export function addLatencySample(acc: LatencyAccumulator, ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  acc.sumMs += ms;
  acc.count += 1;
  acc.buckets[bucketIndex(ms)] = (acc.buckets[bucketIndex(ms)] ?? 0) + 1;
}

export function mergeLatency(into: LatencyAccumulator, from?: Partial<LatencyAccumulator> | null): void {
  if (!from) return;
  into.sumMs += from.sumMs ?? 0;
  into.count += from.count ?? 0;
  for (let i = 0; i < FIRST_RESPONSE_BUCKET_COUNT; i += 1) into.buckets[i] = (into.buckets[i] ?? 0) + (from.buckets?.[i] ?? 0);
}

export const latencyAvgMs = (acc: LatencyAccumulator): number | null => (acc.count > 0 ? Math.round(acc.sumMs / acc.count) : null);

/** Median estimated from the histogram (linear interpolation in the bucket holding the 50th percentile). */
export function latencyMedianMs(acc: LatencyAccumulator): number | null {
  if (acc.count === 0) return null;
  const half = acc.count / 2;
  let seen = 0;
  for (let i = 0; i < FIRST_RESPONSE_BUCKET_COUNT; i += 1) {
    const inBucket = acc.buckets[i] ?? 0;
    if (seen + inBucket >= half && inBucket > 0) {
      const lower = i === 0 ? 0 : (FIRST_RESPONSE_BUCKET_EDGES_MS[i - 1] ?? 0);
      const upper = FIRST_RESPONSE_BUCKET_EDGES_MS[i];
      if (upper === undefined) return lower;
      return Math.round(lower + ((half - seen) / inBucket) * (upper - lower));
    }
    seen += inBucket;
  }
  return null;
}

// --- handoff reasons ----------------------------------------------------------------------------------

export const MAX_REASONS_PER_ROW = 10;

/** Reasons are free text written by automations or people: normalised so equal ones group together. */
export function normalizeReason(raw: unknown): string {
  if (typeof raw !== 'string') return 'unspecified';
  const text = raw.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 80) : 'unspecified';
}

export function topReasons(counts: Map<string, number>, limit = MAX_REASONS_PER_ROW): HandoffReasonCount[] {
  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, limit);
}

// --- days ----------------------------------------------------------------------------------------------

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const utcDayKey = (d: Date): string => d.toISOString().slice(0, 10);
export const dayStart = (key: string): Date => new Date(`${key}T00:00:00.000Z`);
export const addDays = (key: string, n: number): string => utcDayKey(new Date(dayStart(key).getTime() + n * DAY_MS));
export const dayCount = (from: string, to: string): number => Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / DAY_MS) + 1;

export function enumerateDays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const rangeError = (message: string) => new AppError(400, message, 'REPORT_INVALID_FILTERS');

export function parseDayKey(value: unknown): string {
  if (typeof value !== 'string' || !DAY_RE.test(value)) throw rangeError('day must be YYYY-MM-DD');
  const d = dayStart(value);
  if (Number.isNaN(d.getTime()) || utcDayKey(d) !== value) throw rangeError('day is not a real date');
  return value;
}

export type ResolvedRange = { from: string; to: string; days: number; previous: { from: string; to: string } };

/** Defaults to the last 30 days ending today (UTC); `to` not after today; at most 366 days. */
export function resolveRange(input: { from?: unknown; to?: unknown }, now: Date): ResolvedRange {
  const today = utcDayKey(now);
  const to = input.to === undefined || input.to === '' ? today : parseDayKey(input.to);
  const from = input.from === undefined || input.from === '' ? addDays(to, -(REPORT_DEFAULT_DAYS - 1)) : parseDayKey(input.from);
  if (to > today) throw rangeError('`to` cannot be in the future');
  if (from > to) throw rangeError('`from` must not be after `to`');
  const days = dayCount(from, to);
  if (days > REPORT_MAX_DAYS) throw rangeError(`range is limited to ${REPORT_MAX_DAYS} days`);
  return { from, to, days, previous: { from: addDays(from, -days), to: addDays(from, -1) } };
}

// --- overview ------------------------------------------------------------------------------------------

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

export function totalsOf(rows: DailyStatsRow[]) {
  const t = {
    conversations: 0,
    inboundMessages: 0,
    aiReplies: 0,
    automationReplies: 0,
    humanReplies: 0,
    aiFailed: 0,
    conversationsActive: 0,
    handoffEvents: 0,
    resolvedByAi: 0,
    handedOff: 0,
    humanHandled: 0,
    abandoned: 0,
    open: 0,
    leads: 0,
    frAi: emptyLatency(),
    frHuman: emptyLatency(),
  };
  for (const r of rows) {
    t.conversations += r.conversationsStarted;
    t.inboundMessages += r.inboundMessages;
    t.aiReplies += r.aiReplies;
    t.automationReplies += r.automationReplies;
    t.humanReplies += r.humanReplies;
    t.aiFailed += r.aiFailed;
    t.conversationsActive += r.conversationsActive;
    t.handoffEvents += r.handoffEvents;
    t.resolvedByAi += r.outcomeResolvedByAi;
    t.handedOff += r.outcomeHandedOff;
    t.humanHandled += r.outcomeHumanHandled;
    t.abandoned += r.outcomeAbandoned;
    t.open += r.outcomeOpen;
    t.leads += r.leadsCreated;
    mergeLatency(t.frAi, r.frAi);
    mergeLatency(t.frHuman, r.frHuman);
  }
  return t;
}
type Totals = ReturnType<typeof totalsOf>;

export const aiResolutionRateOf = (t: Pick<Totals, 'resolvedByAi' | 'conversations' | 'open'>) => ratio(t.resolvedByAi, t.conversations - t.open);
export const handoffRateOf = (t: Pick<Totals, 'handedOff' | 'conversations'>) => ratio(t.handedOff, t.conversations);

const kpi = (value: number | null, previous: number | null): KpiValue => {
  const delta = value !== null && previous !== null ? value - previous : null;
  return { value, previous, delta, deltaPct: delta !== null && previous ? delta / previous : null };
};

const messagesPerActiveDay = (t: Totals) => ratio(t.inboundMessages + t.aiReplies + t.humanReplies + t.automationReplies, t.conversationsActive);

export function buildKpis(cur: Totals, prev: Totals): OverviewKpis {
  return {
    conversations: kpi(cur.conversations, prev.conversations),
    aiReplies: kpi(cur.aiReplies, prev.aiReplies),
    humanReplies: kpi(cur.humanReplies, prev.humanReplies),
    automationReplies: kpi(cur.automationReplies, prev.automationReplies),
    handoffRate: kpi(handoffRateOf(cur), handoffRateOf(prev)),
    aiResolutionRate: kpi(aiResolutionRateOf(cur), aiResolutionRateOf(prev)),
    firstResponseAiAvgMs: kpi(latencyAvgMs(cur.frAi), latencyAvgMs(prev.frAi)),
    firstResponseAiMedianMs: kpi(latencyMedianMs(cur.frAi), latencyMedianMs(prev.frAi)),
    firstResponseHumanAvgMs: kpi(latencyAvgMs(cur.frHuman), latencyAvgMs(prev.frHuman)),
    firstResponseHumanMedianMs: kpi(latencyMedianMs(cur.frHuman), latencyMedianMs(prev.frHuman)),
    leadsCreated: kpi(cur.leads, prev.leads),
    messagesPerActiveConversationDay: kpi(messagesPerActiveDay(cur), messagesPerActiveDay(prev)),
    // Business hours are not evaluated from the inbox data: always reported as not available.
    afterHoursShare: kpi(null, null),
  };
}

export function buildSeries(rows: DailyStatsRow[], from: string, to: string): SeriesPoint[] {
  const byDay = new Map<string, SeriesPoint>();
  for (const day of enumerateDays(from, to)) byDay.set(day, { day, conversations: 0, inboundMessages: 0, aiReplies: 0, humanReplies: 0, handoffEvents: 0, leadsCreated: 0 });
  for (const r of rows) {
    const p = byDay.get(r.day);
    if (!p) continue;
    p.conversations += r.conversationsStarted;
    p.inboundMessages += r.inboundMessages;
    p.aiReplies += r.aiReplies;
    p.humanReplies += r.humanReplies;
    p.handoffEvents += r.handoffEvents;
    p.leadsCreated += r.leadsCreated;
  }
  return Array.from(byDay.values());
}

export function buildAgentBreakdown(rows: DailyStatsRow[], names: Map<string, string>): AgentBreakdownRow[] {
  const groups = new Map<string, DailyStatsRow[]>();
  for (const r of rows) {
    const key = r.agentId ?? 'null';
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return Array.from(groups.entries())
    .map(([key, group]) => {
      const t = totalsOf(group);
      return {
        agentId: key === 'null' ? null : key,
        name: key === 'null' ? null : (names.get(key) ?? null),
        conversations: t.conversations,
        aiReplies: t.aiReplies,
        handoffRate: handoffRateOf(t),
        aiResolutionRate: aiResolutionRateOf(t),
        firstResponseAiAvgMs: latencyAvgMs(t.frAi),
        firstResponseAiMedianMs: latencyMedianMs(t.frAi),
        leadsCreated: t.leads,
      };
    })
    .filter((a) => a.conversations > 0 || a.aiReplies > 0)
    .sort((a, b) => b.conversations - a.conversations || b.aiReplies - a.aiReplies);
}

export function buildChannelBreakdown(rows: DailyStatsRow[]): ChannelBreakdownRow[] {
  return REPORT_CHANNELS.map((channel) => {
    const t = totalsOf(rows.filter((r) => r.channel === channel));
    return {
      channel,
      conversations: t.conversations,
      inboundMessages: t.inboundMessages,
      aiReplies: t.aiReplies,
      humanReplies: t.humanReplies,
      handoffRate: handoffRateOf(t),
      aiResolutionRate: aiResolutionRateOf(t),
    };
  });
}

export function buildOutcomes(t: Totals): OutcomesDistribution {
  const counts: Record<ConversationOutcome, number> = {
    resolved_by_ai: t.resolvedByAi,
    handed_off: t.handedOff,
    human_handled: t.humanHandled,
    abandoned: t.abandoned,
    open: t.open,
  };
  const total = CONVERSATION_OUTCOMES.reduce((sum, o) => sum + counts[o], 0);
  return { total, items: CONVERSATION_OUTCOMES.map((outcome) => ({ outcome, count: counts[outcome], share: ratio(counts[outcome], total) })) };
}

export function mergeReasons(rows: DailyStatsRow[]): HandoffReasonCount[] {
  const map = new Map<string, number>();
  for (const r of rows) for (const h of r.handoffReasons) map.set(h.reason, (map.get(h.reason) ?? 0) + h.count);
  return topReasons(map);
}

/**
 * Metrics the stored data cannot answer honestly. `after_hours_share`: business hours are not evaluated here.
 * The others were never measurable (the reference reports them the same way).
 */
export const ALWAYS_NOT_AVAILABLE = ['opt_outs', 'customer_satisfaction', 'ai_resolution_confirmed', 'after_hours_share'] as const;

export function buildOverview(params: {
  range: ResolvedRange;
  current: DailyStatsRow[];
  previous: DailyStatsRow[];
  agentNames: Map<string, string>;
  generatedAt: Date;
  status: ReportStatus;
}): OverviewResponse {
  const { range, current, previous } = params;
  const cur = totalsOf(current);
  const prev = totalsOf(previous);
  return {
    range: { from: range.from, to: range.to, days: range.days },
    previousRange: range.previous,
    generatedAt: params.generatedAt.toISOString(),
    kpis: buildKpis(cur, prev),
    series: buildSeries(current, range.from, range.to),
    byAgent: buildAgentBreakdown(current, params.agentNames),
    byChannel: buildChannelBreakdown(current),
    outcomes: buildOutcomes(cur),
    topHandoffReasons: mergeReasons(current),
    notAvailable: [...ALWAYS_NOT_AVAILABLE],
    status: params.status,
  };
}
