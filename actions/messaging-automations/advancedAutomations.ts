"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type {
  AutomationChannel,
  AdvancedAutomationDetail,
  AdvancedAutomationIssue,
  AdvancedAutomationListResponse,
  AdvancedAutomationPreviewResult,
  AdvancedAutomationStatsSummary,
  AdvancedAutomationStatus,
  SaveAdvancedAutomationInput,
} from "lib/automations/types"
import { botsGate } from "./gate"
import type { ActionResult } from "./result"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/messaging-automations/advanced`
}

function fail(e: unknown): { success: false; error: string; status?: number; issues?: AdvancedAutomationIssue[] } {
  if (e instanceof HttpError) {
    const details = e.details as { issues?: AdvancedAutomationIssue[]; details?: { issues?: AdvancedAutomationIssue[] } } | undefined
    const issues = details?.issues ?? details?.details?.issues
    return { success: false, error: e.message, status: e.status, ...(Array.isArray(issues) ? { issues } : {}) }
  }
  return { success: false, error: "" }
}

type ListAdvancedAutomationsParams = {
  q?: string
  channel?: AutomationChannel
  status?: AdvancedAutomationStatus
  page?: number
  limit?: number
}

export async function listAdvancedAutomationsAction(params: ListAdvancedAutomationsParams = {}): Promise<ActionResult<AdvancedAutomationListResponse>> {
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
    const data = pickData<AdvancedAutomationListResponse>(raw)
    if (!data || !Array.isArray(data.items)) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function getAdvancedAutomationAction(id: string): Promise<ActionResult<AdvancedAutomationDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/${encodeURIComponent(id)}`)
    const data = pickData<AdvancedAutomationDetail>(raw)
    if (!data?.id) return { success: false, error: "", status: 404 }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function createAdvancedAutomationAction(input: SaveAdvancedAutomationInput): Promise<ActionResult<AdvancedAutomationDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.post<unknown>(base(), input)
    const data = pickData<AdvancedAutomationDetail>(raw)
    if (!data?.id) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function updateAdvancedAutomationAction(
  id: string,
  input: Partial<SaveAdvancedAutomationInput> & { expectedUpdatedAt?: string }
): Promise<ActionResult<AdvancedAutomationDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.patch<unknown>(`${base()}/${encodeURIComponent(id)}`, input)
    const data = pickData<AdvancedAutomationDetail>(raw)
    if (!data?.id) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteAdvancedAutomationAction(id: string): Promise<ActionResult<null>> {
  const off = await botsGate()
  if (off) return off
  try {
    await FetchClient.delete<unknown>(`${base()}/${encodeURIComponent(id)}`)
    return { success: true, data: null }
  } catch (e) {
    return fail(e)
  }
}

export async function getAdvancedAutomationStatsAction(id: string, days = 30): Promise<ActionResult<AdvancedAutomationStatsSummary>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/${encodeURIComponent(id)}/stats`, { query: { days } })
    const data = pickData<AdvancedAutomationStatsSummary>(raw)
    if (!data) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function previewAdvancedAutomationAction(input: {
  automationId?: string
  automation?: { startNodeId: string; nodes: SaveAdvancedAutomationInput["nodes"]; edges: SaveAdvancedAutomationInput["edges"] }
  channel: AutomationChannel
  event: { type: "start" } | { type: "inbound"; text: string; optionId?: string } | { type: "timer" }
  state?: Record<string, unknown>
  simulatedAt?: string
}): Promise<ActionResult<AdvancedAutomationPreviewResult>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/preview`, input)
    const data = pickData<AdvancedAutomationPreviewResult>(raw)
    if (!data?.state) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}
