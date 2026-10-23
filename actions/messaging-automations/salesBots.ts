"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type {
  AutomationChannel,
  SalesBotDetail,
  SalesBotIssue,
  SalesBotListResponse,
  SalesBotPreviewResult,
  SalesBotStatsSummary,
  SalesBotStatus,
  SaveSalesBotInput,
} from "lib/automations/types"
import { botsGate } from "./gate"
import type { ActionResult } from "./result"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/sales-bots`
}

function fail(e: unknown): { success: false; error: string; status?: number; issues?: SalesBotIssue[] } {
  if (e instanceof HttpError) {
    const details = e.details as { issues?: SalesBotIssue[]; details?: { issues?: SalesBotIssue[] } } | undefined
    const issues = details?.issues ?? details?.details?.issues
    return { success: false, error: e.message, status: e.status, ...(Array.isArray(issues) ? { issues } : {}) }
  }
  return { success: false, error: "" }
}

type ListSalesBotsParams = {
  q?: string
  channel?: AutomationChannel
  status?: SalesBotStatus
  page?: number
  limit?: number
}

export async function listSalesBotsAction(params: ListSalesBotsParams = {}): Promise<ActionResult<SalesBotListResponse>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.get<unknown>(base(), {
      query: {
        ...(params.q?.trim() ? { q: params.q.trim() } : {}),
        ...(params.channel ? { channel: params.channel } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.page ? { page: params.page } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      },
    })
    const data = pickData<SalesBotListResponse>(raw)
    if (!data || !Array.isArray(data.items)) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function getSalesBotAction(id: string): Promise<ActionResult<SalesBotDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/${encodeURIComponent(id)}`)
    const data = pickData<SalesBotDetail>(raw)
    if (!data?.id) return { success: false, error: "", status: 404 }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function createSalesBotAction(input: SaveSalesBotInput): Promise<ActionResult<SalesBotDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.post<unknown>(base(), input)
    const data = pickData<SalesBotDetail>(raw)
    if (!data?.id) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function updateSalesBotAction(
  id: string,
  input: Partial<SaveSalesBotInput> & { expectedUpdatedAt?: string }
): Promise<ActionResult<SalesBotDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.patch<unknown>(`${base()}/${encodeURIComponent(id)}`, input)
    const data = pickData<SalesBotDetail>(raw)
    if (!data?.id) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteSalesBotAction(id: string): Promise<ActionResult<null>> {
  const off = await botsGate()
  if (off) return off
  try {
    await FetchClient.delete<unknown>(`${base()}/${encodeURIComponent(id)}`)
    return { success: true, data: null }
  } catch (e) {
    return fail(e)
  }
}

export async function getSalesBotStatsAction(id: string, days = 30): Promise<ActionResult<SalesBotStatsSummary>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/${encodeURIComponent(id)}/stats`, { query: { days } })
    const data = pickData<SalesBotStatsSummary>(raw)
    if (!data) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function previewSalesBotAction(input: {
  botId?: string
  bot?: { startNodeId: string; nodes: SaveSalesBotInput["nodes"]; edges: SaveSalesBotInput["edges"] }
  channel: AutomationChannel
  event: { type: "start" } | { type: "inbound"; text: string; optionId?: string } | { type: "timer" }
  state?: Record<string, unknown>
  simulatedAt?: string
}): Promise<ActionResult<SalesBotPreviewResult>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/preview`, input)
    const data = pickData<SalesBotPreviewResult>(raw)
    if (!data?.state) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}
