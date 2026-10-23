import { ObjectId } from "mongoose"
import { IUser } from "./User"

interface IComment {
  _id: string | ObjectId
  text: string
  author: ObjectId | string | Partial<IUser>
  card: ObjectId | string
  createdAt?: Date
  updatedAt?: Date
}

export { IComment }
