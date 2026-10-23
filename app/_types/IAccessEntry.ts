import { PermissionsType } from "./Role"

export type AccessControlListSubjectType = "user" | "email" | "role"
export type AccessControlListResourceType =
  | "document"
  | "folder"
  | "task"
  | "whatsapp_session"
  | "instagram_session"
  | "sms_session"
  | "agent_configuration"
  | "preview_artifact"
  | "project_tab"
export type AccessControlListStatus = "active" | "inactive"

export interface AccessControlList {
  _id?: string
  subjectType?: AccessControlListSubjectType
  subjectId?: string

  resourceType?: AccessControlListResourceType
  resourceId?: string

  alias?: string
  /** Messaging channel ACL. Absent means all conversations on the channel. */
  conversationScope?: "assigned" | "group" | "all"
  permissions?: PermissionsType[]

  workspace?: string
  grantedBy?: string

  status: AccessControlListStatus
  createdAt?: Date | string
  updatedAt?: Date | string
}
