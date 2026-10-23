import { ObjectId } from "mongoose"
import { ICard } from "./Card"
import { IColumn } from "./Column"

interface IBoard {
  _id: string
  parent: string | ObjectId
  children: Array<any>
  title: string
  columns: IColumn[]
  closedCards: Array<ICard>
  project: string | ObjectId
}

export { IBoard }
