import { IUser } from "app/_types/User"
import { IUserRole } from "app/_types/UserRole"

function nameFromRoleLike(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined
  const name = (value as { name?: unknown }).name
  if (typeof name !== "string") return undefined
  const trimmed = name.trim()
  return trimmed || undefined
}

function nameFromString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

/** Workspace organizational role label for display (not ACL permissions). */
export function resolveUserWorkspaceRoleLabel(user: Pick<IUser, "role" | "workspaceRole">): string | undefined {
  const workspaceRole = user.workspaceRole
  const fromWorkspaceString = nameFromString(workspaceRole)
  if (fromWorkspaceString) return fromWorkspaceString
  const fromWorkspaceObject = nameFromRoleLike(workspaceRole)
  if (fromWorkspaceObject) return fromWorkspaceObject

  const role = user.role
  const fromRoleString = nameFromString(role)
  if (fromRoleString) return fromRoleString
  const fromRoleObject = nameFromRoleLike(role)
  if (fromRoleObject) return fromRoleObject

  if (role && typeof role === "object" && "role" in role) {
    const nested = (role as IUserRole).role
    const fromNestedString = nameFromString(nested)
    if (fromNestedString) return fromNestedString
    const fromNestedObject = nameFromRoleLike(nested)
    if (fromNestedObject) return fromNestedObject
  }

  return undefined
}
