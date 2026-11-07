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
  | (NodeBase & {
      kind: "set_field"
      /** Custom field id of the board, a JSYNQ CRM field (`email`, `phone`, `company`, `estimateRevenue`, `contactName`) or `card:title` / `card:owner`. */
      fieldId: string
      /** Variables allowed (`{{lead.name}}`, `{{answer}}`). */
      value: string
      projectId?: string
      boardId?: string
      fieldType?: string
    })
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
  | (NodeBase & {
      kind: "create_card"
      projectId: string
      boardId: string
      columnId: string
      title: string
      fields?: Array<{ fieldId: string; value: string }>
      ownerUserId?: string
      linkConversation?: boolean
    })
  | (NodeBase & { kind: "duplicate_card"; columnId?: string; projectId?: string; boardId?: string })
  | (NodeBase & { kind: "delete_card"; confirmed?: boolean })
  | (NodeBase & { kind: "move_board"; projectId: string; boardId: string; columnId: string })
  | (NodeBase & { kind: "set_value"; value: string })
  | (NodeBase & { kind: "set_owner"; userId: string })
  | (NodeBase & { kind: "remove_label"; labelText: string; projectId?: string })
  | (NodeBase & { kind: "add_comment"; text: string })
  | (NodeBase & { kind: "add_checklist_item"; title: string })
  | (NodeBase & { kind: "check_checklist_item"; title: string; checked: boolean })
  | (NodeBase & { kind: "mark_read" })
  | (NodeBase & { kind: "assign_conversation"; userId: string })
  | (NodeBase & { kind: "save_reply"; fieldId: string; projectId?: string; boardId?: string })
  | (NodeBase & { kind: "wait_reply"; minutes: number; businessHoursOnly?: boolean; saveAnswerTo?: string })

export type AdvancedAutomationNodeKind = AdvancedAutomationNode["kind"]

export type AdvancedAutomationEdge = { id: string; from: string; output: string; to: string }

export const CONVERSATION_TRIGGER_KINDS = [
  "new_conversation",
  "keyword",
  "any_message",
  "contact_no_reply",
  "team_no_reply",
  "handed_to_human",
  "conversation_assigned",
] as const
export const CRM_TRIGGER_KINDS = ["card_created", "card_stage_changed", "card_label_added", "card_won", "card_lost"] as const
export const TIME_TRIGGER_KINDS = ["scheduled", "date_field"] as const
export const OTHER_TRIGGER_KINDS = ["webhook", "manual"] as const
export const TRIGGER_KINDS = [...CONVERSATION_TRIGGER_KINDS, ...CRM_TRIGGER_KINDS, ...TIME_TRIGGER_KINDS, ...OTHER_TRIGGER_KINDS] as const
export type AdvancedAutomationTriggerKind = (typeof TRIGGER_KINDS)[number]

/** Same limits as the server (`TRIGGER_LIMITS`). */
export const TRIGGER_LIMITS = { keywords: 20, keywordChars: 60, silenceMinutesMin: 5, silenceMinutesMax: 60 * 24 * 30 } as const

export type AdvancedAutomationTriggerFilters = {
  channels?: AutomationChannelBinding["channel"][]
  projectId?: string
  boardId?: string
  columnIds?: string[]
  /** Label names (case-insensitive). */
  labels?: string[]
}

export type AdvancedAutomationTrigger = {
  kind: AdvancedAutomationTriggerKind
  dedupeDays: number
  filter?: Record<string, unknown>
  filters?: AdvancedAutomationTriggerFilters
  oncePerLead?: boolean
  keywords?: string[]
  outsideBusinessHoursOnly?: boolean
  minutes?: number
  userId?: string
  projectId?: string
  boardId?: string
  columnId?: string
  labelText?: string
  schedule?: { frequency: "daily" | "weekly"; time: string; weekdays?: number[] }
  dateField?: { fieldId: string; offsetDays: number; time: string }
}

/** Webhook trigger state of a saved automation (the secret itself is never returned). */
export type AdvancedAutomationWebhookInfo = { configured: boolean; setAt?: string | null; path: string }

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
  webhook?: AdvancedAutomationWebhookInfo
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

export type AdvancedAutomationPreviewUnavailable =
  | { kind: "condition"; type: string }
  | { kind: "ai_step"; nodeId: string }
  | { kind: "refused_in_preview"; nodeId: string }

export type AdvancedAutomationPreviewResult = {
  state: Record<string, unknown>
  effects: PreviewEffect[]
  finished: boolean
  unavailable?: AdvancedAutomationPreviewUnavailable[]
}
