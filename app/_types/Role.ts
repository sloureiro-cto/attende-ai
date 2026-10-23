import { PermissionsEnum, PermissionsResourcesEnum } from "./Permissions"

export { PermissionsEnum, PermissionsResourcesEnum }
export type PermissionsResourcesType = PermissionsResourcesEnum
export type PermissionsType = `${PermissionsEnum}`

/** Permission id prefix narrows (same union as `PermissionsType`; useful for forms/ACLs scoped to one resource). */
export type ProjectPermissionsType = Extract<PermissionsType, `project:${string}`>
export type WorkspacePermissionsType = Extract<PermissionsType, `workspace:${string}`>
export type DocumentPermissionsType = Extract<PermissionsType, `document:${string}`>
export type TimeTrackerPermissionsType = Extract<PermissionsType, `time_tracker:${string}`>

export type EntityType = "project" | "workspace" | "document" | "time_tracker"

export interface IRole {
  _id: string
  name: string
  tenantId?: string
  permissions: PermissionsType[]
  entityType: EntityType
  entityId: string
  workspace: string | null
  createdAt: string
  updatedAt: string
  roleType: RoleTypeEnum
}

export enum RoleTypeEnum {
  DEFAULT = "default",
  CUSTOM = "custom",
}

export interface CreateRoleDTO {
  projectId: string
  payload: RolePayloadDTO
}

export interface UpdateRoleDTO {
  projectId: string
  roleId: string
  payload: Partial<RolePayloadDTO>
}

export interface RolePayloadDTO {
  name: string
  permissions: PermissionsType[]
}

export interface PermissionDictionaryItem {
  label: string
  description: string
}
