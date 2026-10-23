/** Simulation (`/api/messaging-automations/:id/simulate`): trace and result contracts. */

import { type AutomationChannel } from "./common"

export type RouterPathStatus = "chosen" | "not_matched" | "not_evaluated"

export type RouterPathTrace = {
  pathId: string
  name: string
  kind: "ai" | "condition" | "split" | "else"
  status: RouterPathStatus
  detail?: string
}

export type RouterDecisionTrace = {
  chosen: string[]
  paths: RouterPathTrace[]
  classification?: { pathId: string | null; confidence: number | null; reason?: string; unavailable?: boolean }
}

export type GraphWalkTraceNode = {
  nodeId: string
  kind: "condition" | "action" | "join" | "router"
  durationMs: number
  result?: boolean
  router?: RouterDecisionTrace
}

export type GraphWalkTrace = {
  triggerMatched: boolean
  blockedReason?: "invalid_graph" | "trigger_no_match" | "direct_only_gate" | "no_actions"
  nodes: GraphWalkTraceNode[]
  actionNodeIds?: string[]
}

export type SimulateActionSummary = {
  type: string
  summary: string
  ignoredOnChannel: boolean
}

export type SimulateAutomationResult = {
  matched: boolean
  matchedRuleIndex: number
  channel: AutomationChannel
  skippedReason?: "hide_group_messages"
  usedConversation?: string | null
  unevaluated?: Array<{ conditionType: string; reason: string }>
  actions?: SimulateActionSummary[]
  trace?: GraphWalkTrace | null
}

export type SimulateAutomationInput = {
  automationId?: string
  root?: Record<string, unknown>
  channel: AutomationChannel
  messageText: string
  chatType?: "direct" | "group"
  inboundCount?: number
  conversationId?: string
  sessionId?: string
  contactPhone?: string
  simulatedAt?: string
  trigger?: "dm" | "comment"
  postId?: string
}
