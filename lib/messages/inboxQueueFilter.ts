import type { ConversationSlaInfo } from "@/lib/whatsapp-lite/useConversationSla"
import { type ConversationReadState, isConversationNeedsResponse, isConversationUnread } from "./conversationUnread"

export type InboxQueueView = "all" | "unread" | "needs_response" | "sla"

export type InboxQueueViewRow = ConversationReadState

export function matchesInboxQueueView(
  row: InboxQueueViewRow,
  view: InboxQueueView,
  sla?: ConversationSlaInfo | null
): boolean {
  if (view === "all") return true
  if (view === "unread") return isConversationUnread(row)
  if (view === "needs_response") return isConversationNeedsResponse(row)
  if (view === "sla") return sla?.status === "warning" || sla?.status === "critical"
  return true
}

export type InboxQueueViewCounts = Record<InboxQueueView, number>

export const EMPTY_INBOX_QUEUE_COUNTS: InboxQueueViewCounts = {
  all: 0,
  unread: 0,
  needs_response: 0,
  sla: 0,
}

export function countInboxQueueViews(
  rows: Array<{ conv: InboxQueueViewRow; sla?: ConversationSlaInfo | null }>
): InboxQueueViewCounts {
  const counts: InboxQueueViewCounts = { all: rows.length, unread: 0, needs_response: 0, sla: 0 }
  for (const { conv, sla } of rows) {
    if (matchesInboxQueueView(conv, "unread", sla)) counts.unread += 1
    if (matchesInboxQueueView(conv, "needs_response", sla)) counts.needs_response += 1
    if (matchesInboxQueueView(conv, "sla", sla)) counts.sla += 1
  }
  return counts
}
