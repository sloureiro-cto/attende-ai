"use server"

import { pickData, pickMeta } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import { attendePlanCheck, attendeRecordOutbound } from "lib/attende/planGuard"
import type { ISmsConversation, ISmsMessage, PaginatedMeta } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/sms-lite`
}

export type SmsConvActionOk<T> = { success: true; data: T; meta?: PaginatedMeta }
export type SmsConvActionErr = { success: false; error: string }
export type SmsConvActionResult<T> = SmsConvActionOk<T> | SmsConvActionErr

export async function listSmsConversationsAction(
  sessionId: string,
  opts?: { limit?: number; offset?: number; search?: string }
): Promise<SmsConvActionResult<ISmsConversation[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/conversations`, {
      query: {
        ...(opts?.limit != null ? { limit: opts.limit } : {}),
        ...(opts?.offset != null ? { offset: opts.offset } : {}),
        ...(opts?.search?.trim() ? { search: opts.search.trim() } : {}),
      },
    })
    const data = pickData<ISmsConversation[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function createSmsConversationAction(
  sessionId: string,
  input: { phone: string; contactName?: string }
): Promise<SmsConvActionResult<ISmsConversation>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/conversations`, {
      phone: input.phone.trim(),
      contactName: input.contactName?.trim(),
    })
    const data = pickData<ISmsConversation>(raw) ?? (raw as ISmsConversation)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteSmsConversationAction(
  sessionId: string,
  conversationId: string
): Promise<SmsConvActionResult<{ id: string; deletedAt: string }>> {
  try {
    const raw = await FetchClient.delete<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}`
    )
    const data = pickData<{ id: string; deletedAt: string }>(raw)
    if (!data?.id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listSmsMessagesAction(
  sessionId: string,
  conversationId: string,
  opts?: { limit?: number; offset?: number }
): Promise<SmsConvActionResult<ISmsMessage[]>> {
  try {
    const raw = await FetchClient.get<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
        conversationId
      )}/messages`,
      {
        query: {
          ...(opts?.limit != null ? { limit: opts.limit } : {}),
          ...(opts?.offset != null ? { offset: opts.offset } : {}),
        },
      }
    )
    const data = pickData<ISmsMessage[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function patchSmsConversationAction(
  sessionId: string,
  conversationId: string,
  body: {
    linkedEntityType?: string | null
    linkedEntityId?: string | null
  }
): Promise<SmsConvActionResult<ISmsConversation>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}`,
      body
    )
    const data = pickData<ISmsConversation>(raw) ?? (raw as ISmsConversation)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function sendSmsMessageAction(
  sessionId: string,
  conversationId: string,
  text: string,
  opts?: { replyToProviderMessageId?: string }
): Promise<SmsConvActionResult<ISmsMessage>> {
  // Attende plan: the trial caps sent messages and an ended plan sends nothing (JSYNQ keeps no Attende limits).
  const plan = await attendePlanCheck("outbound")
  if (!plan.ok) return { success: false, error: plan.message }
  try {
    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
        conversationId
      )}/messages`,
      {
        text,
        ...(opts?.replyToProviderMessageId?.trim()
          ? { replyToProviderMessageId: opts.replyToProviderMessageId.trim() }
          : {}),
      }
    )
    const data = pickData<ISmsMessage>(raw) ?? (raw as ISmsMessage)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    await attendeRecordOutbound()
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getSmsConversationStateAction(
  conversationId: string
): Promise<SmsConvActionResult<{ state: string; changedAt?: string; assignedUserId?: string | null }>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/conversations/${encodeURIComponent(conversationId)}/state`)
    const data = pickData<{ state: string; changedAt?: string; assignedUserId?: string | null }>(raw)
    return { success: true, data: data ?? { state: "new_lead" } }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function transitionSmsConversationStateAction(
  conversationId: string,
  newState: string,
  reason?: string
): Promise<SmsConvActionResult<{ success: boolean; previousState?: string; error?: string }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/conversations/${encodeURIComponent(conversationId)}/state`, {
      newState,
      reason,
    })
    const data = pickData<{ success: boolean; previousState?: string; error?: string }>(raw)
    return { success: true, data: data ?? { success: true } }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getSmsConversationTimelineAction(
  conversationId: string,
  limit = 100
): Promise<SmsConvActionResult<any[]>> {
  try {
    const raw = await FetchClient.get<unknown>(
      `${base()}/conversations/${encodeURIComponent(conversationId)}/timeline?limit=${limit}`
    )
    const data = pickData<any[]>(raw)
    const entries = Array.isArray(data) ? data : []
    return { success: true, data: entries }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function markSmsConversationReadAction(
  sessionId: string,
  conversationId: string
): Promise<SmsConvActionResult<{ conversationId: string; lastReadAt: string }>> {
  try {
    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
        conversationId
      )}/mark-read`,
      {}
    )
    const data = pickData<{ conversationId: string; lastReadAt: string }>(raw)
    if (!data?.conversationId || !data?.lastReadAt) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function assignSmsConversationAction(
  sessionId: string,
  conversationId: string,
  userId: string | null
): Promise<SmsConvActionResult<ISmsConversation>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}/assign`,
      { userId }
    )
    const data = pickData<ISmsConversation>(raw)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getCardSmsConversationsAction(
  projectId: string,
  cardId: string
): Promise<SmsConvActionResult<ISmsConversation[]>> {
  try {
    const u = process.env.BACKEND_URL
    if (!u) throw new Error("BACKEND_URL is not defined")
    const raw = await FetchClient.get<unknown>(
      `${u}/projects/${encodeURIComponent(projectId)}/cards/${encodeURIComponent(cardId)}/sms-conversations`
    )
    const data = pickData<ISmsConversation[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
