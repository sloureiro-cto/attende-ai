import { getWorkspaceInvites } from "actions/invites/getWorkspaceinvites"
import { getWorkspaceRoles } from "actions/roles/getWorkspaceRoles"
import { getUsersFromWorkspace } from "actions/users/getUsersFromWorkspace"
import { attendeGet } from "./serverApi"
import type { RoleLite } from "./team"
import { inviteRoleName, resolveSeatLimit, TeamInvite, TeamMember } from "./team"

export type TeamData = {
  members: TeamMember[]
  invites: TeamInvite[]
  roles: RoleLite[]
  seatLimit: number | null
  /** Members could not be read: the page shows an error state instead of an empty team. */
  failed: boolean
  /** Roles could not be read: the invite form refuses to send (it needs a role id). */
  rolesFailed: boolean
}

/**
 * One parallel read of everything the team page needs. Invites/roles failures degrade; members failure fails the page.
 * The seat limit comes from the plan (`GET /attende/entitlements`); without it seats are not enforced here.
 */
export async function loadTeam(workspaceId: string): Promise<TeamData> {
  const [members, invites, roles, entitlements] = await Promise.all([
    getUsersFromWorkspace(workspaceId),
    getWorkspaceInvites({ status: ["pending", "failed"], limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
    getWorkspaceRoles({ workspaceId }),
    attendeGet<unknown>("/attende/entitlements"),
  ])

  return {
    members: members.success
      ? (members.data ?? []).map((m) => ({ id: m.id, name: m.name, email: m.email, image: m.image || null, roleName: m.workspaceRole ?? "" }))
      : [],
    invites: invites.success
      ? (invites.data?.invites ?? [])
          .filter((i) => (i.status === "pending" || (i.status as string) === "failed") && !i.removedAt)
          .map((i) => ({
            id: i._id,
            email: i.email,
            roleName: inviteRoleName(i),
            status: (i.status as string) === "failed" ? ("failed" as const) : ("pending" as const),
            createdAt: i.createdAt,
          }))
      : [],
    roles: roles.success
      ? (roles.data ?? []).map((r) => ({ _id: r._id, name: r.name, entityType: r.entityType, roleType: r.roleType }))
      : [],
    seatLimit: entitlements.success ? resolveSeatLimit(entitlements.data) : null,
    failed: !members.success,
    rolesFailed: !roles.success,
  }
}
