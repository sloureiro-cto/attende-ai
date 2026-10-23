"use server"

import {
  inboxConversationsPath,
  type InboxOverview,
  inboxOverviewPath,
  type InboxUnifiedListMeta,
  type InboxUnifiedListRow,
  parseInboxOverview,
  parseInboxUnifiedList,
} from "@/lib/messages/inboxUnifiedClient"
import { FetchClient, HttpError } from "lib/api"

export type InboxActionOk<T> = { success: true; data: T; meta?: InboxUnifiedListMeta }
export type InboxActionErr = { success: false; error: string }
export type InboxActionResult<T> = InboxActionOk<T> | InboxActionErr

function workspaceInboxUrl(path: string): string {
  const base = process.env.BACKEND_URL
  if (!base) throw new Error("BACKEND_URL is not defined")
  return `${base}${path}`
}

export async function listInboxConversationsAction(
  workspaceId: string,
  query?: Record<string, string>
): Promise<InboxActionResult<InboxUnifiedListRow[]>> {
  try {
    const raw = await FetchClient.get<unknown>(workspaceInboxUrl(inboxConversationsPath(workspaceId)), {
      query,
    })
    const parsed = parseInboxUnifiedList(raw)
    return { success: true, data: parsed.data, meta: parsed.meta }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getInboxOverviewAction(
  workspaceId: string,
  query?: Record<string, string>
): Promise<InboxActionResult<InboxOverview>> {
  try {
    const raw = await FetchClient.get<unknown>(workspaceInboxUrl(inboxOverviewPath(workspaceId)), { query })
    return { success: true, data: parseInboxOverview(raw) }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
