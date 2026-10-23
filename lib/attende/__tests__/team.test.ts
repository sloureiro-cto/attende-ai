import type { IRole } from "app/_types/Role"
import { canManageTeam, choiceOfRoleName, isAlreadyOnTeam, isLastManager, isValidEmail, pickRoleId, resolveMemberAccess, resolveSeatLimit, seatUsage } from "../team"

const role = (id: string, name: string, extra: Partial<IRole> = {}) =>
  ({ _id: id, name, entityType: "workspace", roleType: "default", permissions: [], entityId: "w", workspace: "w", createdAt: "", updatedAt: "", ...extra }) as unknown as IRole

const ROLES = [role("r-admin", "Admin"), role("r-collab", "Collaborator"), role("r-viewer", "Viewer"), role("r-custom", "Finance", { roleType: "custom" as never })]

describe("pickRoleId", () => {
  it("maps Admin and Support agent onto the default Admin / Collaborator roles", () => {
    expect(pickRoleId(ROLES, "admin")).toBe("r-admin")
    expect(pickRoleId(ROLES, "agent")).toBe("r-collab")
  })
  it("matches names case-insensitively", () => {
    expect(pickRoleId([role("a", "ADMIN"), role("c", "collaborator")], "admin")).toBe("a")
  })
  it("falls back to the first default role that is not Admin/Viewer when Collaborator was renamed", () => {
    expect(pickRoleId([role("a", "Admin"), role("m", "Member"), role("v", "Viewer")], "agent")).toBe("m")
  })
  it("never hands out a custom role or Viewer as the agent role", () => {
    expect(pickRoleId([role("a", "Admin"), role("v", "Viewer"), role("c", "Finance", { roleType: "custom" as never })], "agent")).toBeUndefined()
  })
  it("returns undefined without roles", () => {
    expect(pickRoleId([], "admin")).toBeUndefined()
  })
  it("ignores non-workspace roles", () => {
    expect(pickRoleId([role("p", "Admin", { entityType: "project" })], "admin")).toBeUndefined()
  })
})

describe("choiceOfRoleName", () => {
  it.each([
    ["Admin", "admin"],
    ["owner", "admin"],
    ["Collaborator", "agent"],
    ["Finance", null],
  ])("%s -> %s", (name, expected) => expect(choiceOfRoleName(name)).toBe(expected))
})

describe("isValidEmail / isAlreadyOnTeam", () => {
  it("validates addresses", () => {
    expect(isValidEmail("ana@empresa.com")).toBe(true)
    expect(isValidEmail("  ana@empresa.com ")).toBe(true)
    expect(isValidEmail("ana@empresa")).toBe(false)
    expect(isValidEmail("ana empresa@x.com")).toBe(false)
    expect(isValidEmail("")).toBe(false)
  })
  it("detects members and pending invites, but not failed or revoked ones", () => {
    const members = [{ email: "Ana@Empresa.com" }]
    const invites = [
      { email: "bob@x.co", status: "pending" as const },
      { email: "cy@x.co", status: "failed" as const },
    ]
    expect(isAlreadyOnTeam("ana@empresa.com", members, invites)).toBe(true)
    expect(isAlreadyOnTeam(" BOB@x.co ", members, invites)).toBe(true)
    expect(isAlreadyOnTeam("cy@x.co", members, invites)).toBe(false)
    expect(isAlreadyOnTeam("new@x.co", members, invites)).toBe(false)
  })
})

describe("seatUsage / resolveSeatLimit", () => {
  it("counts members plus pending invites against the limit", () => {
    expect(seatUsage({ members: 1, pendingInvites: 1, limit: 3 })).toEqual({ used: 2, limit: 3, full: false, remaining: 1 })
    expect(seatUsage({ members: 2, pendingInvites: 1, limit: 3 })).toEqual({ used: 3, limit: 3, full: true, remaining: 0 })
    expect(seatUsage({ members: 5, pendingInvites: 0, limit: 3 }).remaining).toBe(0)
  })
  it("does not enforce without a (positive) limit", () => {
    expect(seatUsage({ members: 9, pendingInvites: 0 })).toEqual({ used: 9, limit: null, full: false, remaining: null })
    expect(seatUsage({ members: 9, pendingInvites: 0, limit: 0 }).limit).toBeNull()
  })
  it("reads entitlements.attende.limits.seats defensively", () => {
    expect(resolveSeatLimit({ entitlements: { attende: { limits: { seats: 5 } } } })).toBe(5)
    expect(resolveSeatLimit({ entitlements: { bots: true } })).toBeNull()
    expect(resolveSeatLimit({ entitlements: { attende: { limits: { seats: "5" } } } })).toBeNull()
    expect(resolveSeatLimit(null)).toBeNull()
    expect(resolveSeatLimit(undefined)).toBeNull()
  })
})

describe("resolveMemberAccess", () => {
  const roles = [
    { _id: "a", name: "Admin", entityType: "workspace" as const, roleType: "default" as never },
    { _id: "c", name: "Collaborator", entityType: "workspace" as const, roleType: "default" as never },
    { _id: "v", name: "Viewer", entityType: "workspace" as const, roleType: "default" as never },
    { _id: "x", name: "Supervisor", entityType: "workspace" as const, roleType: "custom" as never },
  ]
  it("maps default roles and the owner by role type, never by a lookalike name", () => {
    expect(resolveMemberAccess("Owner", roles)).toEqual({ kind: "owner" })
    expect(resolveMemberAccess("Admin", roles)).toEqual({ kind: "admin" })
    expect(resolveMemberAccess("Collaborator", roles)).toEqual({ kind: "agent" })
    expect(resolveMemberAccess("Viewer", roles)).toEqual({ kind: "viewer" })
    expect(resolveMemberAccess("Supervisor", roles)).toEqual({ kind: "custom", name: "Supervisor" })
    expect(resolveMemberAccess("Member", roles)).toEqual({ kind: "none" })
    expect(resolveMemberAccess("Admin", [{ ...roles[0]!, roleType: "custom" as never }])).toEqual({ kind: "custom", name: "Admin" })
  })
  it("only the owner and default admins manage the team", () => {
    expect(canManageTeam({ kind: "owner" })).toBe(true)
    expect(canManageTeam({ kind: "admin" })).toBe(true)
    expect(canManageTeam({ kind: "custom", name: "Admin" })).toBe(false)
    expect(canManageTeam(null)).toBe(false)
  })
  it("never sends an admin invite with a custom role named Admin", () => {
    expect(pickRoleId([{ ...roles[0]!, roleType: "custom" as never }], "admin")).toBeUndefined()
  })
})

describe("isLastManager", () => {
  const m = (id: string, roleName: string) => ({ id, roleName })
  it("protects the only person who can manage the team", () => {
    const admin = m("1", "Admin")
    const agent = m("2", "Collaborator")
    expect(isLastManager(admin, [admin, agent], ROLES)).toBe(true)
    expect(isLastManager(agent, [admin, agent], ROLES)).toBe(false)
  })
  it("lets an admin be removed while the owner or another admin remains", () => {
    expect(isLastManager(m("1", "Admin"), [m("1", "Admin"), m("0", "Owner")], ROLES)).toBe(false)
    expect(isLastManager(m("1", "Admin"), [m("1", "Admin"), m("3", "Admin")], ROLES)).toBe(false)
  })
})
