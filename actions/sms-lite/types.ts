/** SMS Lite — aligned to docs/SMS_LITE_FRONTEND_GUIDE.md */

export type SmsProvider = "twilio"
export type SmsSessionStatus = "pending_config" | "active" | "disabled"
export type SmsSessionAccessScope = "workspace" | "private"

export type { ColumnSlaRule, ResponseSlaRules } from "actions/whatsapp-lite/types"

export interface ISmsSession {
  _id: string
  workspaceId: string
  label: string
  provider: SmsProvider
  fromNumber: string
  status: SmsSessionStatus
  accessScope?: SmsSessionAccessScope
  responseSlaRules?: import("actions/whatsapp-lite/types").ResponseSlaRules | null
  /** Prefix outbound user messages with the attendant's name. */
  prependAttendantNameEnabled?: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type SmsConversationState =
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

export interface ISmsConversation {
  _id: string
  workspaceId: string
  sessionId: string
  contactPhone: string
  contactName?: string
  lastMessageAt?: string
  messageCount: number
  lastMessageDirection?: "inbound" | "outbound" | null
  lastMessagePreview?: string | null
  /** Delivery status when lastMessageDirection is outbound. */
  lastMessageStatus?: SmsMessageStatus | null
  linkedEntityType?: LinkedEntityType
  linkedEntityId?: string
  crmDisplayName?: string | null
  crmProjectId?: string | null
  crmColumnId?: string | null
  crmLabels?: Array<{ _id: string; text: string; color?: string }>
  conversationState?: SmsConversationState
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
  /** Shared workspace read cursor — unread when lastInboundAt > lastReadAt. */
  lastReadAt?: string | null
  createdAt: string
  updatedAt: string
}

export type SmsDirection = "inbound" | "outbound"
export type SmsMessageStatus = "received" | "queued" | "sent" | "delivered" | "failed"
export type SmsSenderType = "contact" | "user" | "agent"

export interface SmsMessageReplyTo {
  providerMessageId: string
  content?: string | null
  mediaType?: ISmsMessage["mediaType"] | null
  direction?: SmsDirection
}

export interface ISmsMessage {
  _id: string
  conversationId: string
  workspaceId: string
  direction: SmsDirection
  providerMessageId?: string
  content?: string
  mediaType?: "image" | "video" | "audio" | "document"
  mediaUrl?: string
  mimeType?: string
  fileName?: string
  status: SmsMessageStatus
  senderType: SmsSenderType
  senderId?: string
  agentExecutionId?: string
  replyToProviderMessageId?: string
  replyTo?: SmsMessageReplyTo | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedMeta {
  total?: number
  limit?: number
  offset?: number
}

export interface SmsSessionsListResponse {
  success: boolean
  data: ISmsSession[]
  hasCredentials: boolean
}

export interface SmsTemplate {
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

export interface SmsTimelineEntry {
  _id: string
  conversationId: string
  workspaceId: string
  eventType: string
  detail?: Record<string, any>
  timestamp: string
  correlationId?: string
}
