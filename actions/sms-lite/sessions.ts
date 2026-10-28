"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import { attendePlanCheck } from "lib/attende/planGuard"
import type { ISmsSession, ResponseSlaRules, SmsSessionStatus } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/sms-lite`
}

export type SmsActionOk<T> = { success: true; data: T }
export type SmsActionErr = { success: false; error: string }
export type SmsActionResult<T> = SmsActionOk<T> | SmsActionErr

export type SmsSessionsListResult =
  | {
      success: true
      data: ISmsSession[]
      hasCredentials: boolean
    }
  | SmsActionErr

export async function listSmsSessionsAction(): Promise<SmsSessionsListResult> {
  try {
    const raw = await FetchClient.get<any>(`${base()}/sessions`, { cache: "no-store" })
    const data = pickData<ISmsSession[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as ISmsSession[]) : []
    const hasCredentials =
      typeof raw === "object" && raw !== null && "hasCredentials" in raw ? Boolean((raw as any).hasCredentials) : false
    return { success: true, data: list, hasCredentials }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getSmsSessionAction(sessionId: string): Promise<SmsActionResult<ISmsSession>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}`)
    const data = pickData<ISmsSession>(raw) ?? (raw as ISmsSession)
    if (!data?._id) {
      return { success: false, error: "Session not found" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function createSmsSessionAction(input: {
  label: string
  provider?: string
  fromNumber: string
  accountSid?: string
  authToken?: string
}): Promise<SmsActionResult<ISmsSession>> {
  // Attende plan (JSYNQ keeps no Attende limits): refuse before JSYNQ creates anything.
  const plan = await attendePlanCheck("lines")
  if (!plan.ok) return { success: false, error: plan.message }
  try {
    const body: Record<string, unknown> = {
      label: input.label.trim(),
      provider: input.provider ?? "twilio",
      fromNumber: input.fromNumber.trim(),
    }
    if (input.accountSid?.trim()) {
      body.accountSid = input.accountSid.trim()
    }
    if (input.authToken?.trim()) {
      body.authToken = input.authToken.trim()
    }
    const raw = await FetchClient.post<unknown>(`${base()}/sessions`, body)
    const data = pickData<ISmsSession>(raw) ?? (raw as ISmsSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function updateSmsSessionAction(
  sessionId: string,
  input: {
    label?: string
    status?: SmsSessionStatus
    fromNumber?: string
    accountSid?: string
    authToken?: string
    responseSlaRules?: ResponseSlaRules | null
    prependAttendantNameEnabled?: boolean
  }
): Promise<SmsActionResult<ISmsSession>> {
  try {
    const body: Record<string, unknown> = {}
    if (input.label !== undefined) body.label = input.label.trim()
    if (input.status !== undefined) body.status = input.status
    if (input.fromNumber !== undefined) body.fromNumber = input.fromNumber.trim()
    if (input.accountSid?.trim()) body.accountSid = input.accountSid.trim()
    if (input.authToken?.trim()) body.authToken = input.authToken.trim()
    if (input.responseSlaRules !== undefined) body.responseSlaRules = input.responseSlaRules
    if (input.prependAttendantNameEnabled !== undefined)
      body.prependAttendantNameEnabled = input.prependAttendantNameEnabled
    const raw = await FetchClient.patch<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}`, body)
    const data = pickData<ISmsSession>(raw) ?? (raw as ISmsSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteSmsSessionAction(sessionId: string): Promise<SmsActionResult<void>> {
  try {
    await FetchClient.delete<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}`)
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
