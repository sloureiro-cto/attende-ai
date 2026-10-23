import { ObjectId } from "mongoose"
import { IFileAttachment } from "./Attachment"
import { IBoard } from "./Board"
import { AccessControlList } from "./IAccessEntry"
import { IUser } from "./User"

interface IProjectTab {
  _id: string
  type: "board" | "documents" | "divider"
  title: string
  order: number
  createdBy: string
  createdAt?: string
  /** The project's original board/view — can't be renamed, reordered or deleted. */
  isDefault?: boolean
  /** Board privacy — omitted/'workspace' means visible to anyone with project access;
   *  'private' restricts to createdBy, the project leader, and `accessEntries`. */
  accessScope?: "private" | "workspace"
  /** Who can see/work on this tab when accessScope is 'private'. */
  accessEntries?: AccessControlList[]
  /** type "board", new board. */
  boardId?: string
  boardType?: "kanban" | "scrum" | "crm"
  /** type "board", saved view of an existing project — no boardId, reuses the linked project's board. */
  linkedProjectId?: string
  savedView?: {
    filters?: Record<string, unknown>
    sortBy?: string
    sortOrder?: "asc" | "desc"
    displayMode?: string
  }
  /** type "documents". */
  folderId?: string
}

interface IProject {
  _id: string
  archieved?: boolean
  leader?: IUser | ObjectId | string
  includedUsers?: IUser[]
  removedUsers?: IUser[]
  title?: string
  description?: string
  board?: string | ObjectId | null | IBoard
  notifications?: string | ObjectId
  slug?: string
  private: boolean
  icon?: IFileAttachment | string
  projectType?: {
    _id?: string
    title?: "kanban" | "scrum" | "crm"
    properties?: string[] // e.g., ["projects:backlog", "projects:epic", "projects:sprint"]
  }
  /**
   * WhatsApp Lite no CRM: quais sessões do workspace podem abrir conversas / automação neste projecto.
   * Ausente = compat: todas as sessões ligadas (comportamento anterior).
   */
  crmWhatsappLite?: {
    enabled: boolean
    sessionIds: string[]
  }
  /**
   * Instagram Lite no CRM: quais sessões do workspace podem abrir conversas / automação neste projecto.
   * Ausente = compat: todas as sessões ligadas (comportamento anterior).
   */
  crmInstagramLite?: {
    enabled: boolean
    sessionIds: string[]
  }
  products?: {
    reserve_only_won_leads?: boolean
  }
  /** shared = every board sees every label; scoped = filter by label.boardIds */
  labelSharingMode?: "shared" | "scoped"
  /** Shared Visão geral layout. Absent until someone rearranges or hides a report. */
  homeReportLayout?: {
    order: string[]
    hidden: string[]
  } | null
  folderId: string
  createdAt?: Date
  /** Set only on projects created via "Clone project" — tracks the background copy job. */
  cloneStatus?: "processing" | "completed" | "failed"
  cloneSourceProject?: string
  cloneError?: string
  /** Set only when the requesting user has pinned this project — per-user, not shared. */
  pinnedAt?: Date | string
  /**
   * Multi-board tabs (Fase 2). Empty/absent means "legacy" single-board mode — the project's own
   * `board`/`projectType` is the only implicit tab. Backend synthesizes that same fallback shape
   * when returning tabs for a legacy project, so callers here never need a separate branch for it.
   */
  tabs?: IProjectTab[]
  /** Hardened frontend URL from create_project / create_project_tab when present. */
  url?: string
}

export { IProject, IProjectTab }
