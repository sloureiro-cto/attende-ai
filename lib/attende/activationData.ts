import { listWorkspaceAgentsAction } from "actions/attende/agents"
import { getUsersFromWorkspace } from "actions/users/getUsersFromWorkspace"
import type { AgentView, JsynqAgentView } from "lib/attende/agents/types"
import { loadInboxOverviewAction } from "lib/bots-app/inbox/actions"
import type { BotsLine } from "lib/bots-app/lines"
import { loadLines } from "lib/bots-app/loadLines"

/** Everything the home and the guided setup read. Each source fails on its own; a failed one is `null` (never zero). */
export type ActivationData = {
  lines: BotsLine[]
  failedChannels: string[]
  agents: AgentView[] | null
  /** Agents that exist only in JSYNQ; `null` with `agents`. */
  jsynqAgents?: JsynqAgentView[] | null
  inbox: { needsReply: number; unread: number } | null
  /** People in the workspace, including you. */
  teamMembers: number | null
}

type Options = { workspaceId: string; withInbox?: boolean; withTeam?: boolean }

/** Server-side, in parallel. Uses the same actions as the channels, agents, inbox and team pages (same access rules). */
export async function loadActivationData({ workspaceId, withInbox = true, withTeam = true }: Options): Promise<ActivationData> {
  const [lines, agents, inbox, members] = await Promise.all([
    loadLines({ withBots: false }),
    listWorkspaceAgentsAction().catch(() => null),
    withInbox ? loadInboxOverviewAction().catch(() => null) : Promise.resolve(null),
    withTeam && workspaceId ? getUsersFromWorkspace(workspaceId).catch(() => null) : Promise.resolve(null),
  ])
  return {
    lines: lines.lines,
    failedChannels: lines.failedChannels,
    agents: agents && agents.success ? agents.data.agents : null,
    jsynqAgents: agents && agents.success ? agents.data.jsynqAgents : null,
    inbox: inbox && inbox.success ? { needsReply: inbox.data.needsReply, unread: inbox.data.unread } : null,
    teamMembers: members && members.success && Array.isArray(members.data) ? members.data.length : null,
  }
}
