"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type { UnifiedMessageTemplate, WhatsAppMessage, WhatsAppWorkspaceTemplate } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/whatsapp-lite`
}

export type WorkspaceTemplateActionOk<T> = { success: true; data: T }
export type WorkspaceTemplateActionErr = { success: false; error: string }
export type WorkspaceTemplateActionResult<T> = WorkspaceTemplateActionOk<T> | WorkspaceTemplateActionErr

export type WorkspaceTemplatesPaginatedResult = {
  items: WhatsAppWorkspaceTemplate[]
  total: number
  page: number
  limit: number
}

function filterWorkspaceTemplatesClientSide(
  items: WhatsAppWorkspaceTemplate[],
  search?: string
): WhatsAppWorkspaceTemplate[] {
  const q = search?.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const name = item.name?.toLowerCase() ?? ""
    const body = item.body?.toLowerCase() ?? ""
    const shortcut = item.shortcut?.toLowerCase() ?? ""
    return name.includes(q) || body.includes(q) || shortcut.includes(q)
  })
}

function paginateWorkspaceTemplatesClientSide(
  items: WhatsAppWorkspaceTemplate[],
  page: number,
  limit: number
): WorkspaceTemplatesPaginatedResult {
  const safePage = Math.max(1, page)
  const safeLimit = Math.max(1, limit)
  const start = (safePage - 1) * safeLimit
  return {
    items: items.slice(start, start + safeLimit),
    total: items.length,
    page: safePage,
    limit: safeLimit,
  }
}

export async function listWorkspaceTemplatesPaginatedAction(input?: {
  search?: string
  page?: number
  limit?: number
  sessionId?: string
}): Promise<WorkspaceTemplateActionResult<WorkspaceTemplatesPaginatedResult>> {
  try {
    const page = Math.max(1, input?.page ?? 1)
    const limit = Math.max(1, input?.limit ?? 30)
    const qs = new URLSearchParams()
    qs.set("page", String(page))
    qs.set("limit", String(limit))
    if (input?.search?.trim()) qs.set("search", input.search.trim())
    if (input?.sessionId?.trim()) qs.set("sessionId", input.sessionId.trim())
    const raw = await FetchClient.get<unknown>(`${base()}/workspace-templates?${qs.toString()}`)
    const data = pickData<WorkspaceTemplatesPaginatedResult | WhatsAppWorkspaceTemplate[]>(raw)
    if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.items)) {
      return {
        success: true,
        data: {
          items: data.items,
          total: typeof data.total === "number" ? data.total : data.items.length,
          page: typeof data.page === "number" ? data.page : page,
          limit: typeof data.limit === "number" ? data.limit : limit,
        },
      }
    }
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as WhatsAppWorkspaceTemplate[]) : []
    const filtered = filterWorkspaceTemplatesClientSide(list, input?.search)
    return {
      success: true,
      data: paginateWorkspaceTemplatesClientSide(filtered, page, limit),
    }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listWorkspaceTemplatesAction(): Promise<
  WorkspaceTemplateActionResult<WhatsAppWorkspaceTemplate[]>
> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/workspace-templates`)
    const data = pickData<WhatsAppWorkspaceTemplate[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as WhatsAppWorkspaceTemplate[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function createWorkspaceTemplateAction(input: {
  name: string
  body: string
  shortcut?: string
  enabledSessionIds?: string[]
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
  attachments?: WhatsAppWorkspaceTemplate["attachments"]
}): Promise<WorkspaceTemplateActionResult<WhatsAppWorkspaceTemplate>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/workspace-templates`, {
      name: input.name.trim(),
      body: input.body,
      shortcut: input.shortcut?.trim() || undefined,
      enabledSessionIds: input.enabledSessionIds,
      varBindings: input.varBindings,
      attachments: input.attachments,
    })
    const data = pickData<WhatsAppWorkspaceTemplate>(raw) ?? (raw as WhatsAppWorkspaceTemplate)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function updateWorkspaceTemplateAction(input: {
  templateId: string
  name?: string
  body?: string
  shortcut?: string
  enabledSessionIds?: string[]
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
  attachments?: WhatsAppWorkspaceTemplate["attachments"]
}): Promise<WorkspaceTemplateActionResult<WhatsAppWorkspaceTemplate>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/workspace-templates/${encodeURIComponent(input.templateId)}`,
      {
        name: input.name?.trim(),
        body: input.body,
        shortcut: input.shortcut?.trim(),
        enabledSessionIds: input.enabledSessionIds,
        varBindings: input.varBindings,
        attachments: input.attachments,
      }
    )
    const data = pickData<WhatsAppWorkspaceTemplate>(raw) ?? (raw as WhatsAppWorkspaceTemplate)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteWorkspaceTemplateAction(templateId: string): Promise<WorkspaceTemplateActionResult<void>> {
  try {
    await FetchClient.delete<unknown>(`${base()}/workspace-templates/${encodeURIComponent(templateId)}`)
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Pre-fill `{{n}}` variables for a 1:1 conversation from its linked CRM card. */
export async function resolveTemplateVarsForConversationAction(input: {
  conversationId: string
  templateId: string
  source: "meta" | "workspace"
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
}): Promise<WorkspaceTemplateActionResult<Record<string, string>>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/resolve-template-vars`, {
      conversationId: input.conversationId,
      templateId: input.templateId,
      source: input.source,
      varBindings: input.varBindings,
    })
    const data = pickData<{ vars?: Record<string, string> }>(raw) ?? (raw as { vars?: Record<string, string> })
    return { success: true, data: data?.vars ?? {} }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Send a workspace Atalho (text + library attachments) into a conversation. */
export async function sendWorkspaceTemplateFromConversationAction(input: {
  sessionId: string
  conversationId: string
  templateId: string
  vars?: Record<string, string>
}): Promise<WorkspaceTemplateActionResult<WhatsAppMessage[]>> {
  try {
    const raw = await FetchClient.post<unknown>(
      `${base()}/sessions/${encodeURIComponent(input.sessionId)}/conversations/${encodeURIComponent(
        input.conversationId
      )}/send-workspace-template`,
      {
        templateId: input.templateId,
        vars: input.vars,
      }
    )
    const data = pickData<WhatsAppMessage[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as WhatsAppMessage[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Unified listing for a session: Meta APPROVED for Cloud API, workspace snippets for Baileys. */
export async function listMessageTemplatesForSessionAction(
  sessionId: string
): Promise<WorkspaceTemplateActionResult<UnifiedMessageTemplate[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/message-templates?sessionId=${encodeURIComponent(sessionId)}`)
    const data = pickData<UnifiedMessageTemplate[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as UnifiedMessageTemplate[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
