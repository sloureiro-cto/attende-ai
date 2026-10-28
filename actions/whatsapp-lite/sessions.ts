"use server"

import {
  type CloudApiRegistrationMeta,
  pickCloudApiRegistrationMeta,
  readCloudApiPinRequired,
} from "@/lib/whatsapp-lite/cloudApiCredentials"
import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import { attendePlanCheck } from "lib/attende/planGuard"
import { parseWhatsAppQrPollPayload, summarizeQrResponseForDebug } from "./qrResponse"
import type { ResponseSlaRules, WhatsAppQrPollPayload, WhatsAppSession } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/whatsapp-lite`
}

function shouldLogWhatsAppQr(): boolean {
  return process.env.NODE_ENV === "development" || process.env.WHATSAPP_LITE_QR_DEBUG === "1"
}

export type SessionActionOk<T> = { success: true; data: T }
export type SessionActionErr = {
  success: false
  error: string
  pinRequired?: boolean
  pendingId?: string
}

function cloudApiPinRequiredFields(error: HttpError): Pick<SessionActionErr, "pinRequired" | "pendingId"> {
  const pin = readCloudApiPinRequired(error.details)
  if (!pin) return {}
  return { pinRequired: true, ...(pin.pendingId ? { pendingId: pin.pendingId } : {}) }
}
export type SessionActionResult<T> = SessionActionOk<T> | SessionActionErr
export type SessionActionOkWithRegistration<T> = SessionActionOk<T> & {
  registration?: CloudApiRegistrationMeta
}
export type SessionActionResultWithRegistration<T> = SessionActionOkWithRegistration<T> | SessionActionErr

export async function createWhatsAppSessionAction(input: {
  label: string
  syncHistory?: boolean
}): Promise<SessionActionResult<WhatsAppSession>> {
  // Attende plan (JSYNQ keeps no Attende limits): refuse before JSYNQ creates anything.
  const plan = await attendePlanCheck("lines")
  if (!plan.ok) return { success: false, error: plan.message }
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/sessions`, {
      label: input.label.trim(),
      syncHistory: input.syncHistory === true,
    })
    const data = pickData<WhatsAppSession>(raw) ?? (raw as WhatsAppSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export interface CloudApiCredentialsInput {
  wabaId: string
  phoneNumberId: string
  accessToken: string
  /** 6-digit WhatsApp two-step verification PIN (Meta /register). */
  pin: string
}

function normalizeCloudApiPin(pin: string): string {
  return pin.trim()
}

/** Whether this workspace uses its own Meta app (skip Embedded Signup). */
export async function getWhatsAppCloudConnectOptionsAction(): Promise<
  SessionActionResult<{ hasWorkspaceMetaAppOverride: boolean }>
> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/cloud-api/connect-options`)
    const data = pickData<{ hasWorkspaceMetaAppOverride?: boolean }>(raw)
    return {
      success: true,
      data: { hasWorkspaceMetaAppOverride: Boolean(data?.hasWorkspaceMetaAppOverride) },
    }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Creates a Cloud API session from Meta Embedded Signup (oauth code + WABA/phone ids). */
export async function createEmbeddedSignupCloudApiSessionAction(input: {
  label?: string
  code?: string
  wabaId?: string
  phoneNumberId?: string
  pin?: string
  pendingId?: string
}): Promise<SessionActionResultWithRegistration<WhatsAppSession>> {
  // Attende plan (JSYNQ keeps no Attende limits): refuse before JSYNQ creates anything.
  if (!input.pendingId?.trim()) {
    const plan = await attendePlanCheck("lines")
    if (!plan.ok) return { success: false, error: plan.message }
  }
  try {
    const pin = input.pin?.trim()
    const pendingId = input.pendingId?.trim()
    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/cloud-api/embedded-signup`,
      pendingId
        ? { pendingId, pin }
        : {
            label: input.label?.trim(),
            code: input.code?.trim(),
            wabaId: input.wabaId?.trim(),
            phoneNumberId: input.phoneNumberId?.trim(),
            ...(pin ? { pin } : {}),
          }
    )
    const data = pickData<WhatsAppSession>(raw) ?? (raw as WhatsAppSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return {
      success: true,
      data,
      registration: pickCloudApiRegistrationMeta(raw),
    }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message, ...cloudApiPinRequiredFields(e) }
    return { success: false, error: "something went wrong" }
  }
}

/** Creates a Meta Cloud API session (no QR pairing). Validates credentials with Meta and registers the number. */
export async function createCloudApiWhatsAppSessionAction(input: {
  label: string
  credentials: CloudApiCredentialsInput
}): Promise<SessionActionResultWithRegistration<WhatsAppSession>> {
  // Attende plan (JSYNQ keeps no Attende limits): refuse before JSYNQ creates anything.
  const plan = await attendePlanCheck("lines")
  if (!plan.ok) return { success: false, error: plan.message }
  try {
    const pin = normalizeCloudApiPin(input.credentials.pin)
    const raw = await FetchClient.post<unknown>(`${base()}/sessions/cloud-api`, {
      label: input.label.trim(),
      wabaId: input.credentials.wabaId.trim(),
      phoneNumberId: input.credentials.phoneNumberId.trim(),
      accessToken: input.credentials.accessToken.trim(),
      ...(pin ? { pin } : {}),
    })
    const data = pickData<WhatsAppSession>(raw) ?? (raw as WhatsAppSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return {
      success: true,
      data,
      registration: pickCloudApiRegistrationMeta(raw),
    }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message, ...cloudApiPinRequiredFields(e) }
    return { success: false, error: "something went wrong" }
  }
}

/** Updates Cloud API credentials on an existing session, re-validates and re-registers with Meta. */
export async function setupCloudApiWhatsAppSessionAction(
  sessionId: string,
  credentials: CloudApiCredentialsInput
): Promise<SessionActionResultWithRegistration<WhatsAppSession>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/cloud-api/setup`, {
      wabaId: credentials.wabaId.trim(),
      phoneNumberId: credentials.phoneNumberId.trim(),
      accessToken: credentials.accessToken.trim(),
      pin: normalizeCloudApiPin(credentials.pin),
    })
    const data = pickData<WhatsAppSession>(raw) ?? (raw as WhatsAppSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return {
      success: true,
      data,
      registration: pickCloudApiRegistrationMeta(raw),
    }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Live Cloud API status (phone-number health) for a session. */
export async function getCloudApiWhatsAppStatusAction(
  sessionId: string
): Promise<SessionActionResult<{ status: WhatsAppSession["status"]; phoneNumber?: string }>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/cloud-api/status`)
    const data =
      pickData<{ status: WhatsAppSession["status"]; phoneNumber?: string }>(raw) ??
      (raw as { status: WhatsAppSession["status"]; phoneNumber?: string })
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listWhatsAppSessionsAction(): Promise<SessionActionResult<WhatsAppSession[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions`, { cache: "no-store" })
    const data = pickData<WhatsAppSession[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as WhatsAppSession[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getWhatsAppSessionAction(sessionId: string): Promise<SessionActionResult<WhatsAppSession>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}`)
    const data = pickData<WhatsAppSession>(raw) ?? (raw as WhatsAppSession)
    if (!data?._id) {
      return { success: false, error: "Session not found" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function updateWhatsAppSessionAction(
  sessionId: string,
  input: {
    label?: string
    responseSlaRules?: ResponseSlaRules | null
    prependAttendantNameEnabled?: boolean
    showOnlyLinkedLeadConversations?: boolean
  }
): Promise<SessionActionResult<WhatsAppSession>> {
  try {
    const body: Record<string, unknown> = {}
    if (input.label !== undefined) body.label = input.label.trim()
    if (input.responseSlaRules !== undefined) body.responseSlaRules = input.responseSlaRules
    if (input.prependAttendantNameEnabled !== undefined) {
      body.prependAttendantNameEnabled = input.prependAttendantNameEnabled
    }
    if (input.showOnlyLinkedLeadConversations !== undefined) {
      body.showOnlyLinkedLeadConversations = input.showOnlyLinkedLeadConversations
    }
    const raw = await FetchClient.patch<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}`, body)
    const data = pickData<WhatsAppSession>(raw) ?? (raw as WhatsAppSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteWhatsAppSessionAction(sessionId: string): Promise<SessionActionResult<void>> {
  try {
    await FetchClient.delete<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}`)
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Resume Baileys with Mongo-stored pairing (no new QR when credentials are still valid). */
export async function reconnectWhatsAppSessionAction(sessionId: string): Promise<SessionActionResult<WhatsAppSession>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/reconnect`, {})
    const data = pickData<WhatsAppSession>(raw) ?? (raw as WhatsAppSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/**
 * GET …/sessions/:id/qr — 200 com `qrCode` possivelmente null enquanto o par está a iniciar.
 * 404 = sessão inexistente neste workspace (não confundir com “QR ainda não gerado”).
 */
export async function getWhatsAppSessionQrAction(
  sessionId: string
): Promise<SessionActionResult<WhatsAppQrPollPayload>> {
  const log = shouldLogWhatsAppQr()
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/qr`)
    const payload = parseWhatsAppQrPollPayload(raw)
    if (log) {
      const outcome =
        payload == null
          ? "malformed_response"
          : payload.qrReady
          ? "extracted"
          : payload.status === "disconnected"
          ? "pairing_failed"
          : payload.status === "banned"
          ? "session_banned"
          : "waiting_for_qr"
      console.log("[whatsapp-lite:qr]", {
        sessionId,
        outcome,
        qrReady: payload?.qrReady ?? false,
        status: payload?.status,
        qrPreviewLen: payload?.qrCode?.length ?? 0,
        summary: summarizeQrResponseForDebug(raw),
      })
    }
    if (!payload) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data: payload }
  } catch (e: unknown) {
    if (e instanceof HttpError && e.status === 404) {
      if (log) {
        console.log("[whatsapp-lite:qr]", {
          sessionId,
          outcome: "http_404",
          note: "session not found in workspace or wrong API path",
          httpStatus: 404,
        })
      }
      return { success: false, error: "Session not found" }
    }
    if (log) {
      console.log("[whatsapp-lite:qr]", {
        sessionId,
        outcome: "error",
        httpStatus: e instanceof HttpError ? e.status : undefined,
        message: e instanceof Error ? e.message : String(e),
      })
    }
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export type WhatsAppDisconnectDismissal = {
  sessionId: string
  lastDisconnectAt: string
}

export async function listWhatsAppDisconnectDismissalsAction(): Promise<
  SessionActionResult<WhatsAppDisconnectDismissal[]>
> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/disconnect-dismissals`)
    const data = pickData<WhatsAppDisconnectDismissal[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as WhatsAppDisconnectDismissal[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function dismissWhatsAppDisconnectBannerAction(input: {
  sessionId: string
  lastDisconnectAt: string
}): Promise<SessionActionResult<WhatsAppDisconnectDismissal>> {
  try {
    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(input.sessionId)}/disconnect-dismiss`,
      { lastDisconnectAt: input.lastDisconnectAt }
    )
    const data = pickData<WhatsAppDisconnectDismissal>(raw) ?? (raw as WhatsAppDisconnectDismissal)
    if (!data?.sessionId) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
