import { ObjectId } from "mongoose"
import { IComment } from "./Comment"
import { IEpic } from "./Epic"
import { ILabel } from "./Label"
import { ILink } from "./Link"
import type { ICardProduct } from "./Product"
import { ISprint } from "./Sprint"
import { IStatus, StatusType } from "./StatusType"
import { ITimeTrackerEntry } from "./TimeTrackerEntry"
import { IUser } from "./User"

export interface ICover {
  enabled: boolean
  type: "image" | "color"
  value: string
  /** Attachment ID for card_cover; used when removing via DELETE /attachments */
  attachment?: string
}

export type CardType = "task" | "bug" | "story" | "epic" | "subTask"

/** Stored on card custom fields with fieldType `file` (not linked as card attachments). */
export interface CustomFileRef {
  documentId: string
  url: string
  filename: string
  mimeType?: string
}

export interface ICustomField {
  fieldId: string
  fieldName: string
  fieldType:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime"
    | "time"
    | "select"
    | "multiselect"
    | "boolean"
    | "email"
    | "url"
    | "currency"
    | "file"
  value: string | number | boolean | Date | string[] | CustomFileRef[] | null
  formId?: string
  formName?: string
}

export interface ILeadSource {
  _id: string
  text: string
  color: string
  project?: string
  createdAt?: Date
  updatedAt?: Date
}

/** The AI agent currently handling the card's linked conversation, if any. */
export type CardAgentActivityState =
  | "queued"
  | "working"
  | "waiting"
  | "blocked"
  | "needs_input"
  | "needs_attention"
  | "done"

export interface ICardAgentActivity {
  agentId: string
  workItemId: string
  state: CardAgentActivityState
  /** Plan progress ("2/5"), the question, the action needed, or when it wakes. */
  label?: string
  /** Agent name and photo (URL or emoji) copied by the backend for the chip. */
  agentName?: string
  agentIcon?: string
  updatedAt: string
}

export interface IAssignedAgentSummary {
  _id: string
  name: string
  icon?: string
}

/** Reduced contact shape returned by populated card/board endpoints. */
export type PopulatedContact = {
  _id: string
  fullName: string
  email?: string
  phone?: string
  instagram?: string
  linkedIn?: string
  avatarUrl?: string
  companyId?: string
}

export type CardContactRef = string | PopulatedContact

export type CardMessageChannel = "whatsapp" | "instagram" | "sms"

export interface ICardMessagePreview {
  channel: CardMessageChannel
  conversationId: string
  sessionId: string
  unanswered: boolean
  preview: string | null
  at: Date | string | null
}

interface ICard {
  _id?: string
  title?: string
  date?: Date
  startDate?: Date
  desc?: string
  deleted?: boolean
  columnIndex?: string | number
  assignedUsers?: IUser[] | string[]
  /** Workspace agents assigned to execute this card. */
  assignedAgents?: IAssignedAgentSummary[] | string[]
  /** Synced by the backend from the linked conversation's active agent binding. */
  assignedAgentId?: string | ObjectId | IAssignedAgentSummary | null
  links?: Array<ILink>
  comments?: IComment[]
  reporter?: string | ObjectId | IUser
  /** Agent that created the card (MCP/audit actor). Separate from human `reporter`. */
  reporterAgentId?: string | ObjectId | IAssignedAgentSummary | null
  column?: string | ObjectId
  board?: string | ObjectId
  project?: string | ObjectId
  labels?: Array<ILabel>
  tasks?: Array<any>
  isDisabled?: boolean
  cardStatus?: StatusType
  status?: IStatus
  createdAt?: Date
  slug?: string
  updatedAt?: Date
  /** CRM: timestamp of the last WhatsApp/SMS message on this lead. */
  lastMessageAt?: Date
  /** Board payload extra: progress of the lead's checklist (child cards). */
  checklistSummary?: { total: number; done: number }
  /** Board payload extra: latest conversation on this lead; `unanswered` when the lead wrote last. */
  messagePreview?: ICardMessagePreview
  sprint?: string | ObjectId | ISprint | null
  sprintPosition?: string | number
  cover?: ICover
  storyPoints?: number
  type?: CardType
  parent?: string | ObjectId | null | ICard
  children?: Array<ICard | string | ObjectId>
  workspaceOwner?: string | ObjectId | IUser
  priority?: number
  timeEntries?: ITimeTrackerEntry[]
  totalTimeSpent?: number
  hasSubtasks?: boolean
  flagDescription?: string
  flagged?: boolean
  /** What agents are doing on this card (task runtime). Written by the backend. */
  agentActivity?: ICardAgentActivity[]
  subtaskHierarchyOrder?: number
  accessEntries?: AccessControlList[]
  accessScope?: "public" | "private" | "workspace"
  epic?: string | IEpic
  /** Order within epic (legacy single value). Prefer groupPositions when grouping by epic. */
  epicPosition?: number
  /**
   * Position per (group, column) for group-by views.
   * Key format: "epic_<epicId>_col_<columnId>" for groupBy epics; future: "assignee_<userId>_col_<columnId>", etc.
   * Used for ordering within each group+column cell. Default (no group) view uses columnIndex.
   * Backend: persist this object; merge on PATCH so each key is the sort position for that cell.
   */
  groupPositions?: Record<string, number>
  clonedFrom?:
    | string
    | ObjectId
    | {
        _id?: string
        slug?: string
        project?:
          | string
          | ObjectId
          | {
              _id?: string
              slug?: string
              projectType?: { title?: "kanban" | "scrum" | "crm" }
            }
      }
    | null
  completed?: boolean
  customFields?: ICustomField[]
  /** CRM line items; PUT replaces the full array when sent. */
  cardProducts?: ICardProduct[]
  companyId?: string | null
  /**
   * CRM contacts on the card. The API persist path always sends string IDs;
   * board/cache context may hold reduced populated objects for instant open.
   */
  contactIds?: CardContactRef[]
  leadSource?: ILeadSource[] | string[]
  /** Click-to-WhatsApp ad that brought this lead (official WhatsApp API only). */
  adAttribution?: {
    first?: import("lib/whatsapp-lite/adAttribution").AdReferralSnapshot
    last?: import("lib/whatsapp-lite/adAttribution").AdReferralSnapshot
  }
  /** Full draft subtasks to create with the card (sent on create only). Keeps _id (provisional), parent, title, order, column, completed. */
  subtasks?: Array<{
    _id: string
    parent: string
    title: string
    subtaskHierarchyOrder: number
    column?: string
    completed?: boolean
  }>
  /** Library document IDs to link as card attachments on create (modern AttachmentLink). */
  attachmentDocumentIds?: string[]
  /** GitHub branch/PR link when backend includes it in the card payload (e.g. list cards). Same shape as GET .../github/cards/:cardId/link. */
  githubLink?: import("actions/integrations/getGithubCardLink").GithubCardLinkResult | null
}

export { ICard }
