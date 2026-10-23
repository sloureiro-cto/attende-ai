import { IUser } from "./User"

export interface ILink {
  _id: string
  url: string
  title?: string
  owner: string | IUser
  card: string
  createdAt: string
  updatedAt: string
}
