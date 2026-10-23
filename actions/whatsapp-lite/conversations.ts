"use server"

import {
  inferWhatsAppMediaTypeFromFile,
  resolveWhatsAppFileMime,
} from "@/lib/whatsapp-lite/inferWhatsAppMediaTypeFromFile"
import {
  WHATSAPP_OUTBOUND_MEDIA_MAX_BYTES,
  WHATSAPP_OUTBOUND_MEDIA_MAX_MB,
} from "@/lib/whatsapp-lite/whatsappMediaLimits"
import { pickData, pickMeta } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import { normalizeWhatsAppPhoneInput } from "./phoneNormalize"
import type { ConversationTimelineEntry, PaginatedMeta, WhatsAppConversation, WhatsAppMessage } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/whatsapp-lite`
}

export type ConvActionOk<T> = { success: true; data: T; meta?: PaginatedMeta }
export type ConvActionErr = { success: false; error: string }
export type ConvActionResult<T> = ConvActionOk<T> | ConvActionErr

export async function listWhatsAppConversationsAction(
  sessionId: string,
  opts?: { limit?: number; offset?: number; search?: string; chatType?: "direct" | "group" }
): Promise<ConvActionResult<WhatsAppConversation[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}/conversations`, {
      query: {
        ...(opts?.limit != null ? { limit: opts.limit } : {}),
        ...(opts?.offset != null ? { offset: opts.offset } : {}),
        ...(opts?.search?.trim() ? { search: opts.search.trim() } : {}),
        ...(opts?.chatType ? { chatType: opts.chatType } : {}),
      },
    })
    const data = pickData<WhatsAppConversation[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listWhatsAppConversationsByLinkedEntityAction(
  linkedEntityId: string,
  opts?: { limit?: number; offset?: number }
): Promise<ConvActionResult<WhatsAppConversation[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/conversations`, {
      query: {
        linkedEntityId,
        ...(opts?.limit != null ? { limit: opts.limit } : {}),
        ...(opts?.offset != null ? { offset: opts.offset } : {}),
      },
    })
    const data = pickData<WhatsAppConversation[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listWhatsAppMessagesAction(
  sessionId: string,
  conversationId: string,
  opts?: { limit?: number; offset?: number }
): Promise<ConvActionResult<WhatsAppMessage[]>> {
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
    const data = pickData<WhatsAppMessage[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export type SendWhatsAppMessageResult = ConvActionResult<WhatsAppMessage> & {
  /** Execution ID when the backend triggered an agent as a result of this message. */
  executionId?: string
}

/** Cloud API only: send a Meta-approved template (required outside the 24h window). */
export async function sendWhatsAppTemplateAction(
  sessionId: string,
  conversationId: string,
  input: {
    templateName: string
    language: string
    components?: unknown[]
    bodyPreview?: string
  }
): Promise<ConvActionResult<WhatsAppMessage>> {
  try {
    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
        conversationId
      )}/template`,
      {
        templateName: input.templateName,
        language: input.language,
        ...(input.components ? { components: input.components } : {}),
        ...(input.bodyPreview ? { bodyPreview: input.bodyPreview } : {}),
      }
    )
    const data = pickData<WhatsAppMessage>(raw) ?? (raw as WhatsAppMessage)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function sendWhatsAppMessageAction(
  sessionId: string,
  conversationId: string,
  text: string,
  options?: { replyToWhatsAppMessageId?: string }
): Promise<SendWhatsAppMessageResult> {
  try {
    const body: Record<string, string> = { text }
    const replyId = options?.replyToWhatsAppMessageId?.trim()
    if (replyId) body.replyToWhatsAppMessageId = replyId

    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
        conversationId
      )}/messages`,
      body
    )
    const data = pickData<WhatsAppMessage>(raw) ?? (raw as WhatsAppMessage)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    const envelope = raw as Record<string, unknown> | undefined
    const executionId = typeof envelope?.executionId === "string" ? envelope.executionId.trim() || undefined : undefined
    return { success: true, data, executionId }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/**
 * Envia ou remove uma reação na mensagem (id de protocolo WhatsApp = `messageId` do documento).
 * `emoji: ""` remove a reação desta sessão na mensagem.
 */
export async function sendWhatsAppMessageReactionAction(
  sessionId: string,
  conversationId: string,
  whatsappMessageId: string,
  emoji: string
): Promise<ConvActionResult<WhatsAppMessage>> {
  try {
    const mid = whatsappMessageId.trim()
    if (!mid) {
      return { success: false, error: "Missing WhatsApp message id" }
    }
    const raw = await FetchClient.post<unknown>(
      [
        `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
          conversationId
        )}/messages`,
        encodeURIComponent(mid),
        "reaction",
      ].join("/"),
      { emoji: emoji ?? "" }
    )
    const data = pickData<WhatsAppMessage>(raw) ?? (raw as WhatsAppMessage)
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
 * Apaga para todos uma mensagem enviada por este número (WhatsApp por QR, até ~2 dias).
 * Devolve a linha atualizada (`deletedForEveryoneAt` preenchido, conteúdo limpo).
 */
export async function deleteWhatsAppMessageForEveryoneAction(
  sessionId: string,
  conversationId: string,
  whatsappMessageId: string
): Promise<ConvActionResult<WhatsAppMessage>> {
  try {
    const mid = whatsappMessageId.trim()
    if (!mid) return { success: false, error: "Missing WhatsApp message id" }
    const raw = await FetchClient.delete<unknown>(
      [
        `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
          conversationId
        )}/messages`,
        encodeURIComponent(mid),
      ].join("/")
    )
    const data = pickData<WhatsAppMessage>(raw) ?? (raw as WhatsAppMessage)
    if (!data?._id) return { success: false, error: "Invalid response from server" }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Limite do backend (memória) para uploads multipart nesta rota. */
const MAX_MEDIA_BYTES = WHATSAPP_OUTBOUND_MEDIA_MAX_BYTES

/**
 * Envia mensagem com ficheiro opcional (`multipart/form-data`).
 * Sem ficheiro, usa JSON `{ text }` (equivalente a `sendWhatsAppMessageAction`).
 *
 * Multipart (browser): `file` obrigatório; opcionais `caption` (legenda em mídia), `text`
 * (alternativa à legenda), `fileName` (nome em documentos), `mediaType` (`image` | `video` |
 * `audio` | `document` | `sticker`), `mimeType`, `voiceNote` / `ptt` (nota de voz).
 */
function parseMultipartBool(v: FormDataEntryValue | null): boolean | undefined {
  if (v == null || v === "") return undefined
  const s = String(v).toLowerCase().trim()
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true
  if (s === "false" || s === "0" || s === "no" || s === "off") return false
  return undefined
}

export async function sendWhatsAppConversationMessageFormAction(
  formData: FormData
): Promise<SendWhatsAppMessageResult> {
  const sessionId = formData.get("sessionId")?.toString() ?? ""
  const conversationId = formData.get("conversationId")?.toString() ?? ""
  const text = formData.get("text")?.toString()?.trim() ?? ""
  const caption = formData.get("caption")?.toString()?.trim() ?? ""
  const fileNameField = formData.get("fileName")?.toString()?.trim() ?? ""
  const mediaTypeField = formData.get("mediaType")?.toString()?.trim() ?? ""
  const mimeTypeField = formData.get("mimeType")?.toString()?.trim() ?? ""
  const voiceNoteField = parseMultipartBool(formData.get("voiceNote") ?? formData.get("ptt"))
  const replyToField = formData.get("replyToWhatsAppMessageId")?.toString()?.trim() ?? ""
  const file = formData.get("file")

  if (!sessionId || !conversationId) {
    return { success: false, error: "Missing session or conversation" }
  }

  const hasFile = file instanceof File && file.size > 0

  if (!hasFile) {
    if (!text) return { success: false, error: "Message is empty" }
    return sendWhatsAppMessageAction(sessionId, conversationId, text, {
      replyToWhatsAppMessageId: replyToField || undefined,
    })
  }

  if (file instanceof File && file.size > MAX_MEDIA_BYTES) {
    return {
      success: false,
      error: `File too large (max ${WHATSAPP_OUTBOUND_MEDIA_MAX_MB} MB)`,
    }
  }

  const outbound = new FormData()
  outbound.append("file", file as File)
  if (caption) {
    outbound.append("caption", caption)
  } else if (text) {
    outbound.append("text", text)
  }
  if (fileNameField) {
    outbound.append("fileName", fileNameField)
  }
  const mt = mediaTypeField || (file instanceof File ? inferWhatsAppMediaTypeFromFile(file) : "")
  if (mt) {
    outbound.append("mediaType", mt)
  }

  const resolvedMime =
    mimeTypeField || (file instanceof File ? resolveWhatsAppFileMime(file) : "") || "application/octet-stream"
  if (resolvedMime) {
    outbound.append("mimeType", resolvedMime)
  }

  if (voiceNoteField === true) {
    outbound.append("voiceNote", "true")
  } else if (voiceNoteField === false) {
    outbound.append("voiceNote", "false")
  }
  if (replyToField) {
    outbound.append("replyToWhatsAppMessageId", replyToField)
  }

  try {
    const raw = await FetchClient.postData<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(
        conversationId
      )}/messages`,
      outbound
    )
    const data = pickData<WhatsAppMessage>(raw) ?? (raw as WhatsAppMessage)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    const envelope = raw as Record<string, unknown> | undefined
    const executionId = typeof envelope?.executionId === "string" ? envelope.executionId.trim() || undefined : undefined
    return { success: true, data, executionId }
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      if (e.status === 415 || /multipart|content-type|unsupported/i.test(e.message)) {
        return {
          success: false,
          error:
            "The server rejected the upload. The API may still only accept JSON `{ text }` — see docs/WHATSAPP_LITE_BACKEND_AUDIT.md (multimedia).",
        }
      }
      return { success: false, error: e.message }
    }
    return { success: false, error: "something went wrong" }
  }
}

/** Inicia conversa outbound a partir do inbox (sem ligação CRM obrigatória). */
export async function createWhatsAppConversationAction(
  sessionId: string,
  input: { phone: string; contactName?: string }
): Promise<ConvActionResult<WhatsAppConversation>> {
  try {
    const phone = normalizeWhatsAppPhoneInput(input.phone)
    if (!phone) {
      return { success: false, error: "Phone is required" }
    }
    const body: Record<string, unknown> = { phone, phoneNumber: phone }
    const name = input.contactName?.trim()
    if (name) body.contactName = name

    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations`,
      body
    )
    const data = pickData<WhatsAppConversation>(raw) ?? (raw as WhatsAppConversation)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError && e.status === 404) {
      return {
        success: false,
        error:
          "Starting new chats is not available (404). Backend must implement POST …/sessions/:sessionId/conversations.",
      }
    }
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/**
 * Inicia conversa outbound e liga ao lead (CRM).
 * Requer no backend: `POST /whatsapp-lite/sessions/:sessionId/conversations`
 * com corpo típico `{ phone, linkedEntityType: "card", linkedEntityId }` (ou equivalente).
 */
export async function createWhatsAppConversationForLeadAction(
  sessionId: string,
  input: { phone: string; linkedEntityType?: string; linkedEntityId?: string }
): Promise<ConvActionResult<WhatsAppConversation>> {
  try {
    const phone = normalizeWhatsAppPhoneInput(input.phone)
    if (!phone) {
      return { success: false, error: "Phone is required" }
    }
    const body: Record<string, unknown> = {
      phone,
      phoneNumber: phone,
      linkedEntityType: input.linkedEntityType ?? "card",
    }
    if (input.linkedEntityId) body.linkedEntityId = input.linkedEntityId

    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations`,
      body
    )
    const data = pickData<WhatsAppConversation>(raw) ?? (raw as WhatsAppConversation)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError && e.status === 404) {
      return {
        success: false,
        error:
          "Starting new chats is not available (404). Backend must implement POST …/sessions/:sessionId/conversations.",
      }
    }
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export type PatchWhatsAppConversationInput = {
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  slashAssistEnabled?: boolean
  slashAssistAgentId?: string | null
}

export type DeleteWhatsAppConversationResult = {
  id: string
  deletedAt: string
}

/**
 * Soft-delete: `deletedAt` no documento; listagens normais excluem conversas apagadas.
 * `DELETE /whatsapp-lite/sessions/:sessionId/conversations/:id`
 */
export async function deleteWhatsAppConversationAction(
  sessionId: string,
  conversationId: string
): Promise<ConvActionResult<DeleteWhatsAppConversationResult>> {
  try {
    const raw = await FetchClient.delete<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}`
    )
    const data = pickData<DeleteWhatsAppConversationResult>(raw)
    if (!data?.id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function patchWhatsAppConversationAction(
  sessionId: string,
  conversationId: string,
  input: PatchWhatsAppConversationInput
): Promise<ConvActionResult<WhatsAppConversation>> {
  try {
    const body: Record<string, unknown> = {}
    if (Object.prototype.hasOwnProperty.call(input, "linkedEntityType")) {
      body.linkedEntityType = input.linkedEntityType
    }
    if (Object.prototype.hasOwnProperty.call(input, "linkedEntityId")) {
      body.linkedEntityId = input.linkedEntityId
    }
    if (Object.prototype.hasOwnProperty.call(input, "slashAssistEnabled")) {
      body.slashAssistEnabled = input.slashAssistEnabled
    }
    if (Object.prototype.hasOwnProperty.call(input, "slashAssistAgentId")) {
      body.slashAssistAgentId = input.slashAssistAgentId
    }
    const raw = await FetchClient.patch<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}`,
      body
    )
    const data = pickData<WhatsAppConversation>(raw) ?? (raw as WhatsAppConversation)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getCardWhatsappConversationsAction(
  projectId: string,
  cardId: string
): Promise<ConvActionResult<WhatsAppConversation[]>> {
  try {
    const u = process.env.BACKEND_URL
    if (!u) throw new Error("BACKEND_URL is not defined")
    const raw = await FetchClient.get<unknown>(
      `${u}/projects/${encodeURIComponent(projectId)}/cards/${encodeURIComponent(cardId)}/whatsapp-conversations`
    )
    const data = pickData<WhatsAppConversation[]>(raw)
    const list = Array.isArray(data) ? data : []
    return { success: true, data: list, meta: pickMeta(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function transitionConversationStateAction(
  conversationId: string,
  newState: string,
  reason?: string
): Promise<ConvActionResult<{ success: boolean; previousState?: string; error?: string }>> {
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

export async function getConversationTimelineAction(
  conversationId: string,
  opts?: { limit?: number }
): Promise<ConvActionResult<ConversationTimelineEntry[]>> {
  try {
    const raw = await FetchClient.get<unknown>(
      `${base()}/conversations/${encodeURIComponent(conversationId)}/timeline`,
      { query: { ...(opts?.limit != null ? { limit: opts.limit } : {}) } }
    )
    const data = pickData<ConversationTimelineEntry[]>(raw)
    return { success: true, data: Array.isArray(data) ? data : [] }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function markWhatsAppConversationReadAction(
  sessionId: string,
  conversationId: string
): Promise<ConvActionResult<{ conversationId: string; lastReadAt: string }>> {
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

export async function assignWhatsAppConversationAction(
  sessionId: string,
  conversationId: string,
  userId: string | null
): Promise<ConvActionResult<WhatsAppConversation>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}/assign`,
      { userId }
    )
    const data = pickData<WhatsAppConversation>(raw)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
