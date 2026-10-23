import { entityId } from "lib/entityId"
import { resolveUserWorkspaceRoleLabel } from "lib/users/userWorkspaceRoleLabel"

export type FilterPersonKind = "user" | "agent"

export type FilterPersonOption = {
  id: string
  label: string
  kind: FilterPersonKind
  email?: string
  roleLabel?: string
  image?: string
  avatarUrl?: string
  avatarBackground?: string
  icon?: string
}

export function filterPersonMatchesSearch(person: FilterPersonOption, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return (
    person.label.toLowerCase().includes(q) ||
    (person.email ?? "").toLowerCase().includes(q) ||
    (person.roleLabel ?? "").toLowerCase().includes(q)
  )
}

export function userToFilterPerson(user: {
  _id?: unknown
  name?: string
  email?: string
  image?: string
  avatarUrl?: string
  avatarBackground?: string
  role?: unknown
  workspaceRole?: unknown
}): FilterPersonOption | null {
  const id = entityId(user._id ?? user)
  if (!id) return null
  const roleLabel = resolveUserWorkspaceRoleLabel(user as Parameters<typeof resolveUserWorkspaceRoleLabel>[0])
  return {
    id,
    kind: "user",
    label: user.name || user.email || id,
    email: user.email,
    roleLabel,
    image: user.image,
    avatarUrl: user.avatarUrl,
    avatarBackground: user.avatarBackground,
  }
}

export function usersToFilterPeople(users: Array<Parameters<typeof userToFilterPerson>[0]>): FilterPersonOption[] {
  return users.map(userToFilterPerson).filter((person): person is FilterPersonOption => Boolean(person))
}
