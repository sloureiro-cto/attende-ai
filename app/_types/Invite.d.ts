import { IWorkspace } from "context/WorkspaceContext"

export type InviteEntityType = "workspace"

export interface IInvite {
  _id: string
  inviter: string
  email: string
  role: string | IRole
  entityType: InviteEntityType
  entityId: string
  workspace: string | IWorkspace
  status: "pending" | "accepted" | "rejected" | "expired" | "canceled"
  acceptedAt: string | null
  removedAt: string | null
  createdAt: string
  updatedAt: string
}
