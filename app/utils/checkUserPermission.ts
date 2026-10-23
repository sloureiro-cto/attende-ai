import { cache } from "react"
import { getWorkspaceAction } from "actions/workspaces/getWorkspace"
import { EntityType, IRole, PermissionsType } from "app/_types/Role"
import { IUser } from "app/_types/User"
import { IUserRole } from "app/_types/UserRole"
import { getUserPermissions } from "app/api/permissions"
import { auth } from "auth"

interface CheckUserPermissionProps {
  userRoles: IUserRole[]
  byPass?: string[]
  requiredPermission: PermissionsType
  entity: {
    entityType: EntityType
    entityId: string
  }
  workspaceId: string
  sessionUserId?: string | null
  workspaceOwnerId?: string | null
}

// Layouts and pages of one request all check permissions; share the backend round-trips between them.
const loadUserPermissions = cache(() => getUserPermissions())
const loadWorkspace = cache((id: string) => getWorkspaceAction({ id }))

export const getHasPermission = async (
  requiredPermission: PermissionsType,
  type: EntityType,
  id?: string
): Promise<boolean> => {
  const session = await auth()
  const sessionWorkspaceId = session?.user.workspaceId
  if (!sessionWorkspaceId) return false

  // Independent calls: run them together instead of one after the other.
  const [permissions, workspaceResult] = await Promise.all([loadUserPermissions(), loadWorkspace(sessionWorkspaceId)])

  if (!permissions) return false

  const entityId = id || sessionWorkspaceId

  let workspaceOwnerId: string | null = null
  if (workspaceResult.success && workspaceResult.data?.owner) {
    const owner = workspaceResult.data.owner
    workspaceOwnerId = typeof owner === "string" ? owner : (owner as IUser)._id ? String((owner as IUser)._id) : null
  }

  return checkUserPermission({
    userRoles: permissions.roles,
    byPass: permissions.entityByPass,
    requiredPermission,
    entity: {
      entityType: type,
      entityId,
    },
    workspaceId: sessionWorkspaceId,
    sessionUserId: session.user.id,
    workspaceOwnerId,
  })
}

const checkUserPermission = ({
  userRoles,
  byPass,
  requiredPermission,
  entity,
  workspaceId,
  sessionUserId,
  workspaceOwnerId,
}: CheckUserPermissionProps): boolean => {
  if (workspaceOwnerId && sessionUserId && workspaceOwnerId === sessionUserId) {
    return true
  }

  if (byPass?.includes(entity.entityId) || (workspaceId && byPass?.includes(workspaceId))) return true

  const { entityId, entityType } = entity

  const workspaceRole = userRoles.find((role) => role.entityType === "workspace")
  const entityRole = userRoles.find((role) => role.entityType === entityType && role.entityId === entityId)

  const permissions = entityRole
    ? [...entityRole.permissions, ...(entityRole.role as IRole)?.permissions]
    : workspaceRole
    ? [...workspaceRole.permissions, ...(workspaceRole.role as IRole)?.permissions]
    : []

  return permissions.includes(requiredPermission)
}
