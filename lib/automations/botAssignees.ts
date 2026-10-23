import type { WorkspaceUser } from "actions/users/getUsersFromWorkspace"
import type { IUser } from "app/_types/User"

/** Fallback shape when the workspace context has no member list: only what the pickers read. */
export function membersFromWorkspaceUsers(users: WorkspaceUser[]): IUser[] {
  return users.map((u) => ({ _id: u.id, name: u.name, email: u.email, image: u.image }) as unknown as IUser)
}

/** Ids that no longer match any member (a removed teammate) so the author can see and clear them. */
export function unknownIds(ids: string[] | undefined, members: Array<{ _id?: unknown }>): string[] {
  const known = new Set(members.map((m) => String(m._id)))
  return (ids ?? []).filter((id) => !known.has(id))
}
