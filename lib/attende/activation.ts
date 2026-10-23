import { BOTS_ROUTES } from "components/bots-app/brand"
import type { AgentView } from "lib/attende/agents/types"
import type { BotsLine } from "lib/bots-app/lines"
import { businessContext } from "./agents/context"

/**
 * Activation model shared by the home (/start) and the guided setup (/setup): the steps to the first conversation an
 * AI agent answers, in their real dependency order, computed only from what the API returns. Pure: no I/O, no React.
 *
 * What each step reads:
 * - channel:   the workspace's channels (WhatsApp, Instagram, SMS sessions); done when one is connected.
 * - agent:     the AI agents list; done when one exists.
 * - knowledge: what the agent knows about the business: a real description (see `businessContext`) or documents.
 *              Documents are workspace-wide, so one agent with documents is enough. The agents list has no reading
 *              status, so a sent document counts here; the agent page blocks activation until one is read.
 *              The business name alone is never enough.
 * - test:      the rules check (`lastTestPassedAt`, a passed dry run, cleared by a setup edit). It is NOT a conversation
 *              with the AI, and the copy says so.
 * - activate:  the chosen agent is `live` and at least one of its channels exists, is connected and its binding active.
 */
export const ACTIVATION_STEPS = ["channel", "agent", "knowledge", "test", "activate"] as const
export type ActivationStepId = (typeof ACTIVATION_STEPS)[number]

/** `done` and `todo` are confirmed by the API; `unknown` means the data could not be read (never shown as done). */
export type StepState = "done" | "todo" | "unknown"

/** Why a step is in its state. Each code has its own sentence and action in the UI. */
export type StepCode =
  | "channel_connected"
  | "channel_none"
  | "channel_offline"
  | "channel_unknown"
  | "agent_created"
  | "agent_none"
  | "agent_unknown"
  | "knowledge_added"
  | "knowledge_description"
  | "knowledge_none"
  | "knowledge_needs_agent"
  | "knowledge_unknown"
  | "test_passed"
  | "test_not_run"
  | "test_needs_agent"
  | "test_needs_channel"
  | "test_channel_offline"
  | "test_unknown"
  | "activate_active"
  | "activate_paused"
  | "activate_needs_agent"
  | "activate_needs_channel"
  | "activate_channel_offline"
  | "activate_unknown"

export type ActivationStep = { id: ActivationStepId; state: StepState; code: StepCode; href: string }

/** Where an agent is on its way to answering: created (no channel), on a channel but not answering, answering. */
export type AgentStage = "created" | "on_channel" | "active"

export type ActivationInput = {
  lines: Pick<BotsLine, "status">[]
  /** Channel kinds whose sessions could not be read. All three failed = channels unknown. */
  failedChannels: readonly string[]
  /** `null` when the agents list could not be read. */
  agents: AgentView[] | null
}

export type Activation = {
  steps: ActivationStep[]
  done: number
  total: number
  /** First step not done, in order. `null` when every step is done. */
  next: ActivationStep | null
  /** The agent the agent-specific steps are about (the most advanced one; newest wins a tie). */
  focusAgent: AgentView | null
  /** An AI agent is really answering on a channel: the goal of activation. */
  activated: boolean
  /** Some data could not be read, so some steps say "could not check". */
  partial: boolean
}

const CHANNEL_KINDS = 3

const usableLine = (line: AgentView["lines"][number]) => line.exists !== false && line.connected !== false
const brokenLine = (line: AgentView["lines"][number]) => !usableLine(line)

/** Answering = `live` with at least one channel that exists, is connected and whose binding is not switched off. */
export const isAgentAnswering = (agent: Pick<AgentView, "status" | "lines">): boolean =>
  agent.status === "live" && agent.lines.some((line) => usableLine(line) && line.active !== false)

export function agentStage(agent: Pick<AgentView, "status" | "lines">): AgentStage {
  if (agent.lines.length === 0) return "created"
  return isAgentAnswering(agent) ? "active" : "on_channel"
}

const STAGE_RANK: Record<AgentStage, number> = { created: 0, on_channel: 1, active: 2 }

/** The most advanced agent: answering > on a channel > created, then tested, then with documents; list order (newest first) breaks ties. */
export function pickFocusAgent(agents: AgentView[]): AgentView | null {
  let best: AgentView | null = null
  let bestScore = -1
  for (const agent of agents) {
    const score = STAGE_RANK[agentStage(agent)] * 4 + (agent.lastTestPassedAt ? 2 : 0) + ((agent.documents ?? []).length > 0 ? 1 : 0)
    if (score > bestScore) {
      best = agent
      bestScore = score
    }
  }
  return best
}

/** Steps that only exist once an agent does: they show the dependency, not another "Create AI agent" button. */
export const needsAgent = (step: Pick<ActivationStep, "code">): boolean =>
  step.code === "knowledge_needs_agent" || step.code === "test_needs_agent" || step.code === "activate_needs_agent"

export const agentHref = (agent: Pick<AgentView, "id">, tab?: "setup" | "knowledge"): string =>
  `${BOTS_ROUTES.agents}/${encodeURIComponent(agent.id)}${tab ? `?tab=${tab}` : ""}`

const NEW_AGENT_HREF = `${BOTS_ROUTES.agents}/new`

/** Nothing at all could be read (no channel kind, no agents): show an error with retry, not an all-to-do checklist. */
export const activationUnreadable = (input: Pick<ActivationInput, "failedChannels" | "agents">): boolean =>
  input.failedChannels.length >= CHANNEL_KINDS && input.agents === null

export function computeActivation({ lines, failedChannels, agents }: ActivationInput): Activation {
  const anyConnected = lines.some((line) => line.status === "connected")
  const channelsUnknown = failedChannels.length >= CHANNEL_KINDS
  const channelsPartial = failedChannels.length > 0
  const channel: ActivationStep = anyConnected
    ? { id: "channel", state: "done", code: "channel_connected", href: BOTS_ROUTES.lines }
    : channelsUnknown || channelsPartial
      ? { id: "channel", state: "unknown", code: "channel_unknown", href: BOTS_ROUTES.lines }
      : { id: "channel", state: "todo", code: lines.length > 0 ? "channel_offline" : "channel_none", href: BOTS_ROUTES.lines }

  const focusAgent = agents ? pickFocusAgent(agents) : null

  let agent: ActivationStep
  let knowledge: ActivationStep
  let test: ActivationStep
  let activate: ActivationStep

  if (agents === null) {
    agent = { id: "agent", state: "unknown", code: "agent_unknown", href: BOTS_ROUTES.agents }
    knowledge = { id: "knowledge", state: "unknown", code: "knowledge_unknown", href: BOTS_ROUTES.agents }
    test = { id: "test", state: "unknown", code: "test_unknown", href: BOTS_ROUTES.agents }
    activate = { id: "activate", state: "unknown", code: "activate_unknown", href: BOTS_ROUTES.agents }
  } else if (!focusAgent) {
    agent = { id: "agent", state: "todo", code: "agent_none", href: NEW_AGENT_HREF }
    knowledge = { id: "knowledge", state: "todo", code: "knowledge_needs_agent", href: NEW_AGENT_HREF }
    test = { id: "test", state: "todo", code: "test_needs_agent", href: NEW_AGENT_HREF }
    activate = { id: "activate", state: "todo", code: "activate_needs_agent", href: NEW_AGENT_HREF }
  } else {
    agent = { id: "agent", state: "done", code: "agent_created", href: agentHref(focusAgent) }

    const withDocs = agents.find((a) => (a.documents ?? []).length > 0)
    knowledge = withDocs
      ? { id: "knowledge", state: "done", code: "knowledge_added", href: agentHref(withDocs, "knowledge") }
      : businessContext(focusAgent.form).description
        ? { id: "knowledge", state: "done", code: "knowledge_description", href: agentHref(focusAgent, "setup") }
        : { id: "knowledge", state: "todo", code: "knowledge_none", href: agentHref(focusAgent, "knowledge") }

    const hasLine = focusAgent.lines.length > 0
    const lineBroken = focusAgent.lines.some(brokenLine)
    if (focusAgent.lastTestPassedAt) test = { id: "test", state: "done", code: "test_passed", href: agentHref(focusAgent) }
    else if (!hasLine) test = { id: "test", state: "todo", code: "test_needs_channel", href: anyConnected ? agentHref(focusAgent, "setup") : BOTS_ROUTES.lines }
    else if (lineBroken) test = { id: "test", state: "todo", code: "test_channel_offline", href: BOTS_ROUTES.lines }
    else test = { id: "test", state: "todo", code: "test_not_run", href: agentHref(focusAgent) }

    if (isAgentAnswering(focusAgent)) activate = { id: "activate", state: "done", code: "activate_active", href: agentHref(focusAgent) }
    else if (!hasLine)
      activate = { id: "activate", state: "todo", code: "activate_needs_channel", href: anyConnected ? agentHref(focusAgent, "setup") : BOTS_ROUTES.lines }
    else if (lineBroken || focusAgent.status === "live") activate = { id: "activate", state: "todo", code: "activate_channel_offline", href: BOTS_ROUTES.lines }
    else activate = { id: "activate", state: "todo", code: "activate_paused", href: agentHref(focusAgent) }
  }

  const steps = [channel, agent, knowledge, test, activate]
  const done = steps.filter((s) => s.state === "done").length
  return {
    steps,
    done,
    total: steps.length,
    next: steps.find((s) => s.state !== "done") ?? null,
    focusAgent,
    activated: activate.state === "done",
    partial: channelsPartial || agents === null,
  }
}

/** Day-to-day numbers for the home once an agent answers. Every value is `null` when its source could not be read. */
export type DailySummary = {
  /** Conversations waiting for a reply from the team (the inbox "needs reply" queue, whole workspace). */
  waitingForTeam: number | null
  unread: number | null
  /** Channels that are not connected and not switched off on purpose. */
  channelsNeedingAttention: BotsLine[]
  /** Some channel kinds could not be read: the attention list may be incomplete. */
  channelsPartial: boolean
  /** Agents really answering (see `isAgentAnswering`). `null` when the agents could not be read. */
  activeAgents: AgentView[] | null
  /** Agents marked live whose channel dropped: they are not answering. */
  agentsNeedingAttention: AgentView[] | null
}

export function computeDailySummary(input: {
  lines: BotsLine[]
  failedChannels: readonly string[]
  agents: AgentView[] | null
  inbox: { needsReply: number; unread: number } | null
}): DailySummary {
  return {
    waitingForTeam: input.inbox ? input.inbox.needsReply : null,
    unread: input.inbox ? input.inbox.unread : null,
    channelsNeedingAttention: input.lines.filter((line) => line.status !== "connected" && line.status !== "disabled"),
    channelsPartial: input.failedChannels.length > 0,
    activeAgents: input.agents ? input.agents.filter(isAgentAnswering) : null,
    agentsNeedingAttention: input.agents ? input.agents.filter((a) => a.status === "live" && !isAgentAnswering(a)) : null,
  }
}
