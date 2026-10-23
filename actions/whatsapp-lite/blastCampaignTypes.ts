export type BlastCampaignMediaType = "image" | "video" | "document" | "audio"

export interface BlastCampaignAttachment {
  documentId?: string
  mediaUrl?: string
  mediaType: BlastCampaignMediaType
  mediaFileName: string
  mimeType?: string
  size?: number
}

export type BlastMessageMode = "freeform" | "template"

export type BlastTemplateSource = "meta" | "workspace"

/** Per-placeholder binding for template steps: CRM source field + manual default. */
export interface BlastTemplateVarBinding {
  crmField?: string
  defaultValue?: string
}

export interface BlastTemplateConfig {
  source: BlastTemplateSource
  templateId: string
  templateName: string
  language?: string
  varBindings?: Record<string, BlastTemplateVarBinding>
  headerMediaUrl?: string
}

export interface BlastCampaignSequenceStep {
  stepIndex?: number
  order?: number
  content?: string
  message?: {
    text?: string
    mediaUrl?: string
    mediaType?: string
    mediaFileName?: string
    attachments?: BlastCampaignAttachment[]
    mode?: BlastMessageMode
    template?: BlastTemplateConfig
  }
  delayHours?: number
  skipIfReplied?: boolean
  mediaUrl?: string
  mediaType?: string
  mediaFileName?: string
  attachments?: BlastCampaignAttachment[]
  mode?: BlastMessageMode
  template?: BlastTemplateConfig
}

export interface BlastCampaignRecipient {
  /** Subdocument id — required for per-recipient retry/move-card actions. */
  _id?: string
  phone: string
  conversationId?: string
  cardId?: string
  contactName?: string
  status: "pending" | "processing" | "sent" | "delivered" | "failed" | "skipped"
  currentStep: number
  sentAt?: string
  failedReason?: string
}

/** Inclusive ISO 8601 range (`$gte` / `$lte` on the mapped Mongo field). */
export type BlastCardDateRangeFilter = {
  from?: string
  to?: string
}

/** Optional filters forwarded to CRM card resolution (`GET …/cards/paginated`-compatible). */
export type BlastAudienceCardFilters = {
  boardId?: string
  columnId?: string
  type?: "task" | "bug" | "story" | "epic"
  assignee?: string[]
  assignedUsers?: string[]
  reporter?: string[]
  labels?: string[]
  leadSources?: string[]
  unassigned?: boolean
  statusId?: string
  statusIds?: string[]
  /** Numeric card priority levels (`0`–`4`), same semantics as paginated `status` query param. */
  status?: string[]
  priorities?: (string | number)[]
  priority?: number
  flagged?: boolean
  sprintId?: string
  withoutSprint?: boolean
  epicId?: string
  includeSubtasks?: boolean
  title?: string
  search?: string
  orderBy?: string
  /** Maps to card `endDate` (deadline). */
  deadline?: BlastCardDateRangeFilter
  /** Maps to card `startDate`. */
  startDate?: BlastCardDateRangeFilter
  /** Maps to card `createdAt`. */
  createdAt?: BlastCardDateRangeFilter
}

export interface BlastCampaignAudienceSource {
  type: "project" | "project_column" | "csv"
  projectId?: string
  columnId?: string
  phones?: string[]
  cardFilters?: BlastAudienceCardFilters
}

/** Runs after each lead is messaged successfully (requires linked CRM card). */
export type BlastCampaignPostSendAction = {
  type: "move_card"
  projectId?: string
  targetColumnId?: string
}

export interface BlastCampaignStats {
  /** Total recipients / audience size */
  total?: number
  totalRecipients?: number
  sent: number
  delivered?: number
  replied?: number
  failed?: number
  skipped?: number
}

export interface BlastCampaign {
  _id: string
  workspaceId: string
  sessionId: string
  userId: string
  name: string
  description?: string
  status: "draft" | "scheduled" | "active" | "running" | "paused" | "completed" | "cancelled" | "failed"
  sequence: BlastCampaignSequenceStep[]
  recipients: BlastCampaignRecipient[]
  audienceSource?: BlastCampaignAudienceSource
  dailyLimit: number
  messageIntervalSeconds: number
  /** Absent means the silent 100ms default. Only used when sendIntervalMode is meta. */
  customMessageIntervalMs?: number | null
  /** Missing or seconds keeps the saved seconds interval. meta is Cloud API only. */
  sendIntervalMode?: "seconds" | "meta"
  postSendAction?: BlastCampaignPostSendAction
  stats?: BlastCampaignStats
  createdAt: string
  updatedAt: string
}

export interface BlastCampaignCreateInput {
  name: string
  description?: string
  sessionId: string
  sequence: Array<{
    stepIndex: number
    content?: string
    delayHours: number
    message?: {
      text?: string
      attachments?: BlastCampaignAttachment[]
      mediaUrl?: string
      mediaType?: string
      mediaFileName?: string
      mode?: BlastMessageMode
      template?: BlastTemplateConfig
    }
    mediaUrl?: string
    mediaType?: string
    mediaFileName?: string
    mode?: BlastMessageMode
    template?: BlastTemplateConfig
    skipIfReplied?: boolean
  }>
  audienceSource?: BlastCampaignAudienceSource
  dailyLimit: number
  messageIntervalSeconds?: number
  customMessageIntervalMs?: number | null
  sendIntervalMode?: "seconds" | "meta"
  postSendAction?: BlastCampaignPostSendAction | null
}
