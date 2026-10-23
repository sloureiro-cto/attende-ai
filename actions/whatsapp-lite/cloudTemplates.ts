"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type { WhatsAppCloudTemplate, WhatsAppCloudTemplateCategory } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/whatsapp-lite`
}

export type CloudTemplateActionOk<T> = { success: true; data: T }
export type CloudTemplateActionErr = { success: false; error: string }
export type CloudTemplateActionResult<T> = CloudTemplateActionOk<T> | CloudTemplateActionErr

export async function listCloudTemplatesAction(
  sessionId?: string
): Promise<CloudTemplateActionResult<WhatsAppCloudTemplate[]>> {
  try {
    const qs = sessionId && sessionId.trim() ? `?sessionId=${encodeURIComponent(sessionId.trim())}` : ""
    const raw = await FetchClient.get<unknown>(`${base()}/cloud-templates${qs}`)
    const data = pickData<WhatsAppCloudTemplate[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as WhatsAppCloudTemplate[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function syncCloudTemplatesAction(
  sessionId: string
): Promise<CloudTemplateActionResult<{ synced: number }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/cloud-templates/sync`, {
      sessionId,
    })
    const data = pickData<{ synced: number }>(raw) ?? (raw as { synced: number })
    return { success: true, data: data ?? { synced: 0 } }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function createCloudTemplateAction(input: {
  sessionId: string
  name: string
  language: string
  category: WhatsAppCloudTemplateCategory
  components: unknown[]
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
}): Promise<CloudTemplateActionResult<WhatsAppCloudTemplate>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/cloud-templates`, {
      sessionId: input.sessionId,
      name: input.name.trim(),
      language: input.language.trim(),
      category: input.category,
      components: input.components,
      varBindings: input.varBindings,
    })
    const data = pickData<WhatsAppCloudTemplate>(raw) ?? (raw as WhatsAppCloudTemplate)
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
 * Upload a sample media file for a media-header template and return the Meta
 * `header_handle` to embed in the HEADER component's `example`.
 */
export async function uploadCloudTemplateMediaHandleAction(
  formData: FormData
): Promise<CloudTemplateActionResult<{ handle: string }>> {
  const sessionId = formData.get("sessionId")?.toString() ?? ""
  const file = formData.get("file")
  if (!sessionId || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "sessionId and a file are required" }
  }
  try {
    const raw = await FetchClient.postData<unknown>(`${base()}/cloud-templates/media-handle`, formData)
    const data = pickData<{ handle: string }>(raw) ?? (raw as { handle: string })
    if (!data?.handle) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteCloudTemplateAction(input: {
  templateId: string
  sessionId: string
}): Promise<CloudTemplateActionResult<void>> {
  try {
    await FetchClient.delete<unknown>(
      `${base()}/cloud-templates/${encodeURIComponent(input.templateId)}?sessionId=${encodeURIComponent(
        input.sessionId
      )}`
    )
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function updateCloudTemplateVarBindingsAction(input: {
  templateId: string
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
}): Promise<CloudTemplateActionResult<WhatsAppCloudTemplate>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/cloud-templates/${encodeURIComponent(input.templateId)}/var-bindings`,
      { varBindings: input.varBindings ?? {} }
    )
    const data = pickData<WhatsAppCloudTemplate>(raw) ?? (raw as WhatsAppCloudTemplate)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
