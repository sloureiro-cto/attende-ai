import { IUser } from "./User"

export interface ITimeTrackerTag {
  _id?: string
  id?: string
  user: string
  title: string
  createdAt: string
  updatedAt: string
  deleted: boolean
  deletedBy?: string
  deletedAt?: string
}

interface ITimeTrackerEntry {
  _id?: string
  user?: IUser
  project?: {
    id: string
    type: "kanban" | "timeTracker" | "jira" | "other"
  }
  task?: {
    id: string
    type: "kanban" | "timeTracker" | "jira" | "other"
    title?: string
  }
  client?: {
    id: string
    type: "kanban" | "timeTracker" | "jira" | "other"
  }
  tags?: ITimeTrackerTag[] | string[]
  startTime: Date | string
  endTime: Date | string
  billable: boolean
  billableAmount: number
  billableCurrency: string
  description?: string
  workspaceOwner?: string
  createdAt?: Date
  updatedAt?: Date
  deleted: boolean
  deletedBy?: string
  deletedAt?: Date
}
export { ITimeTrackerEntry }
