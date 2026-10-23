import { ObjectId } from "mongoose"

export interface IStatus {
  _id: ObjectId
  name: string
  slug: string
  color: string
  type: StatusType
  project: ObjectId
  createdAt: Date
  updatedAt: Date
}

enum StatusType {
  TO_DO = "todo",
  IN_PROGRESS = "inProgress",
  DONE = "done",
  /** CRM only: deal won */
  WIN = "win",
  /** CRM only: deal lost */
  LOST = "lost",
}
export { StatusType }
