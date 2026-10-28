"use server"

import { pickData, pickMeta } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import { attendePlanCheck, attendeRecordOutbound } from "lib/attende/planGuard"
import type { IInstagramConversation, IInstagramMessage, InstagramWorkspaceTemplate, PaginatedMeta } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/instagram-lite`
}

export type IgConvActionOk<T> = { success: true; data: T; meta?: PaginatedMeta }
export type IgConvActionErr = { success: false; error: string }
export type IgConvActionResult<T> = IgConvActionOk<T> | IgConvActionErr

export async function listInstagramConversationsAction(
  sessionId: string,
  opts?: { limit?: number; offset?: number; search?: string }
): Promise<IgConvActionResult<IInstagramConversation[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/conversations`, {
      query: {
        ...(opts?.limit != null ? { limit: opts.limit } : {}),
        ...(opts?.offset != null ? { offset: opts.offset } : {}),
        ...(opts?.search?.trim() ? { search: opts.search.trim() } : {}),
      },
    })
    const data = pickData<IInstagramConversation[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listInstagramMessagesAction(
  sessionId: string,
  conversationId: string,
  opts?: { limit?: number; offset?: number }
): Promise<IgConvActionResult<IInstagramMessage[]>> {
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
    const data = pickData<IInstagramMessage[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export type SendInstagramMessageResult = {
  messages: IInstagramMessage[]
  /**
   * True when an attached image sent successfully but the separate caption
   * follow-up call failed -- the image is NOT lost in this case (that was a
   * real bug, fixed gateway-side), but the caption text itself didn't reach
   * Instagram and the caller should tell the user rather than silently
   * dropping it.
   */
  captionFailed: boolean
}

/**
 * An attachment send can produce TWO Instagram messages (image, then a
 * separate caption message) since Unipile silently drops the attachment when
 * a real caption is sent in the same request as the file -- see the
 * gateway's outbound send handler for the full reasoning. A text-only send
 * still returns a single-element `messages` array.
 */
export async function sendInstagramMessageAction(
  sessionId: string,
  conversationId: string,
  text?: string,
  formData?: FormData
): Promise<IgConvActionResult<SendInstagramMessageResult>> {
  // Attende plan: the trial caps sent messages and an ended plan sends nothing (JSYNQ keeps no Attende limits).
  const plan = await attendePlanCheck("outbound")
  if (!plan.ok) return { success: false, error: plan.message }
  try {
    const url = `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
      conversationId
    )}/messages`

    let raw: unknown
    if (formData) {
      if (text?.trim()) formData.append("text", text.trim())
      raw = await FetchClient.postData<unknown>(url, formData)
    } else {
      raw = await FetchClient.post<unknown>(url, { text })
    }

    const data = pickData<IInstagramMessage[]>(raw)
    const list = Array.isArray(data) ? data : []
    if (!list.length || !list[0]?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    const captionFailed =
      typeof raw === "object" && raw !== null && "captionFailed" in raw
        ? Boolean((raw as { captionFailed?: boolean }).captionFailed)
        : false
    await attendeRecordOutbound(list.length)
    return { success: true, data: { messages: list, captionFailed } }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function markInstagramConversationReadAction(
  sessionId: string,
  conversationId: string
): Promise<IgConvActionResult<{ conversationId: string; lastReadAt: string }>> {
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

export async function transitionInstagramConversationStateAction(
  conversationId: string,
  newState: string,
  reason?: string
): Promise<IgConvActionResult<{ success: boolean; previousState?: string; error?: string }>> {
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

export async function patchInstagramConversationAction(
  sessionId: string,
  conversationId: string,
  body: {
    linkedEntityType?: string | null
    linkedEntityId?: string | null
  }
): Promise<IgConvActionResult<IInstagramConversation>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}`,
      body
    )
    const data = pickData<IInstagramConversation>(raw) ?? (raw as IInstagramConversation)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function assignInstagramConversationAction(
  sessionId: string,
  conversationId: string,
  userId: string | null
): Promise<IgConvActionResult<IInstagramConversation>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}/assign`,
      { userId }
    )
    const data = pickData<IInstagramConversation>(raw)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function sendInstagramReactionAction(
  sessionId: string,
  conversationId: string,
  messageId: string,
  emoji: string
): Promise<IgConvActionResult<IInstagramMessage>> {
  try {
    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
        conversationId
      )}/messages/${encodeURIComponent(messageId)}/reaction`,
      { emoji }
    )
    const data = pickData<IInstagramMessage>(raw)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteInstagramConversationAction(
  sessionId: string,
  conversationId: string
): Promise<IgConvActionResult<{ id: string; deletedAt: string }>> {
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

export async function listInstagramWorkspaceTemplatesAction(): Promise<
  IgConvActionResult<InstagramWorkspaceTemplate[]>
> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/workspace-templates`)
    const data = pickData<InstagramWorkspaceTemplate[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as InstagramWorkspaceTemplate[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getCardInstagramConversationsAction(
  projectId: string,
  cardId: string
): Promise<IgConvActionResult<IInstagramConversation[]>> {
  try {
    const u = process.env.BACKEND_URL
    if (!u) throw new Error("BACKEND_URL is not defined")
    const raw = await FetchClient.get<unknown>(
      `${u}/projects/${encodeURIComponent(projectId)}/cards/${encodeURIComponent(cardId)}/instagram-conversations`
    )
    const data = pickData<IInstagramConversation[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
