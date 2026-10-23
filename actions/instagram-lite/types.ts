export type InstagramSessionStatus =
  | "pending_checkout"
  | "pending_connect"
  | "active"
  | "reconnect_required"
  | "disabled"

export type InstagramSessionAccessScope = "workspace" | "private"

export type InstagramBillingStatus = "pending_checkout" | "active" | "past_due" | "canceled" | "free"
export type UnipileAccountStatus = "operational" | "credentials" | "disconnected"

export type { ColumnSlaRule, ResponseSlaRules } from "actions/whatsapp-lite/types"

export interface IInstagramSession {
  _id: string
  workspaceId: string
  label: string
  status: InstagramSessionStatus
  unipileAccountId?: string
  unipileAccountStatus?: UnipileAccountStatus
  instagramUsername?: string
  profilePictureUrl?: string
  billingStatus: InstagramBillingStatus
  billingPeriodEnd?: string
  accessScope?: InstagramSessionAccessScope
  responseSlaRules?: import("actions/whatsapp-lite/types").ResponseSlaRules | null
  /** Prefix outbound user messages with the attendant's name. */
  prependAttendantNameEnabled?: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type InstagramConversationState =
  | "new_lead"
  | "qualifying"
  | "waiting_response"
  | "negotiating"
  | "human_handoff"
  | "followup"
  | "won"
  | "lost"
  | "blocked"
  | "idle"

export type LinkedEntityType = "card" | "lead" | "contact"

export interface IInstagramConversation {
  _id: string
  workspaceId: string
  sessionId: string
  unipileChatId: string
  attendeeId?: string
  attendeeUsername?: string
  displayName?: string
  profilePictureUrl?: string
  lastMessageAt?: string
  messageCount: number
  lastMessageDirection?: "inbound" | "outbound" | null
  lastMessagePreview?: string | null
  lastMessageStatus?: InstagramMessageStatus | null
  linkedEntityType?: LinkedEntityType
  linkedEntityId?: string
  crmDisplayName?: string | null
  crmProjectId?: string | null
  crmColumnId?: string | null
  crmLabels?: Array<{ _id: string; text: string; color?: string }>
  conversationState?: InstagramConversationState
  conversationStateChangedAt?: string
  assignedUserId?: string
  assignedUser?: {
    _id: string
    name: string
    email?: string
    avatarUrl?: string
    avatar?: string
    avatarBackground?: string
  } | null
  /** Live-resolved (not stored): the agent currently bound to this conversation, null when in `human_handoff`. */
  activeAgent?: {
    _id: string
    name: string
    icon?: string
  } | null
  followupScheduledAt?: string
  lastInboundAt?: string | null
  lastOutboundAt?: string | null
  lastReadAt?: string | null
  createdAt: string
  updatedAt: string
}

export type InstagramDirection = "inbound" | "outbound"
export type InstagramMessageStatus = "received" | "queued" | "sent" | "delivered" | "read" | "failed"
export type InstagramSenderType = "contact" | "user" | "agent"

export interface InstagramReaction {
  emoji: string
  senderName?: string
  senderId?: string
  timestamp?: string
}

/** Resolved server-side (mirrors WhatsAppMessageSenderUser) so the client never guesses. */
export interface InstagramMessageSenderUser {
  _id: string
  name: string
  email?: string
  image?: string | null
  avatarUrl?: string
  avatar?: string
  avatarBackground?: string
}

export type InstagramMessageSenderAgentSource = "agent" | "inbound_rule"

/** Outbound agent/automation avatar metadata (senderType=agent), mirrors WhatsApp. */
export interface InstagramMessageSenderAgent {
  name?: string
  icon?: string
  source: InstagramMessageSenderAgentSource
}

export interface IInstagramMessage {
  _id: string
  conversationId: string
  workspaceId: string
  direction: InstagramDirection
  unipileMessageId?: string
  unipileAttachmentId?: string
  content?: string
  mediaType?: "image" | "video" | "audio" | "document"
  mediaUrl?: string
  fileName?: string
  status: InstagramMessageStatus
  senderType: InstagramSenderType
  senderId?: string
  /** Resolved by the backend; do not fall back to the viewer's own identity when absent. */
  senderUser?: InstagramMessageSenderUser | null
  /** Outbound agent/automation metadata when senderType=agent. */
  senderAgent?: InstagramMessageSenderAgent | null
  agentExecutionId?: string
  reactions?: InstagramReaction[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedMeta {
  total?: number
  limit?: number
  offset?: number
}

export interface InstagramTemplate {
  _id: string
  workspaceId: string
  name: string
  root: any
  priority?: number
  status?: "active" | "paused"
  enabledSessionIds?: string[]
  tags?: string[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface InstagramWorkspaceTemplate {
  source: "workspace"
  id: string
  name: string
  shortcut?: string
  body: string
  placeholders: string[]
  attachments?: Array<{
    type: "image" | "video" | "audio" | "document"
    url: string
    mimetype?: string
    filename?: string
  }>
}
