// import { ObjectId } from "mongoose"
import { ICard } from "./Card"
import { IColumnCategory } from "./ColumnCategory"
import { IStatus, StatusType } from "./StatusType"

interface IColumn {
  _id: string
  title: string
  board: string
  project: string
  cards: ICard[]
  category?: IColumnCategory
  boardIndex?: string
  columnStatus?: StatusType
  status?: IStatus
  promptFollowUpOnMove?: boolean
  followUpAgentId?: string
}

export { IColumn }
