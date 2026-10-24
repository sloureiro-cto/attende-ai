"use server"

import { botsGate } from "actions/messaging-automations/gate"
import type { ActionResult } from "actions/messaging-automations/result"
import { apiRequest } from "lib/attende/serverApi"
import type { DailyStatsPoint } from "./statsMath"

/** Daily run counters (zero-filled, oldest first) for the stats trend chart, from the Attende backend. */
export async function getAdvancedAutomationStatsSeriesAction(
  id: string,
  days: number
): Promise<ActionResult<DailyStatsPoint[]>> {
  const off = await botsGate()
  if (off) return off
  const res = await apiRequest<{ series?: DailyStatsPoint[] }>(
    "attende",
    "GET",
    `/messaging-automations/advanced/${encodeURIComponent(id)}/stats/series`,
    { query: { days } }
  )
  if (!res.success) {
    return {
      success: false,
      error: res.status === 0 || res.status === 500 ? "" : res.message ?? "",
      status: res.status,
      ...(res.reference ? { code: res.reference } : {}),
    }
  }
  if (!res.data || !Array.isArray(res.data.series)) return { success: false, error: "" }
  return { success: true, data: res.data.series }
}
