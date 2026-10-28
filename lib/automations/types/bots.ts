/** Advanced automations (renamed from sales bots): `/api/messaging-automations/advanced` graph, list / detail / save, stats and preview contracts. */

import { type AutomationChannelBinding } from "./common"

export type AdvancedAutomationStatus = "draft" | "active" | "paused"

export type AdvancedAutomationChoice = { id: string; label: string }

type NodeBase = { id: string; x: number; y: number; label?: string }

export type AdvancedAutomationHandoffAssignMode = "all_crm_members" | "specific_user" | "member_list" | "by_workspace_role"

export type AdvancedAutomationNode =
  | (NodeBase & {
      kind: "send_message"
      text: string
      replyMode: "none" | "buttons" | "list" | "free"
      options?: AdvancedAutomationChoice[]
      noReplyMinutes?: number
      noReplyBusinessHoursOnly?: boolean
      saveAnswerTo?: string
      attachmentUrl?: string
    })
  | (NodeBase & {
      kind: "condition"
      rows: Array<{ id: string; name: string; condition: Record<string, unknown> }>
    })
  | (NodeBase & { kind: "wait"; minutes: number })
  | (NodeBase & { kind: "split"; paths: Array<{ id: string; name: string; percent: number }> })
  | (NodeBase & { kind: "goto_automation"; automationId: string })
  | (NodeBase & { kind: "stop" })
  | (NodeBase & { kind: "set_field"; fieldId: string; value: string })
  | (NodeBase & { kind: "move_stage"; columnId: string; projectId?: string; boardId?: string })
  | (NodeBase & {
      kind: "add_label"
      /** Matched by name (case-insensitive) in the lead's own project; created there when missing. */
      labelText: string
      /** Used when the label has to be created. */
      labelColor?: string
      /** Project the author picked the label from. Informational: the runtime uses the card's project. */
      projectId?: string
    })
  | (NodeBase & { kind: "create_task"; title: string; dueInHours?: number })
  | (NodeBase & { kind: "ai_agent"; instruction: string; saveAnswerTo: string })
  | (NodeBase & {
      kind: "handoff"
      message?: string
      /** `person` (default): the team gets the conversation. `ai`: the Attende AI agent `agentId` takes this one conversation. */
      to?: "person" | "ai"
      /** JSYNQ agent id of the AI agent (the `agentId` of an Attende agent), required with `to: "ai"`. */
      agentId?: string
      assignMode?: AdvancedAutomationHandoffAssignMode
      userIds?: string[]
      specificUserId?: string
      workspaceRoleId?: string
    })
  | (NodeBase & { kind: "webhook"; url: string })
  | (NodeBase & { kind: "send_meta_template"; templateId: string })

export type AdvancedAutomationNodeKind = AdvancedAutomationNode["kind"]

export type AdvancedAutomationEdge = { id: string; from: string; output: string; to: string }

export type AdvancedAutomationTrigger = {
  kind: "new_conversation" | "manual"
  dedupeDays: number
  filter?: Record<string, unknown>
}

export type AdvancedAutomationIssue = { path: string; message: string; blocking?: boolean }

export type AdvancedAutomationListItem = {
  id: string
  name: string
  status: AdvancedAutomationStatus
  channels: AutomationChannelBinding[]
  stepCount: number
  version: number
  updatedAt: string
  stats30d: { started: number; completed: number }
}

export type AdvancedAutomationListResponse = {
  items: AdvancedAutomationListItem[]
  total: number
  page: number
  limit: number
  totals: { all: number; active: number; paused: number; draft: number }
}

export type AdvancedAutomationDetail = {
  _id: string
  id: string
  name: string
  status: AdvancedAutomationStatus
  channels: AutomationChannelBinding[]
  trigger: AdvancedAutomationTrigger
  stopOnHumanReply: boolean
  startNodeId: string
  nodes: AdvancedAutomationNode[]
  edges: AdvancedAutomationEdge[]
  version: number
  updatedAt: string
  issues: AdvancedAutomationIssue[]
}

export type SaveAdvancedAutomationInput = {
  name: string
  status?: AdvancedAutomationStatus
  channels?: AutomationChannelBinding[]
  trigger?: AdvancedAutomationTrigger
  stopOnHumanReply?: boolean
  startNodeId?: string
  nodes?: AdvancedAutomationNode[]
  edges?: AdvancedAutomationEdge[]
}

export type AdvancedAutomationStatsSummary = {
  started: number
  completed: number
  handedOff: number
  stopped: number
  failed: number
  completionRate: number
  nodes: Record<string, { reached: number; exits: Record<string, number>; reachedPct: number }>
}

export type PreviewEffect =
  | {
      type: "send_message"
      nodeId: string
      text: string
      replyMode: "none" | "buttons" | "list" | "free"
      options?: AdvancedAutomationChoice[]
      delivery?: { kind: "buttons" | "list" | "quick_replies" | "text"; warnings: string[]; text?: string }
    }
  | { type: string; [key: string]: unknown }

export type AdvancedAutomationPreviewResult = {
  state: Record<string, unknown>
  effects: PreviewEffect[]
  finished: boolean
}
