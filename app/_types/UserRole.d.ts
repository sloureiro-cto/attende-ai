import { IRole, PermissionsType } from "./Role"

export interface IUserRole {
  _id: string
  user: string | IUser
  permissions: PermissionsType[]
  role: string | IRole
  entityType: EntityType
  entityId: string
  workspace: string | null
  createdAt: string
  updatedAt: string
}

export interface AssignRoleDTO {
  projectId: string
  userId: string
  payload: {
    role?: string
    permissions?: PermissionsType[]
    entityId?: string
    role?: string
  }
}
