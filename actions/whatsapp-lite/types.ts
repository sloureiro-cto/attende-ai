/** WhatsApp Lite (multi-session) — alinhado a `docs/FRONTEND_WHATSAPP_LITE_CRM_AUTOMATION_GUIDE.md` */

export type WhatsAppSessionStatus = "disconnected" | "qr_pending" | "connected" | "banned" | string

export type WhatsAppSessionAccessScope = "workspace" | "private"

/** Transport backing a session: WhatsApp Web (Baileys) or the Meta Cloud API. */
export type WhatsAppSessionTransport = "baileys" | "cloud_api"

/** Non-secret Cloud API config returned by the backend (access token is never sent). */
export interface WhatsAppCloudApiConfig {
  wabaId?: string
  phoneNumberId?: string
  displayName?: string
  verifiedName?: string
  qualityRating?: string
  messagingLimit?: string
}

export interface ColumnSlaRule {
  projectId: string
  columnId: string
  warningMinutes: number
  criticalMinutes: number
}

export interface ResponseSlaRules {
  enabled: boolean
  defaultWarningMinutes: number
  defaultCriticalMinutes: number
  columnRules?: ColumnSlaRule[]
}

export interface WhatsAppSession {
  _id: string
  workspaceId?: string
  label: string
  status: WhatsAppSessionStatus
  phoneNumber?: string | null
  createdBy?: string
  accessScope?: WhatsAppSessionAccessScope
  accessEntries?: import("app/_types/IAccessEntry").AccessControlList[]
  responseSlaRules?: ResponseSlaRules | null
  /** Prefix outbound user messages with attendant name in WhatsApp bold. */
  prependAttendantNameEnabled?: boolean
  /** When true, inbox/list hide conversations that are not linked to a CRM card. */
  showOnlyLinkedLeadConversations?: boolean
  /** When true, first QR pair requests a full conversation history dump. */
  syncHistoryOnPair?: boolean
  /** Defaults to "baileys" when omitted by older backends. */
  transport?: WhatsAppSessionTransport
  cloudApiConfig?: WhatsAppCloudApiConfig | null
  lastDisconnectAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type WhatsAppCloudTemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION"

export type WhatsAppCloudTemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" | string

/** Meta HSM template mirrored locally (distinct from internal automation templates). */
export interface WhatsAppCloudTemplate {
  _id: string
  workspaceId?: string
  wabaId: string
  name: string
  language: string
  category: WhatsAppCloudTemplateCategory
  status: WhatsAppCloudTemplateStatus
  components?: unknown
  metaTemplateId?: string | null
  lastSyncedAt?: string | null
  rejectedReason?: string | null
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
  createdAt?: string
  updatedAt?: string
}

export type MessageTemplateSource = "meta" | "workspace"

/** Workspace-owned Baileys snippet template (name + body with `{{n}}`). */
export interface WhatsAppWorkspaceTemplate {
  _id: string
  workspaceId?: string
  name: string
  shortcut?: string
  body: string
  enabledSessionIds?: string[]
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
  attachments?: import("./blastCampaignTypes").BlastCampaignAttachment[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

/** Normalized template entry from the unified `message-templates` listing. */
export interface UnifiedMessageTemplate {
  source: MessageTemplateSource
  id: string
  name: string
  /** `{{n}}` placeholder keys, ascending. */
  placeholders: string[]
  body?: string
  language?: string
  category?: WhatsAppCloudTemplateCategory
  status?: WhatsAppCloudTemplateStatus
  shortcut?: string
  varBindings?: Record<string, { crmField?: string; defaultValue?: string }>
  attachments?: import("./blastCampaignTypes").BlastCampaignAttachment[]
}

export interface WhatsAppMessageSenderUser {
  _id: string
  name: string
  email?: string
  image?: string | null
  avatarUrl?: string
  avatar?: string
  avatarBackground?: string
}

export type WhatsAppMessageSenderAgentSource = "agent" | "inbound_rule"

export interface WhatsAppMessageSenderAgent {
  name?: string
  icon?: string
  source: WhatsAppMessageSenderAgentSource
}

/** Resposta estável de GET …/sessions/:id/qr (workspace-backend). */
export interface WhatsAppQrPollPayload {
  qrCode: string | null
  qrReady: boolean
  status: string
  hint?: string
}

export type ConversationState =
  | "new_lead"
  | "qualifying"
  | "waiting_response"
  | "negotiating"
  | "human_handoff"
  | "followup"
  | "idle"
  | "won"
  | "lost"
  | "blocked"

export interface WhatsAppConversation {
  _id: string
  remoteJid?: string
  contactName?: string | null
  /** E.164 quando o backend normaliza (ex.: +55…). */
  contactPhone?: string | null
  /** URL da foto de perfil (melhor esforço; pode expirar). */
  contactAvatarUrl?: string | null
  lastMessageAt?: string | null
  /** When the API sends it, avoids an extra messages fetch for notification direction. */
  lastMessageDirection?: "inbound" | "outbound" | null
  /** Short preview for notifications (optional). */
  lastMessagePreview?: string | null
  /** Delivery status when lastMessageDirection is outbound. */
  lastMessageStatus?: WhatsAppDeliveryStatus | null
  messageCount?: number
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  sessionId?: string
  /** When true, inbound messages may carry `participantDisplayName` / `participantJid`. */
  isGroup?: boolean
  /** Resolved CRM card title when linked (`card` + id). */
  crmDisplayName?: string | null
  crmColumnId?: string | null
  crmProjectId?: string | null
  crmLabels?: Array<{ _id: string; text: string; color?: string }>
  groupSubject?: string | null
  /** In-thread "slash assist": inbound runs this agent; bindings skipped for that message when configured. */
  slashAssistEnabled?: boolean | null
  slashAssistAgentId?: string | null
  /** SDR conversation state. */
  conversationState?: ConversationState | null
  assignedUserId?: string | null
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
  lastInboundAt?: string | null
  lastOutboundAt?: string | null
  /** Shared workspace read cursor — unread when lastInboundAt > lastReadAt. */
  lastReadAt?: string | null
  followupScheduledAt?: string | null
  followupCount?: number
  /** Soft-delete timestamp; active conversations omit this or leave it null. */
  deletedAt?: string | null
}

export type WhatsAppMessageDirection = "inbound" | "outbound"
export type WhatsAppMessageSenderType = "contact" | "agent" | "user"
export type WhatsAppDeliveryStatus = "sent" | "delivered" | "read" | "failed"

/** Reação sincronizada do WhatsApp (ver GET …/messages). */
export interface WhatsAppMessageReaction {
  emoji: string
  reactorJid: string
  reactorFromMe: boolean
  senderTimestampMs?: number
}

/** Quoted message preview when this row is a reply. */
export interface WhatsAppMessageReplyTo {
  messageId: string
  content?: string | null
  mediaType?: string | null
  direction?: WhatsAppMessageDirection
  participantDisplayName?: string | null
}

export interface WhatsAppMessage {
  _id: string
  /** Id de protocolo WhatsApp (reações, citações). */
  messageId?: string | null
  direction: WhatsAppMessageDirection
  /** Texto ou legenda; pode ser vazio para mensagens só com media. */
  content?: string | null
  status?: WhatsAppDeliveryStatus
  /** Provider failure reason (Meta Cloud API) when `status` is `failed`. */
  deliveryError?: { code?: number; title?: string; message?: string; details?: string } | null
  senderType?: WhatsAppMessageSenderType
  senderId?: string | null
  senderUser?: WhatsAppMessageSenderUser | null
  /** Outbound agent/automation avatar metadata (senderType=agent). */
  senderAgent?: WhatsAppMessageSenderAgent | null
  createdAt?: string
  /** `text` | `image` | `video` | `document` | … — legado / alias do backend. */
  messageType?: string
  /** Tipo de media preferido pela API (`image` | `video` | `audio` | `document` | `sticker` | …). */
  mediaType?: string | null
  /** URL HTTPS estável para `<img>` / `<video>` / `<audio>` ou abrir em novo separador. */
  mediaUrl?: string | null
  mimeType?: string | null
  fileName?: string | null
  /** Grupo: nome amigável do remetente (pushName ou fallback do backend). */
  participantDisplayName?: string | null
  participantJid?: string | null
  /** Agent execution metadata (populated when senderType=agent and backend includes it). */
  agentExecutionId?: string | null
  agentThinking?: {
    durationMs?: number
    toolCalls?: { name: string; durationMs?: number; status: "completed" | "failed" }[]
  } | null
  reactions?: WhatsAppMessageReaction[]
  /** When this message replies to another, denormalized quote preview from the gateway. */
  replyTo?: WhatsAppMessageReplyTo | null
  /** Apagada para todos a partir do inbox (conteúdo limpo; mostrar marcador). */
  deletedForEveryoneAt?: string | null
}

export interface ConversationTimelineEntry {
  _id: string
  conversationId: string
  workspaceId: string
  eventType: string
  actor?: {
    type: string
    id?: string
    name?: string
  }
  detail?: Record<string, unknown>
  durationMs?: number
  /** ISO/Date from the timeline API (`conversation_timeline_entries.timestamp`). */
  timestamp?: string | Date | null
  /** Legacy alias; the API currently sends `timestamp`. */
  createdAt?: string | null
}

export interface PaginatedMeta {
  total?: number
  limit?: number
  offset?: number
}
