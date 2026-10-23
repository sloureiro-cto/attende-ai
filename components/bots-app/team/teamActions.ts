import { cancelWorkspaceInviteAction } from "actions/invites/cancelWorkspaceInvite"
import { removeWorkspaceInviteAction } from "actions/invites/removeInvite"
import { sendWorkspaceInvitesAction } from "actions/invites/sendWorkspaceInvites"
import { removeMemberFromWorkspace } from "actions/workspaces/removeMemberFromWorkspace"

export type TeamActionResult = { ok: true } | { ok: false; error?: string }

/** Everything the team page can do to the backend. Injected into the view so tests never hit a server action. */
export type TeamActions = {
  invite: (args: { workspaceId: string; email: string; roleId: string }) => Promise<TeamActionResult>
  /** Pending invites are canceled, delivery-failed ones removed. */
  revokeInvite: (args: { inviteId: string; status: "pending" | "failed" }) => Promise<TeamActionResult>
  removeMember: (args: { workspaceId: string; memberId: string }) => Promise<TeamActionResult>
}

const fromOutput = (out: { success: boolean; error?: string }): TeamActionResult => (out.success ? { ok: true } : { ok: false, error: out.error })

export const defaultTeamActions: TeamActions = {
  invite: async ({ workspaceId, email, roleId }) => fromOutput(await sendWorkspaceInvitesAction({ workspaceId, invitees: [{ email, role: roleId }] })),
  revokeInvite: async ({ inviteId, status }) =>
    fromOutput(status === "failed" ? await removeWorkspaceInviteAction({ inviteId }) : await cancelWorkspaceInviteAction({ inviteId })),
  removeMember: async ({ workspaceId, memberId }) => fromOutput(await removeMemberFromWorkspace({ workspaceId, memberId })),
}
