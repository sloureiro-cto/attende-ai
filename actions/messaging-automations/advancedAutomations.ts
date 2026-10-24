"use server"

import type { AttendeActionError } from "lib/attende/result"
import { type ApiMethod, apiRequest, type Query } from "lib/attende/serverApi"
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
import type { ActionErr, ActionResult } from "./result"

/** Advanced automations live on the Attende backend (`ATTENDE_API_URL`), same paths as before. */
const BASE = "/messaging-automations/advanced"
const enc = encodeURIComponent

/** Backend error -> action error: its message (shown as is by the editor), status, code and validation issues. */
function fail(error: AttendeActionError): ActionErr {
  const details = error.details as
    | { issues?: AdvancedAutomationIssue[]; details?: { issues?: AdvancedAutomationIssue[] } }
    | undefined
  const issues = details?.issues ?? details?.details?.issues
  return {
    success: false,
    // A network problem or a missing env has no message for people: callers fall back to a localized string.
    error: error.status === 0 || error.status === 500 ? "" : error.message ?? "",
    // A workspace mismatch is a 409 too: drop the status so it is never taken for an edit conflict.
    ...(error.reference === "WORKSPACE_TOKEN_MISMATCH" ? {} : { status: error.status }),
    ...(error.reference ? { code: error.reference } : {}),
    ...(Array.isArray(issues) ? { issues } : {}),
  }
}

async function call<T>(
  method: ApiMethod,
  path: string,
  options: { query?: Query; body?: unknown } = {}
): Promise<{ ok: true; data: T | undefined } | { ok: false; error: ActionErr }> {
  const off = await botsGate()
  if (off) return { ok: false, error: off }
  const result = await apiRequest<T>("attende", method, path, options)
  return result.success ? { ok: true, data: result.data ?? undefined } : { ok: false, error: fail(result) }
}

type ListAdvancedAutomationsParams = {
  q?: string
  channel?: AutomationChannel
  status?: AdvancedAutomationStatus
  page?: number
  limit?: number
}

export async function listAdvancedAutomationsAction(
  params: ListAdvancedAutomationsParams = {}
): Promise<ActionResult<AdvancedAutomationListResponse>> {
  const res = await call<AdvancedAutomationListResponse>("GET", BASE, {
    query: {
      q: params.q?.trim() || undefined,
      channel: params.channel,
      status: params.status,
      page: params.page || undefined,
      limit: params.limit || undefined,
    },
  })
  if (!res.ok) return res.error
  if (!res.data || !Array.isArray(res.data.items)) return { success: false, error: "" }
  return { success: true, data: res.data }
}

export async function getAdvancedAutomationAction(id: string): Promise<ActionResult<AdvancedAutomationDetail>> {
  const res = await call<AdvancedAutomationDetail>("GET", `${BASE}/${enc(id)}`)
  if (!res.ok) return res.error
  if (!res.data?.id) return { success: false, error: "", status: 404 }
  return { success: true, data: res.data }
}

export async function createAdvancedAutomationAction(
  input: SaveAdvancedAutomationInput
): Promise<ActionResult<AdvancedAutomationDetail>> {
  const res = await call<AdvancedAutomationDetail>("POST", BASE, { body: input })
  if (!res.ok) return res.error
  if (!res.data?.id) return { success: false, error: "" }
  return { success: true, data: res.data }
}

export async function updateAdvancedAutomationAction(
  id: string,
  input: Partial<SaveAdvancedAutomationInput> & { expectedUpdatedAt?: string }
): Promise<ActionResult<AdvancedAutomationDetail>> {
  const res = await call<AdvancedAutomationDetail>("PATCH", `${BASE}/${enc(id)}`, { body: input })
  if (!res.ok) return res.error
  if (!res.data?.id) return { success: false, error: "" }
  return { success: true, data: res.data }
}

export async function deleteAdvancedAutomationAction(id: string): Promise<ActionResult<null>> {
  const res = await call<unknown>("DELETE", `${BASE}/${enc(id)}`)
  if (!res.ok) return res.error
  return { success: true, data: null }
}

export async function getAdvancedAutomationStatsAction(
  id: string,
  days = 30
): Promise<ActionResult<AdvancedAutomationStatsSummary>> {
  const res = await call<AdvancedAutomationStatsSummary>("GET", `${BASE}/${enc(id)}/stats`, { query: { days } })
  if (!res.ok) return res.error
  if (!res.data) return { success: false, error: "" }
  return { success: true, data: res.data }
}

export async function previewAdvancedAutomationAction(input: {
  automationId?: string
  automation?: {
    startNodeId: string
    nodes: SaveAdvancedAutomationInput["nodes"]
    edges: SaveAdvancedAutomationInput["edges"]
  }
  channel: AutomationChannel
  event: { type: "start" } | { type: "inbound"; text: string; optionId?: string } | { type: "timer" }
  state?: Record<string, unknown>
  simulatedAt?: string
}): Promise<ActionResult<AdvancedAutomationPreviewResult>> {
  const res = await call<AdvancedAutomationPreviewResult>("POST", `${BASE}/preview`, { body: input })
  if (!res.ok) return res.error
  if (!res.data?.state) return { success: false, error: "" }
  return { success: true, data: res.data }
}
