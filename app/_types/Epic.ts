import { IColumn } from "./Column"
import { ILabel } from "./Label"
import { ILink } from "./Link"
import { IProject } from "./Project"
import { StatusType } from "./StatusType"
import { IUser } from "./User"

export interface IEpic {
  _id: string
  title: string
  description?: string
  startDate?: string
  endDate?: string
  project: string | IProject
  board?: string
  workspace: string
  owner: string | IUser
  assignees: string[] | IUser[]
  labels: string[] | ILabel[]
  storypoints: number
  priority: number
  column: string | IColumn
  status: StatusType
  autoComplete: boolean
  links?: ILink[]
  completedAt?: string
  createdAt: Date
  updatedAt: Date

  populated?: boolean //for optimistic update and local state only
  hasChilds?: boolean

  flagDescription?: string
  flagged?: boolean

  /** Task counts from epic list API — used for header progress before lazy-loading cards */
  taskCounts?: EpicTaskCounts
}

export type EpicTaskCounts = {
  todo: number
  inProgress: number
  done: number
  total: number
}
