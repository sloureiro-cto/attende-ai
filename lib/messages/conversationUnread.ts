import { type InboxUnreadChannel, inboxUnreadKey } from "./inboxUnreadStorage"

export type ConversationReadState = {
  lastInboundAt?: string | null
  lastOutboundAt?: string | null
  lastReadAt?: string | null
  /** When the latest message is ours, the thread is not waiting on the team. */
  lastMessageDirection?: "inbound" | "outbound" | null
}

/** Shared workspace unread: inbound after lastReadAt (or any inbound when never read). */
export function isConversationUnread(conv: ConversationReadState): boolean {
  if (conv.lastMessageDirection === "outbound") return false
  if (!conv.lastInboundAt) return false

  const inboundTs = new Date(conv.lastInboundAt).getTime()
  if (conv.lastOutboundAt) {
    const outboundTs = new Date(conv.lastOutboundAt).getTime()
    if (outboundTs >= inboundTs) return false
  }

  if (!conv.lastReadAt) return true
  return inboundTs > new Date(conv.lastReadAt).getTime()
}

/**
 * Thread is waiting on the team: latest substantive message is inbound and not yet answered.
 * Unlike {@link isConversationUnread}, opening/reading the thread does not clear this state.
 */
export function isConversationNeedsResponse(conv: ConversationReadState): boolean {
  if (conv.lastMessageDirection === "outbound") return false
  if (!conv.lastInboundAt) return false

  const inboundTs = new Date(conv.lastInboundAt).getTime()
  if (conv.lastOutboundAt) {
    const outboundTs = new Date(conv.lastOutboundAt).getTime()
    if (outboundTs >= inboundTs) return false
  }

  return true
}

export function unreadCountFromConversation(conv: ConversationReadState): number {
  return isConversationUnread(conv) ? 1 : 0
}

export function buildUnreadMapFromRows(
  rows: Array<{
    channel: InboxUnreadChannel
    sessionId: string
    conversationId: string
    lastInboundAt?: string | null
    lastOutboundAt?: string | null
    lastReadAt?: string | null
    lastMessageDirection?: "inbound" | "outbound" | null
  }>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const count = unreadCountFromConversation(row)
    if (count <= 0) continue
    const key = inboxUnreadKey(row.channel, row.sessionId, row.conversationId)
    out[key] = count
  }
  return out
}
