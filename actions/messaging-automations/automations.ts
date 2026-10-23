"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type {
  AutomationChannel,
  AutomationDetail,
  AutomationListResponse,
  AutomationStatus,
  SaveAutomationInput,
  SimulateAutomationInput,
  SimulateAutomationResult,
  UpdateAutomationInput,
} from "lib/automations/types"
import { botsGate } from "./gate"
import type { ActionResult } from "./result"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  // New module on purpose: /whatsapp-templates is proxied to the WhatsApp gateway in production.
  return `${u}/messaging-automations`
}

function fail(e: unknown): { success: false; error: string; status?: number } {
  if (e instanceof HttpError) return { success: false, error: e.message, status: e.status }
  return { success: false, error: "" }
}

type ListAutomationsParams = {
  q?: string
  channel?: AutomationChannel
  status?: AutomationStatus
  page?: number
  limit?: number
}

export async function listAutomationsAction(params: ListAutomationsParams = {}): Promise<ActionResult<AutomationListResponse>> {
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
    const data = pickData<AutomationListResponse>(raw)
    if (!data || !Array.isArray(data.items)) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function getAutomationAction(id: string): Promise<ActionResult<AutomationDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/${encodeURIComponent(id)}`)
    const data = pickData<AutomationDetail>(raw)
    if (!data?.id) return { success: false, error: "Automation not found" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function createAutomationAction(input: SaveAutomationInput): Promise<ActionResult<AutomationDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.post<unknown>(base(), input)
    const data = pickData<AutomationDetail>(raw)
    if (!data?.id) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function updateAutomationAction(
  id: string,
  input: UpdateAutomationInput
): Promise<ActionResult<AutomationDetail>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.patch<unknown>(`${base()}/${encodeURIComponent(id)}`, input)
    const data = pickData<AutomationDetail>(raw)
    if (!data?.id) return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteAutomationAction(id: string): Promise<ActionResult<null>> {
  const off = await botsGate()
  if (off) return off
  try {
    await FetchClient.delete<unknown>(`${base()}/${encodeURIComponent(id)}`)
    return { success: true, data: null }
  } catch (e) {
    return fail(e)
  }
}

export async function simulateAutomationAction(
  input: SimulateAutomationInput
): Promise<ActionResult<SimulateAutomationResult>> {
  const off = await botsGate()
  if (off) return off
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/simulate`, input)
    const data = pickData<SimulateAutomationResult>(raw)
    if (!data || typeof data.matched !== "boolean") return { success: false, error: "" }
    return { success: true, data }
  } catch (e) {
    return fail(e)
  }
}
