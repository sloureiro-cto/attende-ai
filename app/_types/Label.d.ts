import { Document, ObjectId } from "mongodb"

interface ILabel extends Document {
  _id?: string
  color: string
  text: string
  pattern?: number // 1-10
  project: string | ObjectId
  workspaceId: string | ObjectId
  /** Empty/absent = entire project (all boards) when labelSharingMode is scoped. */
  boardIds?: string[]
}

interface CreateLabelDTO {
  color: string
  text: string
  project: string
  pattern?: number // 1-10
  boardIds?: string[]
}

interface UpdateLabelDTO {
  text?: string
  color?: string
  pattern?: number | null // 1-10
  boardIds?: string[]
}

export { ILabel, CreateLabelDTO, UpdateLabelDTO }
