import { ObjectId } from "mongoose"
import type { BacklogCounts } from "lib/backlog/types"
import { IBoard } from "./Board"

export interface ISprintDuration {
  name: string
  displayName: string
}

export enum SprintStatus {
  created = "created",
  started = "started",
  concluded = "concluded",
  cancelled = "cancelled",
}

export interface ISprint {
  _id: string | ObjectId
  title?: string
  initialDate?: Date
  finalDate?: Date
  duration?: ISprintDuration
  sprintGoal?: String
  board?: string | IBoard
  status?: SprintStatus
  project?: string
  counts?: BacklogCounts
}
