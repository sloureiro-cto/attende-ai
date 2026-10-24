"use server"

import { botsGate } from "actions/messaging-automations/gate"
import type { ActionResult } from "actions/messaging-automations/result"
import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type { DailyStatsPoint } from "./statsMath"

/** Daily run counters (zero-filled, oldest first) for the stats trend chart. */
export async function getAdvancedAutomationStatsSeriesAction(id: string, days: number): Promise<ActionResult<DailyStatsPoint[]>> {
  const off = await botsGate()
  if (off) return off
  try {
    const backend = process.env.BACKEND_URL
    if (!backend) throw new Error("BACKEND_URL is not defined")
    const raw = await FetchClient.get<unknown>(`${backend}/messaging-automations/advanced/${encodeURIComponent(id)}/stats/series`, {
      query: { days },
    })
    const data = pickData<{ series?: DailyStatsPoint[] }>(raw)
    if (!data || !Array.isArray(data.series)) return { success: false, error: "" }
    return { success: true, data: data.series }
  } catch (e) {
    return e instanceof HttpError
      ? { success: false, error: e.message, status: e.status }
      : { success: false, error: "" }
  }
}
