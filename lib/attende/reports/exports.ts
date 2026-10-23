import { toCsv } from "./model"
import type { AgentBreakdownRow, ChannelBreakdownRow, OutcomesDistribution, SeriesPoint } from "./types"

type Label = (key: string) => string

/** Daily activity, oldest first (the same numbers as the table view). */
export function dailyCsv(series: SeriesPoint[], label: Label): string {
  return toCsv([
    [label("tableDay"), label("seriesConversations"), label("seriesCustomerMessages"), label("seriesAiReplies"), label("seriesHumanReplies"), label("seriesHandoffs"), label("seriesLeads")],
    ...series.map((p) => [p.day, p.conversations, p.inboundMessages, p.aiReplies, p.humanReplies, p.handoffEvents, p.leadsCreated]),
  ])
}

/** Rates are exported as plain 0-100 numbers with one decimal; a missing value stays an empty cell, never 0. */
const pct = (v: number | null): number | null => (v === null ? null : Math.round(v * 1000) / 10)
const seconds = (ms: number | null): number | null => (ms === null ? null : Math.round(ms / 1000))

export function agentsCsv(rows: AgentBreakdownRow[], label: Label, unattributedLabel: string): string {
  return toCsv([
    [label("colAgent"), label("colConversations"), label("colAiReplies"), label("csvHandoffPct"), label("csvResolutionPct"), label("csvFirstResponseSec"), label("colLeads")],
    ...rows.map((r) => [r.agentId === null ? unattributedLabel : (r.name ?? ""), r.conversations, r.aiReplies, pct(r.handoffRate), pct(r.aiResolutionRate), seconds(r.firstResponseAiMedianMs), r.leadsCreated]),
  ])
}

export function channelsCsv(rows: ChannelBreakdownRow[], label: Label, channelName: (c: ChannelBreakdownRow["channel"]) => string): string {
  return toCsv([
    [label("colChannel"), label("colConversations"), label("colCustomerMessages"), label("colAiReplies"), label("colTeamReplies"), label("csvHandoffPct"), label("csvResolutionPct")],
    ...rows.map((r) => [channelName(r.channel), r.conversations, r.inboundMessages, r.aiReplies, r.humanReplies, pct(r.handoffRate), pct(r.aiResolutionRate)]),
  ])
}

export function outcomesCsv(outcomes: OutcomesDistribution, label: Label, outcomeName: (o: string) => string): string {
  return toCsv([
    [label("csvOutcome"), label("csvCount"), label("csvShare")],
    ...outcomes.items.map((i) => [outcomeName(i.outcome), i.count, pct(i.share)]),
  ])
}

export const exportFileName = (kind: "daily" | "agents" | "channels" | "outcomes", from: string, to: string): string => `attende-report-${kind}-${from}_${to}.csv`
