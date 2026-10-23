"use server"

import type { AccessControlList } from "app/_types/IAccessEntry"
import { FetchClient, HttpError } from "lib/api"
import type { WhatsAppSessionAccessScope } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/whatsapp-lite`
}

type Result<T> = { success: true; data: T } | { success: false; error: string }

/** Next.js 14 caches GET fetch inside server actions. ACL reads must not. */
const fresh = { cache: "no-store" as const }

export async function getSessionAccessAction(
  sessionId: string
): Promise<Result<{ accessScope: WhatsAppSessionAccessScope; accessEntries: AccessControlList[] }>> {
  try {
    const raw = await FetchClient.get<{
      success: boolean
      data: { accessScope: WhatsAppSessionAccessScope; accessEntries: AccessControlList[] }
    }>(`${base()}/sessions/${encodeURIComponent(sessionId)}/access`, fresh)
    return { success: true, data: raw.data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "Failed to get session access" }
  }
}

export async function updateSessionAccessAction(
  sessionId: string,
  payload: {
    accessScope?: WhatsAppSessionAccessScope
    accessEntries?: Array<{
      _id?: string
      subjectType: string
      subjectId: string
      alias: string
    }>
  }
): Promise<Result<unknown>> {
  try {
    const raw = await FetchClient.put<{ success: boolean; data: unknown }>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/access`,
      payload,
      fresh
    )
    return { success: true, data: raw.data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "Failed to update session access" }
  }
}

export async function createSessionAccessEntryAction(
  sessionId: string,
  entry: {
    subjectType: string
    subjectId: string
    alias: string
    conversationScope?: string
  }
): Promise<Result<AccessControlList>> {
  try {
    const raw = await FetchClient.post<{ success: boolean; data: AccessControlList }>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/access/entries`,
      entry,
      fresh
    )
    return { success: true, data: raw.data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "Failed to create access entry" }
  }
}

export async function updateSessionAccessEntryAction(
  sessionId: string,
  entryId: string,
  payload: { alias: string; conversationScope?: string }
): Promise<Result<AccessControlList>> {
  try {
    const raw = await FetchClient.patch<{ success: boolean; data: AccessControlList }>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/access/entries/${encodeURIComponent(entryId)}`,
      payload,
      fresh
    )
    if (!raw?.data) return { success: false, error: "Failed to update access entry" }
    return { success: true, data: raw.data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "Failed to update access entry" }
  }
}

export async function removeSessionAccessEntryAction(
  sessionId: string,
  entryId: string
): Promise<Result<{ removed: boolean }>> {
  try {
    const raw = await FetchClient.delete<{ success: boolean; data: { removed: boolean } }>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/access/entries/${encodeURIComponent(entryId)}`,
      fresh
    )
    return { success: true, data: raw.data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "Failed to remove access entry" }
  }
}

export async function updateSessionAccessScopeAction(
  sessionId: string,
  accessScope: WhatsAppSessionAccessScope
): Promise<Result<unknown>> {
  try {
    const raw = await FetchClient.patch<{ success: boolean; data: unknown }>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/access/scope`,
      { accessScope },
      fresh
    )
    if (!raw?.data) return { success: false, error: "Failed to update access scope" }
    return { success: true, data: raw.data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "Failed to update access scope" }
  }
}
