/** Rules: `/api/messaging-automations` list / detail / save contracts. */

import { type AutomationChannel, type AutomationChannelBinding, type AutomationStatus } from "./common"

export type AutomationFlowSummary = {
  format: "rules" | "graph"
  trigger: string
  conditionCount: number
  /** Router paths (+ else) or the number of classic rules when there are several. */
  pathCount: number
  actionCount: number
  hasRouter: boolean
  usesAi: boolean
}

export type AutomationListItem = {
  /** `g:<groupId>` (hub) or `<channel>:<templateId>` (classic, single-channel). */
  id: string
  groupId?: string
  name: string
  priority: number
  /** 1-based run order across the workspace. */
  rank: number
  status: AutomationStatus
  channels: Array<AutomationChannelBinding & { templateId: string }>
  summary: AutomationFlowSummary
  updatedAt: string
}

export type AutomationTestCase = {
  id: string
  name: string
  messageText: string
  expect: { matched: boolean; routerPathId?: string }
  channel: AutomationChannel
  chatType?: "direct" | "group"
}

export type AutomationDetail = AutomationListItem & {
  root: Record<string, unknown>
  testCases: AutomationTestCase[]
  unsupportedActions: Array<{ actionType: string; channels: AutomationChannel[] }>
}

export type AutomationListResponse = {
  items: AutomationListItem[]
  total: number
  page: number
  limit: number
  totals: {
    all: number
    active: number
    byChannel: Record<AutomationChannel, number>
  }
}

export type SaveAutomationInput = {
  name: string
  priority?: number
  status?: AutomationStatus
  root: Record<string, unknown>
  channels: AutomationChannelBinding[]
  testCases?: AutomationTestCase[]
}

export type UpdateAutomationInput = Partial<SaveAutomationInput> & { expectedUpdatedAt?: string }
