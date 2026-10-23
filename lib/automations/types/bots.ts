/** Sales bots: `/api/sales-bots` graph, list / detail / save, stats and preview contracts. */

import { type AutomationChannelBinding } from "./common"

export type SalesBotStatus = "draft" | "active" | "paused"

export type SalesBotChoice = { id: string; label: string }

type NodeBase = { id: string; x: number; y: number; label?: string }

export type SalesBotHandoffAssignMode = "all_crm_members" | "specific_user" | "member_list" | "by_workspace_role"

export type SalesBotNode =
  | (NodeBase & {
      kind: "send_message"
      text: string
      replyMode: "none" | "buttons" | "list" | "free"
      options?: SalesBotChoice[]
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
  | (NodeBase & { kind: "goto_bot"; botId: string })
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
      assignMode?: SalesBotHandoffAssignMode
      userIds?: string[]
      specificUserId?: string
      workspaceRoleId?: string
    })
  | (NodeBase & { kind: "webhook"; url: string })
  | (NodeBase & { kind: "send_meta_template"; templateId: string })

export type SalesBotNodeKind = SalesBotNode["kind"]

export type SalesBotEdge = { id: string; from: string; output: string; to: string }

export type SalesBotTrigger = {
  kind: "new_conversation" | "manual"
  dedupeDays: number
  filter?: Record<string, unknown>
}

export type SalesBotIssue = { path: string; message: string; blocking?: boolean }

export type SalesBotListItem = {
  id: string
  name: string
  status: SalesBotStatus
  channels: AutomationChannelBinding[]
  stepCount: number
  version: number
  updatedAt: string
  stats30d: { started: number; completed: number }
}

export type SalesBotListResponse = {
  items: SalesBotListItem[]
  total: number
  page: number
  limit: number
  totals: { all: number; active: number; paused: number; draft: number }
}

export type SalesBotDetail = {
  _id: string
  id: string
  name: string
  status: SalesBotStatus
  channels: AutomationChannelBinding[]
  trigger: SalesBotTrigger
  stopOnHumanReply: boolean
  startNodeId: string
  nodes: SalesBotNode[]
  edges: SalesBotEdge[]
  version: number
  updatedAt: string
  issues: SalesBotIssue[]
}

export type SaveSalesBotInput = {
  name: string
  status?: SalesBotStatus
  channels?: AutomationChannelBinding[]
  trigger?: SalesBotTrigger
  stopOnHumanReply?: boolean
  startNodeId?: string
  nodes?: SalesBotNode[]
  edges?: SalesBotEdge[]
}

export type SalesBotStatsSummary = {
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
      options?: SalesBotChoice[]
      delivery?: { kind: "buttons" | "list" | "quick_replies" | "text"; warnings: string[]; text?: string }
    }
  | { type: string; [key: string]: unknown }

export type SalesBotPreviewResult = {
  state: Record<string, unknown>
  effects: PreviewEffect[]
  finished: boolean
}
