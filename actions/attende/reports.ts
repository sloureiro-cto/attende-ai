"use server"

import { daysBetween, filtersToApiQuery, isDay, MAX_RANGE_DAYS, toDay } from "lib/attende/reports/model"
import { type AgentBreakdownRow, type OverviewResponse, REPORT_CHANNELS, type ReportFilters } from "lib/attende/reports/types"
import type { AttendeActionResult } from "lib/attende/result"
import { attendeGet } from "lib/attende/serverApi"

export type ReportData = {
  overview: OverviewResponse
  /** Every agent that had activity in the period and channel (ignores the agent filter, so the picker keeps its options). */
  agents: AgentBreakdownRow[]
}

const AGENT_ID_RE = /^([a-f0-9]{24}|none)$/i

/** Never trust the client: the backend refuses these too, but a bad filter should not even cost a request. */
function validate(filters: ReportFilters): boolean {
  if (!isDay(filters.from) || !isDay(filters.to) || filters.from > filters.to || filters.to > toDay(new Date())) return false
  if (daysBetween(filters.from, filters.to) > MAX_RANGE_DAYS) return false
  if (filters.channel !== null && !(REPORT_CHANNELS as readonly string[]).includes(filters.channel)) return false
  if (filters.agentId !== null && !AGENT_ID_RE.test(filters.agentId)) return false
  return true
}

/** The dashboard in one round trip: the overview for the filters plus the agent list for the picker. */
export async function loadReportAction(filters: ReportFilters): Promise<AttendeActionResult<ReportData>> {
  if (!validate(filters)) return { success: false, status: 400, reference: "REPORT_INVALID_FILTERS" }
  const withoutAgent = { ...filters, agentId: null }
  const [overview, agents] = await Promise.all([
    attendeGet<OverviewResponse>("/attende/reports/overview", filtersToApiQuery(filters)),
    attendeGet<{ agents: AgentBreakdownRow[] }>("/attende/reports/agents", filtersToApiQuery(withoutAgent)),
  ])
  if (!overview.success) return overview
  // The picker is a convenience: if only the agent list fails, the report still renders.
  return { success: true, data: { overview: overview.data, agents: agents.success ? (agents.data?.agents ?? []) : overview.data.byAgent } }
}
