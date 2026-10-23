"use client"
import { useSession } from "next-auth/react"
import { EntityType, IRole, PermissionsType } from "app/_types/Role"
import { IUserRole } from "app/_types/UserRole"
import { usePermissions } from "context/PermissionsContext"
import { useWorkspace } from "context/WorkspaceContext"
import { entityId as toEntityId } from "lib/entityId"
import { resolveWorkspaceOwnerId } from "lib/permissions/resolveWorkspaceOwnerId"

export type PermissionCheckContext = {
  sessionUserId?: string | null
  workspaceOwnerId?: string | null
  workspaceId?: string | null | undefined
  entityByPass?: string[] | null
  userRoles: IUserRole[] | null
}

/**
 * Synchronous RBAC check (same rules as useHasPermission) for use in callbacks e.g. drag-end handlers.
 * `permission` must be a `PermissionsEnum` value.
 */
export function computeHasPermission(
  permission: PermissionsType,
  entityType: EntityType,
  entityId: string | undefined,
  ctx: PermissionCheckContext
): boolean {
  if (ctx.workspaceOwnerId && ctx.workspaceOwnerId === ctx.sessionUserId) {
    return true
  }

  const workspaceId = ctx.workspaceId != null ? toEntityId(ctx.workspaceId) || String(ctx.workspaceId) : ""
  const normalizedEntityId = entityId ? toEntityId(entityId) || String(entityId) : ""

  if (workspaceId && ctx.entityByPass?.includes(workspaceId)) return true

  if (normalizedEntityId && ctx.entityByPass?.includes(normalizedEntityId)) return true

  if (!ctx.userRoles) return false

  const workspaceRole = ctx.userRoles.find((role) => role.entityType === "workspace")
  const entityRole = ctx.userRoles.find(
    (role) =>
      role.entityType === entityType &&
      (role.entityId === entityId || toEntityId(role.entityId) === normalizedEntityId)
  )

  const permissions = entityRole
    ? [...(entityRole.permissions ?? []), ...((entityRole.role as IRole)?.permissions ?? [])]
    : workspaceRole
    ? [...(workspaceRole.permissions ?? []), ...((workspaceRole.role as IRole)?.permissions ?? [])]
    : []

  return permissions.includes(permission)
}

/**
 * Client-side permission check. Pass `PermissionsEnum.*` from `app/@types/Role`.
 */
export function useHasPermission(permission: PermissionsType, entityType: EntityType, entityId?: string) {
  const { data: session } = useSession()
  const { selectedWorkspace } = useWorkspace()
  const { userRoles, entityByPass } = usePermissions()

  const workspaceOwnerId = resolveWorkspaceOwnerId(selectedWorkspace?.owner)
  const normalizedEntityId = entityId ? toEntityId(entityId) || String(entityId) : undefined

  return computeHasPermission(permission, entityType, normalizedEntityId, {
    sessionUserId: session?.user?.id,
    workspaceOwnerId,
    workspaceId: selectedWorkspace?._id != null ? String(selectedWorkspace._id) : null,
    entityByPass,
    userRoles,
  })
}

/** True if the user has the permission on any role/entity (or is workspace owner). */
export function useHasPermissionAnywhere(permission: PermissionsType) {
  const { data: session } = useSession()
  const { selectedWorkspace } = useWorkspace()
  const { userRoles, entityByPass } = usePermissions()
  const workspaceOwnerId = resolveWorkspaceOwnerId(selectedWorkspace?.owner)

  if (workspaceOwnerId && workspaceOwnerId === session?.user?.id) {
    return true
  }

  if (selectedWorkspace?._id != null && entityByPass?.includes(String(selectedWorkspace._id))) {
    return true
  }

  if (!userRoles?.length) return false

  return userRoles.some((userRole) => {
    if (userRole.entityId && entityByPass?.includes(userRole.entityId)) return true

    const permissions = [...(userRole.permissions ?? []), ...((userRole.role as IRole | undefined)?.permissions ?? [])]

    return permissions.includes(permission)
  })
}
