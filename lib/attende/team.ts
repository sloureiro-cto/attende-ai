import type { IInvite } from "app/_types/Invite"
import type { IRole } from "app/_types/Role"

/** The two choices the product offers. They map onto the workspace's existing default roles. */
export type TeamRoleChoice = "admin" | "agent"
export const TEAM_ROLE_CHOICES: readonly TeamRoleChoice[] = ["admin", "agent"] as const

export type TeamMember = { id: string; name: string; email: string; image?: string | null; roleName: string }
export type TeamInvite = { id: string; email: string; roleName: string; status: "pending" | "failed"; createdAt: string }

const norm = (value: string) => value.trim().toLowerCase()

/**
 * Workspace role id for a product role. Admin = the "Admin" role. Support agent = the "Collaborator" role (the default
 * role that can work conversations and CRM without managing the account); if a workspace renamed it, fall back to the first
 * default role that is neither Admin nor Viewer. `undefined` when roles are missing, so the form can refuse to send.
 */
export type RoleLite = Pick<IRole, "_id" | "name" | "entityType" | "roleType">

export function pickRoleId(roles: readonly RoleLite[], choice: TeamRoleChoice): string | undefined {
  // Only the workspace's default roles: a custom role that happens to be called "Admin" never receives admin invites.
  const workspaceRoles = roles.filter((r) => (r.entityType === "workspace" || r.entityType === undefined) && r.roleType !== "custom")
  const byName = (name: string) => workspaceRoles.find((r) => norm(r.name) === name)
  if (choice === "admin") return byName("admin")?._id
  const collaborator = byName("collaborator")
  if (collaborator) return collaborator._id
  const fallback = workspaceRoles.find((r) => !["admin", "viewer"].includes(norm(r.name)) && r.roleType !== "custom")
  return fallback?._id
}

/** Role id for an existing invite/member role name: the product role if it maps, else an exact name match (custom roles). */
export function roleIdForName(roles: readonly RoleLite[], roleName: string): string | undefined {
  const choice = choiceOfRoleName(roleName)
  if (choice) return pickRoleId(roles, choice)
  return roles.find((r) => norm(r.name) === norm(roleName))?._id
}

/** Which product role a role name stands for (`null` when it is a custom role the product does not model). */
export function choiceOfRoleName(roleName: string): TeamRoleChoice | null {
  const n = norm(roleName)
  if (n === "admin" || n === "owner") return "admin"
  if (n === "collaborator") return "agent"
  return null
}

/**
 * How a member's JSYNQ workspace role reads in Attende-ai. The members API returns only the role NAME ("Owner" for the
 * owner, "Member" when there is no role), so the name is matched against the workspace's role list, which carries the
 * role type: only DEFAULT roles map to product roles; a custom role keeps its own name, even if it is called "Admin".
 */
export type MemberAccess =
  | { kind: "owner" }
  | { kind: "admin" }
  | { kind: "agent" }
  | { kind: "viewer" }
  | { kind: "custom"; name: string }
  | { kind: "none" }

export function resolveMemberAccess(roleName: string, roles: readonly RoleLite[]): MemberAccess {
  const n = norm(roleName)
  if (n === "owner") return { kind: "owner" }
  const role = roles.find((r) => (r.entityType === "workspace" || r.entityType === undefined) && norm(r.name) === n)
  if (!role) return n === "member" || n === "" ? { kind: "none" } : { kind: "custom", name: roleName }
  if (role.roleType === "custom") return { kind: "custom", name: role.name }
  if (n === "admin") return { kind: "admin" }
  if (n === "collaborator") return { kind: "agent" }
  if (n === "viewer") return { kind: "viewer" }
  return { kind: "custom", name: role.name }
}

/**
 * Whether the screen offers invite/remove. Only the owner and default admins; anything else (custom roles included) is
 * read-only here. The backend checks its own permissions on every call: this only avoids offering actions that would fail.
 */
export const canManageTeam = (access: MemberAccess | null): boolean => access?.kind === "owner" || access?.kind === "admin"

/** True when removing this member would leave the team without anyone who can manage it (owner or admin). */
export function isLastManager(member: Pick<TeamMember, "id" | "roleName">, members: readonly Pick<TeamMember, "id" | "roleName">[], roles: readonly RoleLite[]): boolean {
  if (!canManageTeam(resolveMemberAccess(member.roleName, roles))) return false
  return !members.some((m) => m.id !== member.id && canManageTeam(resolveMemberAccess(m.roleName, roles)))
}

export function inviteRoleName(invite: Pick<IInvite, "role">): string {
  return typeof invite.role === "string" ? "" : (invite.role?.name ?? "")
}

export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

export function isAlreadyOnTeam(email: string, members: readonly Pick<TeamMember, "email">[], invites: readonly Pick<TeamInvite, "email" | "status">[]): boolean {
  const target = norm(email)
  return members.some((m) => norm(m.email) === target) || invites.some((i) => i.status === "pending" && norm(i.email) === target)
}

export type SeatUsage = { used: number; limit: number | null; full: boolean; remaining: number | null }

/** Members and pending invites both hold a seat. A missing/zero limit means "not enforced here". */
export function seatUsage(params: { members: number; pendingInvites: number; limit?: number | null }): SeatUsage {
  const used = params.members + params.pendingInvites
  const limit = typeof params.limit === "number" && params.limit > 0 ? params.limit : null
  return { used, limit, full: limit !== null && used >= limit, remaining: limit === null ? null : Math.max(0, limit - used) }
}

/** `entitlements.limits.seats` of `GET /attende/entitlements` (Attende backend), read defensively. */
export function resolveSeatLimit(entitlementsResponse: unknown): number | null {
  const seats = (entitlementsResponse as { entitlements?: { limits?: { seats?: unknown } } | null } | null | undefined)
    ?.entitlements?.limits?.seats
  return typeof seats === "number" && Number.isFinite(seats) && seats > 0 ? seats : null
}
