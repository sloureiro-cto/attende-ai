"use server"

import { transitionInstagramConversationStateAction } from "actions/instagram-lite/conversations"
import {
  listInstagramMessagesAction,
  markInstagramConversationReadAction,
  sendInstagramMessageAction,
} from "actions/instagram-lite/conversations"
import { getInboxOverviewAction, listInboxConversationsAction } from "actions/messaging/inbox"
import {
  listSmsMessagesAction,
  markSmsConversationReadAction,
  sendSmsMessageAction,
  transitionSmsConversationStateAction,
} from "actions/sms-lite/conversations"
import {
  listWhatsAppMessagesAction,
  markWhatsAppConversationReadAction,
  sendWhatsAppMessageAction,
  transitionConversationStateAction,
} from "actions/whatsapp-lite/conversations"
import { auth } from "auth"
import { buildInboxQuery, handlingErrorOf, type HandlingMode, type InboxChannel, type InboxFilters, type InboxItem, type ThreadMessage, toInboxItem, toThreadMessage } from "./model"

export type InboxResult<T> = { success: true; data: T } | { success: false; error: string }

const THREAD_PAGE = 50

/** The workspace always comes from the session, never from the client. */
async function workspaceIdOrNull(): Promise<string | null> {
  const session = await auth()
  return session?.user?.workspaceId ?? null
}

const ok = <T>(data: T): InboxResult<T> => ({ success: true, data })
const fail = <T = never>(error: string): InboxResult<T> => ({ success: false, error })

export type InboxPage = { items: InboxItem[]; nextCursor: string | null; hasMore: boolean }

export async function loadInboxPageAction(filters: InboxFilters, cursor?: string | null): Promise<InboxResult<InboxPage>> {
  const workspaceId = await workspaceIdOrNull()
  if (!workspaceId) return fail("no workspace")
  const res = await listInboxConversationsAction(workspaceId, buildInboxQuery(filters, cursor))
  if (!res.success) return fail(res.error)
  return ok({
    items: res.data.map(toInboxItem),
    nextCursor: res.meta?.nextCursor ?? null,
    hasMore: res.meta?.hasMore ?? false,
  })
}

/** Deep link: the list endpoint returns the single conversation (subject to ACL) for `conversationId`. */
export async function loadInboxItemAction(conversationId: string): Promise<InboxResult<InboxItem | null>> {
  const workspaceId = await workspaceIdOrNull()
  if (!workspaceId) return fail("no workspace")
  if (!/^[a-f0-9]{24}$/i.test(conversationId)) return ok(null)
  const res = await listInboxConversationsAction(workspaceId, { conversationId, limit: "1" })
  if (!res.success) return fail(res.error)
  const row = res.data.find((r) => String(r.conversation._id) === conversationId)
  return ok(row ? toInboxItem(row) : null)
}

export type InboxOverviewData = {
  unread: number
  needsReply: number
  /** columnId -> title, to show the funnel stage by name. */
  stageTitles: Record<string, string>
}

export async function loadInboxOverviewAction(): Promise<InboxResult<InboxOverviewData>> {
  const workspaceId = await workspaceIdOrNull()
  if (!workspaceId) return fail("no workspace")
  const res = await getInboxOverviewAction(workspaceId)
  if (!res.success) return fail(res.error)
  const stageTitles: Record<string, string> = {}
  for (const project of res.data.crmProjects) for (const column of project.columns) stageTitles[column.id] = column.title
  return ok({ unread: res.data.queueCounts.unread, needsReply: res.data.queueCounts.needs_response, stageTitles })
}

export type ThreadPage = { messages: ThreadMessage[]; hasMore: boolean }

/** `offset` counts messages from the newest; the page is returned oldest-first for display. */
export async function loadThreadAction(
  channel: InboxChannel,
  sessionId: string,
  conversationId: string,
  offset = 0
): Promise<InboxResult<ThreadPage>> {
  const opts = { limit: THREAD_PAGE, offset }
  if (channel === "whatsapp") {
    const res = await listWhatsAppMessagesAction(sessionId, conversationId, opts)
    if (!res.success) return fail(res.error)
    return ok({ messages: res.data.map(toThreadMessage).reverse(), hasMore: res.data.length >= THREAD_PAGE })
  }
  if (channel === "sms") {
    const res = await listSmsMessagesAction(sessionId, conversationId, opts)
    if (!res.success) return fail(res.error)
    return ok({ messages: res.data.map(toThreadMessage).reverse(), hasMore: res.data.length >= THREAD_PAGE })
  }
  const res = await listInstagramMessagesAction(sessionId, conversationId, opts)
  if (!res.success) return fail(res.error)
  return ok({ messages: res.data.map(toThreadMessage).reverse(), hasMore: res.data.length >= THREAD_PAGE })
}

export async function sendMessageAction(
  channel: InboxChannel,
  sessionId: string,
  conversationId: string,
  text: string
): Promise<InboxResult<ThreadMessage>> {
  const body = text.trim()
  if (!body) return fail("empty message")
  if (channel === "whatsapp") {
    const res = await sendWhatsAppMessageAction(sessionId, conversationId, body)
    return res.success ? ok(toThreadMessage(res.data)) : fail(res.error)
  }
  if (channel === "sms") {
    const res = await sendSmsMessageAction(sessionId, conversationId, body)
    return res.success ? ok(toThreadMessage(res.data)) : fail(res.error)
  }
  const res = await sendInstagramMessageAction(sessionId, conversationId, body)
  if (!res.success) return fail(res.error)
  const first = res.data.messages[0]
  return first ? ok(toThreadMessage(first)) : fail("Invalid response from server")
}

export async function markReadAction(channel: InboxChannel, sessionId: string, conversationId: string): Promise<InboxResult<true>> {
  const res =
    channel === "whatsapp"
      ? await markWhatsAppConversationReadAction(sessionId, conversationId)
      : channel === "sms"
        ? await markSmsConversationReadAction(sessionId, conversationId)
        : await markInstagramConversationReadAction(sessionId, conversationId)
  return res.success ? ok(true) : fail(res.error)
}

/**
 * Take over = the conversation goes to `human_handoff`: the agent dispatcher skips it (same rule the backend uses when
 * an agent is removed from a conversation). Return to AI = back to `qualifying`, the phase the agent resumes from.
 * Both are transitions of the conversation state machine; the API only asks for access to the conversation.
 * The error is a {@link HandlingError} code.
 */
export async function setHandlingAction(
  channel: InboxChannel,
  conversationId: string,
  mode: Exclude<HandlingMode, "none">
): Promise<InboxResult<true>> {
  const newState = mode === "human" ? "human_handoff" : "qualifying"
  const reason = mode === "human" ? "Taken over from the Attende-ai inbox" : "Returned to the AI from the Attende-ai inbox"
  const res =
    channel === "whatsapp"
      ? await transitionConversationStateAction(conversationId, newState, reason)
      : channel === "sms"
        ? await transitionSmsConversationStateAction(conversationId, newState, reason)
        : await transitionInstagramConversationStateAction(conversationId, newState, reason)
  if (!res.success) return fail(handlingErrorOf(res.error))
  if (res.data.success === false) return fail(handlingErrorOf(res.data.error ?? "transition rejected"))
  return ok(true)
}
