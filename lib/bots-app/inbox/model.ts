import type { IInstagramConversation, IInstagramMessage } from "actions/instagram-lite/types"
import type { ISmsConversation, ISmsMessage } from "actions/sms-lite/types"
import type { WhatsAppConversation, WhatsAppMessage } from "actions/whatsapp-lite/types"
import {
  type InboxUnifiedChannel,
  type InboxUnifiedListRow,
  inboxUnifiedRowKey,
} from "lib/messages/inboxUnifiedClient"

export type InboxChannel = InboxUnifiedChannel
export type InboxFilter = "all" | "unread" | "needs_reply" | "ai" | "human"
export type InboxFilters = { filter: InboxFilter; channel: InboxChannel | "all"; search: string }
export const DEFAULT_INBOX_FILTERS: InboxFilters = { filter: "all", channel: "all", search: "" }

/**
 * Who answers the customer, as far as the API can tell (there is no "AI paused" state and no "reply in progress" signal):
 * - `ai`: an AI agent's binding covers the conversation and its phase lets the agent answer ("IA ativa").
 * - `human`: the conversation is in `human_handoff`, the agent skips it ("Atendimento humano").
 * - `none`: no agent covers it, or its phase (`blocked`) stops the agent ("Sem IA").
 */
export type HandlingMode = "ai" | "human" | "none"

export type InboxLabel = { id: string; text: string; color?: string }

/** One row of the conversation list, normalised across the three channels. */
export type InboxItem = {
  key: string
  channel: InboxChannel
  sessionId: string
  sessionLabel: string
  conversationId: string
  name: string | null
  phone: string | null
  username: string | null
  avatarUrl: string | null
  preview: string | null
  /** ISO of the last message (any direction). */
  lastAt: string | null
  lastDirection: "inbound" | "outbound" | null
  lastInboundAt: string | null
  unread: boolean
  handling: HandlingMode
  agentName: string | null
  state: string | null
  assignedUserName: string | null
  crmProjectId: string | null
  crmColumnId: string | null
  crmTitle: string | null
  linkedCardId: string | null
  labels: InboxLabel[]
  isGroup: boolean
}

type AnyConversation = WhatsAppConversation | ISmsConversation | IInstagramConversation

const HUMAN_STATES = ["human_handoff"]
/** Phases in which the agent dispatcher never answers, even with a bound agent (besides `human_handoff`). */
const AI_SKIPPED_STATES = ["blocked"]
/** States where an AI agent may be answering (everything that is still an open sales conversation). */
export const AI_STATES = ["new_lead", "qualifying", "waiting_response", "negotiating", "followup"]

function toTime(value: string | null | undefined): number | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isFinite(t) ? t : null
}

/**
 * Unread = the customer's last message has no reply yet (from the team or the AI) and nobody opened the conversation
 * after it (the read cursor is shared by the team). Same rule as the server's `unread` queue.
 */
export function isUnread(c: {
  lastMessageDirection?: "inbound" | "outbound" | null
  lastInboundAt?: string | null
  lastOutboundAt?: string | null
  lastReadAt?: string | null
}): boolean {
  if (c.lastMessageDirection === "outbound") return false
  const inbound = toTime(c.lastInboundAt)
  if (inbound == null) return false
  const outbound = toTime(c.lastOutboundAt)
  if (outbound != null && outbound >= inbound) return false
  const read = toTime(c.lastReadAt)
  return read == null || read < inbound
}

export function handlingOf(state: string | null | undefined, activeAgent: { name: string } | null | undefined): HandlingMode {
  if (state && HUMAN_STATES.includes(state)) return "human"
  if (state && AI_SKIPPED_STATES.includes(state)) return "none"
  if (activeAgent) return "ai"
  return "none"
}

export function toInboxItem(row: InboxUnifiedListRow): InboxItem {
  const c = row.conversation as AnyConversation & Record<string, unknown>
  const wa = row.channel === "whatsapp" ? (row.conversation as WhatsAppConversation) : null
  const sms = row.channel === "sms" ? (row.conversation as ISmsConversation) : null
  const ig = row.channel === "instagram" ? (row.conversation as IInstagramConversation) : null
  const state = (c.conversationState as string | null | undefined) ?? null
  const activeAgent = (c.activeAgent as { name: string } | null | undefined) ?? null
  const lastDirection = (c.lastMessageDirection as "inbound" | "outbound" | null | undefined) ?? null
  const lastInboundAt = (c.lastInboundAt as string | null | undefined) ?? null
  return {
    key: inboxUnifiedRowKey(row),
    channel: row.channel,
    sessionId: row.sessionId,
    sessionLabel: row.sessionLabel,
    conversationId: String(c._id),
    name: (wa?.contactName ?? sms?.contactName ?? ig?.displayName ?? null) || null,
    phone: (wa?.contactPhone ?? sms?.contactPhone ?? null) || null,
    username: ig?.attendeeUsername ?? null,
    avatarUrl: wa?.contactAvatarUrl ?? ig?.profilePictureUrl ?? null,
    preview: (c.lastMessagePreview as string | null | undefined) ?? null,
    lastAt: (c.lastMessageAt as string | null | undefined) ?? lastInboundAt,
    lastDirection,
    lastInboundAt,
    unread: isUnread({
      lastMessageDirection: lastDirection,
      lastInboundAt,
      lastOutboundAt: (c.lastOutboundAt as string | null | undefined) ?? null,
      lastReadAt: (c.lastReadAt as string | null | undefined) ?? null,
    }),
    handling: handlingOf(state, activeAgent),
    agentName: activeAgent?.name ?? null,
    state,
    assignedUserName: (c.assignedUser as { name?: string } | null | undefined)?.name ?? null,
    crmProjectId: (c.crmProjectId as string | null | undefined) ?? null,
    crmColumnId: (c.crmColumnId as string | null | undefined) ?? null,
    crmTitle: (c.crmDisplayName as string | null | undefined) ?? null,
    linkedCardId:
      (c.linkedEntityType as string | null | undefined) === "card" ? ((c.linkedEntityId as string | undefined) ?? null) : null,
    labels: ((c.crmLabels as Array<{ _id: string; text: string; color?: string }> | undefined) ?? []).map((l) => ({
      id: l._id,
      text: l.text,
      color: l.color,
    })),
    isGroup: Boolean(wa?.isGroup),
  }
}

export function displayNameOf(item: Pick<InboxItem, "name" | "phone" | "username">): string | null {
  return item.name?.trim() || item.phone || (item.username ? `@${item.username}` : null)
}

/** Query for the unified inbox endpoint (server-side filters; `ai`/`human` map to conversation states). */
export function buildInboxQuery(filters: InboxFilters, cursor?: string | null, limit = 30): Record<string, string> {
  const q: Record<string, string> = { limit: String(limit) }
  if (filters.channel !== "all") q.channel = filters.channel
  const search = filters.search.trim()
  if (search) q.search = search
  if (filters.filter === "unread") q.queueView = "unread"
  else if (filters.filter === "needs_reply") q.queueView = "needs_response"
  else if (filters.filter === "human") q.conversationState = HUMAN_STATES.join(",")
  else if (filters.filter === "ai") q.conversationState = AI_STATES.join(",")
  if (cursor) q.cursor = cursor
  return q
}

const FILTER_IDS: InboxFilter[] = ["all", "unread", "needs_reply", "ai", "human"]
const CHANNEL_IDS: InboxChannel[] = ["whatsapp", "sms", "instagram"]

type SearchParamsLike = Record<string, string | string[] | undefined>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * Filters from the URL (`?filter=all|unread|needs_reply|ai|human`, `?channel=whatsapp|sms|instagram`). Unknown values
 * fall back to the defaults. On a conversation URL `channel` names that conversation's channel, so it is ignored there.
 */
export function filtersFromSearchParams(params: SearchParamsLike | null | undefined, opts: { readChannel?: boolean } = {}): InboxFilters {
  const filter = first(params?.filter)
  const channel = opts.readChannel === false ? undefined : first(params?.channel)
  return {
    ...DEFAULT_INBOX_FILTERS,
    filter: FILTER_IDS.includes(filter as InboxFilter) ? (filter as InboxFilter) : "all",
    channel: CHANNEL_IDS.includes(channel as InboxChannel) ? (channel as InboxChannel) : "all",
  }
}

/** URL of the inbox for the current filters and open conversation (search is not kept in the URL). */
export function inboxUrl(filters: InboxFilters, open: Pick<InboxItem, "conversationId" | "channel" | "sessionId"> | null): string {
  const q = new URLSearchParams()
  if (open) {
    q.set("channel", open.channel)
    q.set("sessionId", open.sessionId)
  } else if (filters.channel !== "all") {
    q.set("channel", filters.channel)
  }
  if (filters.filter !== "all") q.set("filter", filters.filter)
  const query = q.toString()
  const path = open ? `/inbox/${encodeURIComponent(open.conversationId)}` : "/inbox"
  return query ? `${path}?${query}` : path
}

export function filtersAreDefault(filters: InboxFilters): boolean {
  return filters.filter === "all" && filters.channel === "all" && filters.search.trim() === ""
}

/** Append a page, keeping the first occurrence of each conversation (cursor pages can overlap on live data). */
export function mergeInboxPage(current: InboxItem[], page: InboxItem[]): InboxItem[] {
  const seen = new Set(current.map((i) => i.key))
  return [...current, ...page.filter((i) => !seen.has(i.key))]
}

export function sortByRecent(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => (toTime(b.lastAt) ?? 0) - (toTime(a.lastAt) ?? 0))
}

export type NewInboundPatch = {
  conversationId: string
  lastInboundAt: string
  lastMessageAt?: string
  lastMessagePreview?: string | null
  lastMessageDirection?: "inbound" | "outbound"
  displayName?: string
}

/** A new inbound message arrived: bump the row to the top and mark it unread (unless it is the open one). */
export function applyNewInbound(items: InboxItem[], patch: NewInboundPatch, openKey: string | null): InboxItem[] {
  const index = items.findIndex((i) => i.conversationId === patch.conversationId)
  if (index < 0) return items
  const row = items[index]!
  const next: InboxItem = {
    ...row,
    preview: patch.lastMessagePreview ?? row.preview,
    lastAt: patch.lastMessageAt ?? patch.lastInboundAt,
    lastInboundAt: patch.lastInboundAt,
    lastDirection: patch.lastMessageDirection ?? "inbound",
    unread: row.key === openKey ? false : true,
    name: row.name ?? patch.displayName ?? null,
  }
  return [next, ...items.slice(0, index), ...items.slice(index + 1)]
}

export type LastMessagePatch = {
  conversationId: string
  lastMessagePreview?: string | null
  lastMessageDirection?: "inbound" | "outbound"
  lastMessageAt?: string
}

export function applyLastMessage(items: InboxItem[], patch: LastMessagePatch): InboxItem[] {
  return items.map((i) =>
    i.conversationId === patch.conversationId
      ? {
          ...i,
          preview: patch.lastMessagePreview ?? i.preview,
          lastDirection: patch.lastMessageDirection ?? i.lastDirection,
          lastAt: patch.lastMessageAt ?? i.lastAt,
          unread: patch.lastMessageDirection === "outbound" ? false : i.unread,
        }
      : i
  )
}

/**
 * Local fallback after a confirmed transition when the fresh row could not be re-read: the phase is known
 * (`human_handoff` / `qualifying`), the agent is not, so "back to the AI" is only `ai` if an agent name is known.
 */
export function withHandling(item: InboxItem, mode: Exclude<HandlingMode, "none">): InboxItem {
  if (mode === "human") return { ...item, handling: "human", state: "human_handoff" }
  return { ...item, handling: item.agentName ? "ai" : "none", state: "qualifying" }
}

export function applyHandling(items: InboxItem[], conversationId: string, mode: Exclude<HandlingMode, "none">): InboxItem[] {
  return items.map((i) => (i.conversationId === conversationId ? withHandling(i, mode) : i))
}

/** Why a take over / return failed, so the screen can say something useful (the raw API text is never shown). */
export type HandlingError = "not_allowed" | "forbidden" | "failed"

export function handlingErrorOf(message: string | undefined | null): HandlingError {
  const text = (message ?? "").toLowerCase()
  if (text.includes("not allowed")) return "not_allowed"
  if (/forbidden|permission|access|not a member/.test(text)) return "forbidden"
  return "failed"
}

/** Replaces a row with the server's fresh copy (keeps the row key and position). */
export function applyFreshItem(items: InboxItem[], fresh: InboxItem): InboxItem[] {
  return items.map((i) => (i.conversationId === fresh.conversationId ? { ...fresh, key: i.key } : i))
}

export function markRead(items: InboxItem[], conversationId: string): InboxItem[] {
  return items.map((i) => (i.conversationId === conversationId && i.unread ? { ...i, unread: false } : i))
}

// ---- thread ---------------------------------------------------------------------------------

/** `unknown`: an outbound message without a sender type (older rows, or sent outside the app). */
export type MessageAuthor = "contact" | "ai" | "human" | "automation" | "unknown"
export type DeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed"

export type ThreadMessage = {
  id: string
  /** Local id of an optimistic message that is still being sent (replaced by the server row). */
  clientId?: string
  direction: "inbound" | "outbound"
  author: MessageAuthor
  authorName: string | null
  text: string
  at: string
  status: DeliveryStatus
  mediaType: string | null
  mediaUrl: string | null
  fileName: string | null
  deleted: boolean
  error: string | null
}

type RawMessage = WhatsAppMessage | ISmsMessage | IInstagramMessage

function statusOf(raw: string | undefined): DeliveryStatus {
  if (raw === "read") return "read"
  if (raw === "delivered") return "delivered"
  if (raw === "failed") return "failed"
  if (raw === "pending" || raw === "queued" || raw === "sending") return "sending"
  return "sent"
}

export function toThreadMessage(raw: RawMessage): ThreadMessage {
  const m = raw as RawMessage & Record<string, unknown>
  const direction = (m.direction as "inbound" | "outbound") === "inbound" ? "inbound" : "outbound"
  const senderType = m.senderType as string | undefined
  const agent = m.senderAgent as { name?: string; source?: string } | null | undefined
  const user = m.senderUser as { name?: string } | null | undefined
  let author: MessageAuthor
  if (direction === "inbound" || senderType === "contact") author = "contact"
  else if (senderType === "agent") author = agent?.source === "inbound_rule" ? "automation" : "ai"
  else if (senderType === "user") author = "human"
  else author = "unknown"
  const mediaType = (m.mediaType as string | null | undefined) ?? null
  const deleted = Boolean(m.deletedForEveryoneAt)
  const text = typeof m.content === "string" ? m.content : ""
  return {
    id: String(m._id),
    direction,
    author,
    authorName: author === "human" ? (user?.name ?? null) : author === "ai" ? (agent?.name ?? null) : null,
    text,
    at: (m.createdAt as string | undefined) ?? new Date(0).toISOString(),
    status: direction === "inbound" ? "read" : statusOf(m.status as string | undefined),
    mediaType: mediaType && mediaType !== "text" ? mediaType : null,
    mediaUrl: (m.mediaUrl as string | null | undefined) ?? null,
    fileName: (m.fileName as string | null | undefined) ?? null,
    deleted,
    error: null,
  }
}

/** API returns newest first; the thread reads oldest first. Dedupes by id and keeps local (sending/failed) rows last. */
export function mergeThread(current: ThreadMessage[], incoming: ThreadMessage[]): ThreadMessage[] {
  const byId = new Map<string, ThreadMessage>()
  const local: ThreadMessage[] = []
  for (const m of current) {
    if (m.clientId && (m.status === "sending" || m.status === "failed")) local.push(m)
    else byId.set(m.id, m)
  }
  for (const m of incoming) byId.set(m.id, m)
  const confirmed = [...byId.values()].sort((a, b) => (toTime(a.at) ?? 0) - (toTime(b.at) ?? 0))
  // A server row with the same text just after a local one means the local one was delivered.
  const stillLocal = local.filter(
    (l) => !confirmed.some((c) => c.direction === "outbound" && c.text === l.text && (toTime(c.at) ?? 0) >= (toTime(l.at) ?? 0) - 5000)
  )
  return [...confirmed, ...stillLocal]
}

export function optimisticMessage(text: string, clientId: string, now = new Date()): ThreadMessage {
  return {
    id: clientId,
    clientId,
    direction: "outbound",
    author: "human",
    authorName: null,
    text,
    at: now.toISOString(),
    status: "sending",
    mediaType: null,
    mediaUrl: null,
    fileName: null,
    deleted: false,
    error: null,
  }
}

export function resolveOptimistic(messages: ThreadMessage[], clientId: string, server: ThreadMessage): ThreadMessage[] {
  const without = messages.filter((m) => m.clientId !== clientId)
  return mergeThread(without, [server])
}

export function failOptimistic(messages: ThreadMessage[], clientId: string, error: string): ThreadMessage[] {
  return messages.map((m) => (m.clientId === clientId ? { ...m, status: "failed", error } : m))
}

export function retryOptimistic(messages: ThreadMessage[], clientId: string): ThreadMessage[] {
  return messages.map((m) => (m.clientId === clientId ? { ...m, status: "sending", error: null } : m))
}

export function discardOptimistic(messages: ThreadMessage[], clientId: string): ThreadMessage[] {
  return messages.filter((m) => m.clientId !== clientId)
}

/** True when a WhatsApp reply could be rejected: official transport and the customer last wrote > 24h ago. */
export function isWhatsAppWindowClosed(params: {
  channel: InboxChannel
  transport?: string | null
  lastInboundAt: string | null
  now?: Date
}): boolean {
  if (params.channel !== "whatsapp") return false
  if (params.transport !== "cloud_api") return false
  const last = toTime(params.lastInboundAt)
  if (last == null) return true
  return (params.now ?? new Date()).getTime() - last > 24 * 60 * 60 * 1000
}

/**
 * Time left in WhatsApp's 24-hour customer service window, for official (Cloud API) lines only. `null` when the rule
 * does not apply (other channels, QR lines); `0` when it is closed or the customer never wrote.
 */
export function whatsAppWindowRemainingMs(params: { channel: InboxChannel; transport?: string | null; lastInboundAt: string | null; now?: Date }): number | null {
  if (params.channel !== "whatsapp" || params.transport !== "cloud_api") return null
  const last = toTime(params.lastInboundAt)
  if (last == null) return 0
  return Math.max(0, last + 24 * 60 * 60 * 1000 - (params.now ?? new Date()).getTime())
}

/** Messages in a row from the same author within 5 minutes are visually grouped. */
export function groupsWithPrevious(prev: ThreadMessage | undefined, current: ThreadMessage): boolean {
  if (!prev) return false
  if (prev.author !== current.author || prev.direction !== current.direction) return false
  return Math.abs((toTime(current.at) ?? 0) - (toTime(prev.at) ?? 0)) < 5 * 60 * 1000
}

/** Calendar day in the browser's time zone (the separators are written in local time too). */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const STATE_KEYS: Record<string, string> = {
  new_lead: "stateNewLead",
  qualifying: "stateQualifying",
  waiting_response: "stateWaitingResponse",
  negotiating: "stateNegotiating",
  human_handoff: "stateHumanHandoff",
  followup: "stateFollowup",
  idle: "stateIdle",
  won: "stateWon",
  lost: "stateLost",
  blocked: "stateBlocked",
}

export function stateTranslationKey(state: string | null | undefined): string | null {
  return state ? (STATE_KEYS[state] ?? null) : null
}
