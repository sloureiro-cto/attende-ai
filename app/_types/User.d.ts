import { IUserRole } from "./UserRole"

interface IUser {
  _id: string
  username: string
  fullName: string
  name: string
  emailVerified?: boolean
  email: string
  role?: IUserRole | string | null
  /** Organizational role in the current workspace (from workspace member payloads). */
  workspaceRole?: IUserRole | string | null
  avatar?: Buffer
  avatarUrl?: string
  image?: string
  contentType?: string
  accessToken?: string
  avatarBackground?: string
  avatarUrl?: string
  isVerified?: boolean
  aboutMe?: string
  pronouns?: string
  genericRole?: string
  stripeCustomerId?: string
  birthDate?: Date
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  phone?: string
  language?: "english" | "portuguese" | "spanish"
  twoFactorEnabled?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export { IUser }
