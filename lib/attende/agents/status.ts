import { validateForm } from "./form"
import type { AgentLineView, AgentTemplate, AgentView } from "./types"

/**
 * Where an agent is in its life, as the user sees it:
 * - `incomplete`: created, but its answers no longer pass the model's questions (only known when the template loaded);
 * - `no_channels`: set up, not attached to any channel (API `draft`);
 * - `paused`: attached to channels, answering on none of them (API `paused`);
 * - `live`: answering on at least one channel (API `live`).
 * A channel that is gone or offline is a separate warning (see `brokenLines`), never hidden behind the state.
 */
export type AgentDisplayStatus = "incomplete" | "no_channels" | "paused" | "live"

export const brokenLines = (agent: Pick<AgentView, "lines">): AgentLineView[] => agent.lines.filter((l) => l.exists === false || l.connected === false)

/** Channels on which the agent is answering right now (the binding is active). */
export const activeLines = (agent: Pick<AgentView, "lines">): AgentLineView[] => agent.lines.filter((l) => l.active === true)

export function displayStatus(agent: Pick<AgentView, "status" | "lines" | "form">, template?: AgentTemplate | null): AgentDisplayStatus {
  if (template && validateForm(template, agent.form ?? {}).length > 0) return "incomplete"
  if (agent.status === "draft" || agent.lines.length === 0) return "no_channels"
  return agent.status === "live" ? "live" : "paused"
}

/** Things worth saying before turning an agent on. The server answers the same in `warnings`, after the fact. */
export function goLiveWarnings(agent: Pick<AgentView, "lastTestPassedAt" | "documents">): Array<"not_tested" | "no_documents"> {
  const out: Array<"not_tested" | "no_documents"> = []
  if (!agent.lastTestPassedAt) out.push("not_tested")
  if ((agent.documents ?? []).length === 0) out.push("no_documents")
  return out
}

/** The API attaches at most this many channels to one agent (docs/attende/agents.md). */
export const MAX_AGENT_LINES = 5

export const lineKey = (line: { channel: string; sessionId: string }): string => `${line.channel}:${line.sessionId}`

/** The inbox list filtered to conversations the AI is handling. */
export const AI_INBOX_HREF = "/inbox?filter=ai"

/** Tabs of /ai-agents/[id], also accepted as `?tab=`. Lives here (not in the client component) so the server page can read it. */
export const AGENT_TABS = ["overview", "setup", "knowledge", "activity"] as const
export type AgentTab = (typeof AGENT_TABS)[number]
