/**
 * Modelo visual para o DSL `root` de WhatsApp templates (`{ rules: [...] }`).
 * Suporta condições simples e acções `execute_agent` / `move_linked_card` / `send_text` / `send_to_recipients`.
 * `send_text` envia texto fixo ao WhatsApp — o motor no backend tem de reconhecer `{ type: "send_text", text: "..." }`.
 * `send_to_recipients` envia a um ou mais destinatários (assignee/reporter/utilizadores/números/grupos) em vez de
 * responder ao chat de origem — o backend reconhece `{ type: "send_to_recipients", content, recipients: [...] }`.
 * `all` / `any` aninhados devolvem `null` em parse — usar editor avançado (JSON).
 */

import { DEFAULT_LEAD_DISTRIBUTION_POLICY, type LeadDistributionPolicy } from "@/lib/messaging/leadDistributionTypes"
import type { OutboundWhatsAppRecipient } from "lib/projectAutomations/whatsappRecipients"

export type EventDateDaysAheadOp = "gt" | "gte" | "lt" | "lte" | "eq"

export type VisualWhenType =
  | "first_inbound"
  | "contains"
  | "not_contains"
  | "regex"
  | "llm_match"
  | "llm_conversation_match"
  | "event_date_days_ahead"
  | "within_business_hours"
  | "outside_business_hours"
  | "linked_card_in"
  | "new_lead"
  | "chat_type"
  | "from_group_in"
  | "from_phone_in"
  | "from_ad"
  | "instagram_comment"

export type VisualLinkedCardMatch = {
  projectId: string
  /** CRM tab; empty + empty columnIds = any column in the project */
  boardId?: string
  /** Empty = any column in the project (or board, if boardId is set) */
  columnIds: string[]
}

export type VisualWhen = {
  type: VisualWhenType
  containsValue?: string
  containsCaseInsensitive?: boolean
  regexPattern?: string
  /** UI: rótulos separados por vírgula */
  llmLabelsText?: string
  llmMatch?: string
  llmHint?: string
  /** llm_conversation_match: user-defined classification prompt */
  llmConversationPrompt?: string
  /** event_date_days_ahead: comparison operator */
  eventDateOp?: EventDateDaysAheadOp
  /** event_date_days_ahead: calendar-day threshold */
  eventDateDays?: number
  /** event_date_days_ahead: pass when no date can be extracted */
  eventDateMatchIfMissing?: boolean
  /** linked_card_in: OR of project(+optional columns) rows */
  linkedCardAnyOf?: VisualLinkedCardMatch[]
  /** linked_card_in: match in vs not in */
  linkedCardMode?: "in" | "not_in"
  /** new_lead: workspace-wide vs specific funnel */
  newLeadScope?: "workspace" | "project"
  newLeadProjectId?: string
  newLeadBoardId?: string
  /** Empty = any column in the project (or board, if newLeadBoardId is set) */
  newLeadColumnIds?: string[]
  /** chat_type: direct | group | any */
  chatTypeValue?: "direct" | "group" | "any"
  /** from_group_in: one or more WhatsApp group conversation ids */
  fromGroupIds?: string[]
  /** from_group_in: match in vs not in */
  fromGroupMode?: "in" | "not_in"
  /** from_phone_in: comma-separated phone numbers/contacts */
  fromPhonesText?: string
  /** from_phone_in: match in vs not in */
  fromPhoneMode?: "in" | "not_in"
  /** from_ad (official WhatsApp API): which ads match */
  fromAdMatch?: "any" | "ad_in" | "campaign_in" | "headline_contains"
  /** from_ad ad_in: comma-separated ad ids */
  fromAdIdsText?: string
  /** from_ad campaign_in: comma-separated campaign ids */
  fromAdCampaignIdsText?: string
  /** from_ad headline_contains */
  fromAdHeadline?: string
  /** from_ad: only the message with the ad click, or any message of an ad chat */
  fromAdScope?: "current_message" | "conversation"
  /** instagram_comment: all posts vs picker */
  commentPostScope?: "all" | "selected"
  /** Unipile post ids when commentPostScope is selected */
  commentPostIds?: string[]
  /** instagram_comment: any | contains | not_contains */
  commentTextMatch?: "any" | "contains" | "not_contains"
  commentTextValue?: string
  commentTextCaseInsensitive?: boolean
}

export type VisualOutboundContentSource = "text" | "workspace" | "meta"

export type VisualOutboundContent = {
  source: VisualOutboundContentSource
  text?: string
  templateId?: string
  templateName?: string
  language?: string
}

export type VisualActionType =
  | "execute_agent"
  | "move_linked_card"
  | "clone_linked_card"
  | "send_text"
  | "send_to_recipients"
  | "schedule_followup"
  | "add_label"
  | "set_lead_source"
  | "transition_state"
  | "disable_auto_reply"
  | "enable_conversation_agent"
  | "distribute_lead"
  | "assign_conversation"
  | "route_to_crm"
  | "reply_to_comment"
  | "create_lead"
  | "create_contact"
  | "stop_flow"

export type DelayUnit = "minutes" | "hours" | "days" | "weeks" | "months"

export type VisualFollowupEventOffset = {
  amount: number
  unit: DelayUnit
}

export type VisualAction = {
  type: VisualActionType
  agentId?: string
  sendReply?: boolean
  moveProjectId?: string
  columnId?: string
  /** Corpo da mensagem outbound (acção `send_text`). */
  text?: string
  /** Structured send_text content (shortcut / Meta / free text). */
  outboundContent?: VisualOutboundContent
  /** send_text: entrega noutra conversa (ex.: grupo interno de avisos) em vez de responder ao chat de origem. */
  targetConversationId?: string
  /** send_to_recipients: one or more recipients (assignee/reporter/workspace users/custom numbers/group(s)). */
  recipients?: OutboundWhatsAppRecipient[]
  /** Follow-up config */
  followupDelayMinutes?: number
  followupDelayUnit?: DelayUnit
  followupMax?: number
  followupSubsequentDelayHours?: number
  followupSubsequentDelayUnit?: DelayUnit
  followupStopOnReply?: boolean
  followupMessages?: string[]
  followupMessageContents?: VisualOutboundContent[]
  followupUseAgentGenerated?: boolean
  followupAgentId?: string
  followupScheduleFromConversation?: boolean
  /** One or more offsets before the extracted event date (e.g. 1 day before AND 30
   * minutes before produce two follow-up rounds). Replaces the legacy single
   * `followupDaysBeforeEvent`/`followupOnEventDay` (whole days only). */
  followupEventOffsets?: VisualFollowupEventOffset[]
  followupSendAtLocalTime?: string
  followupRequireBusinessHours?: boolean
  /** add_label */
  labelText?: string
  labelColor?: string
  /** set_lead_source */
  leadSourceText?: string
  /** transition_state */
  transitionState?: string
  /** distribute_lead / assign_conversation / route_to_crm */
  leadDist?: LeadDistributionPolicy
  /** assign_conversation: fixed user (optional; otherwise smart distribution via leadDist) */
  assignUserId?: string
  /** create_lead: CRM tab */
  boardId?: string
  /** create_lead / optional override */
  createLeadSourceText?: string
}

export type VisualRule = {
  id: string
  /** How multiple conditions combine. Default AND (`all`). */
  conditionsMatch?: "all" | "any"
  /** Todas as condições têm de ser verdadeiras (AND) unless conditionsMatch=any. */
  conditions: VisualWhen[]
  /** Matching path. For a classifier, the `llmMatch` label. */
  actions: VisualAction[]
  /** Runs when the condition does not match, or when a classifier picks no listed path. */
  elseActions?: VisualAction[]
  /** Classifier labels other than `llmMatch`, each with its own actions. */
  labelActions?: Record<string, VisualAction[]>
}

export const VISUAL_ACTION_TYPES: VisualActionType[] = [
  "execute_agent",
  "move_linked_card",
  "clone_linked_card",
  "send_text",
  "send_to_recipients",
  "schedule_followup",
  "add_label",
  "set_lead_source",
  "transition_state",
  "disable_auto_reply",
  "enable_conversation_agent",
  "distribute_lead",
  "assign_conversation",
  "route_to_crm",
  "reply_to_comment",
  "create_lead",
  "create_contact",
  "stop_flow",
]

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyVisualRule(agentAutoReplyEnabled = true): VisualRule {
  return {
    id: newId(),
    conditionsMatch: "all",
    conditions: [{ type: "first_inbound" }],
    actions: [{ type: "execute_agent", agentId: "", sendReply: agentAutoReplyEnabled }],
  }
}

export function createVisualWhenForType(type: VisualWhenType): VisualWhen {
  if (type === "first_inbound") return { type: "first_inbound" }
  if (type === "within_business_hours") return { type: "within_business_hours" }
  if (type === "outside_business_hours") return { type: "outside_business_hours" }
  if (type === "linked_card_in") {
    return {
      type: "linked_card_in",
      linkedCardMode: "in",
      linkedCardAnyOf: [{ projectId: "", boardId: "", columnIds: [] }],
    }
  }
  if (type === "new_lead") {
    return { type: "new_lead", newLeadScope: "workspace" }
  }
  if (type === "chat_type") {
    return { type: "chat_type", chatTypeValue: "direct" }
  }
  if (type === "from_group_in") {
    return { type: "from_group_in", fromGroupMode: "in", fromGroupIds: [] }
  }
  if (type === "from_phone_in") {
    return { type: "from_phone_in", fromPhoneMode: "in", fromPhonesText: "" }
  }
  if (type === "from_ad") {
    return { type: "from_ad", fromAdMatch: "any", fromAdScope: "current_message" }
  }
  if (type === "instagram_comment") {
    return {
      type: "instagram_comment",
      commentPostScope: "all",
      commentPostIds: [],
      commentTextMatch: "any",
      commentTextValue: "",
      commentTextCaseInsensitive: true,
    }
  }
  if (type === "contains" || type === "not_contains") {
    return { type, containsValue: "", containsCaseInsensitive: true }
  }
  if (type === "regex") return { type: "regex", regexPattern: "" }
  if (type === "llm_conversation_match") {
    return {
      type: "llm_conversation_match",
      llmLabelsText: "budget_requested, general",
      llmMatch: "budget_requested",
      llmHint: "",
      llmConversationPrompt: "",
    }
  }
  if (type === "event_date_days_ahead") {
    return {
      type: "event_date_days_ahead",
      eventDateOp: "gt",
      eventDateDays: 30,
      eventDateMatchIfMissing: false,
    }
  }
  return { type: "llm_match", llmLabelsText: "pricing, support, other", llmMatch: "other", llmHint: "" }
}

function parseEventDateOp(raw: unknown): EventDateDaysAheadOp {
  return raw === "gte" || raw === "lt" || raw === "lte" || raw === "eq" || raw === "gt" ? raw : "gt"
}

/** Condição extra por defeito — horário de atendimento (descoberta rápida no fluxo). */
export function createDefaultAdditionalCondition(): VisualWhen {
  return { type: "within_business_hours" }
}

export function createVisualActionForType(type: VisualActionType, agentAutoReplyEnabled: boolean): VisualAction {
  if (type === "execute_agent") {
    return { type: "execute_agent", agentId: "", sendReply: agentAutoReplyEnabled }
  }
  if (type === "move_linked_card" || type === "clone_linked_card") {
    return { type, moveProjectId: "", boardId: "", columnId: "" }
  }
  if (type === "send_text") return { type: "send_text", text: "", outboundContent: { source: "text", text: "" } }
  if (type === "send_to_recipients") {
    return { type: "send_to_recipients", outboundContent: { source: "text", text: "" }, recipients: [] }
  }
  if (type === "schedule_followup") {
    return {
      type: "schedule_followup",
      followupDelayMinutes: 30,
      followupDelayUnit: "minutes",
      followupMax: 1,
      followupSubsequentDelayHours: 24,
      followupSubsequentDelayUnit: "hours",
      followupStopOnReply: true,
      followupMessages: [],
      followupMessageContents: [],
      followupUseAgentGenerated: false,
      followupScheduleFromConversation: false,
      followupEventOffsets: [{ amount: 30, unit: "days" }],
      followupSendAtLocalTime: "",
      followupRequireBusinessHours: false,
    }
  }
  if (type === "add_label") return { type: "add_label", labelText: "", labelColor: "#6366f1" }
  if (type === "set_lead_source") return { type: "set_lead_source", leadSourceText: "" }
  if (type === "transition_state") return { type: "transition_state", transitionState: "human_handoff" }
  if (type === "disable_auto_reply") return { type: "disable_auto_reply" }
  if (type === "enable_conversation_agent") return { type: "enable_conversation_agent", agentId: "" }
  if (type === "distribute_lead") {
    return {
      type: "distribute_lead",
      leadDist: {
        ...DEFAULT_LEAD_DISTRIBUTION_POLICY,
        crmMode: "keep_linked",
        assignMode: "member_list",
        userIds: [],
      },
    }
  }
  if (type === "assign_conversation") {
    return {
      type: "assign_conversation",
      assignUserId: "",
      leadDist: { assignMode: "member_list", userIds: [] },
    }
  }
  if (type === "route_to_crm") {
    return {
      type: "route_to_crm",
      moveProjectId: "",
      columnId: "",
      leadDist: { assignMode: "none" },
    }
  }
  if (type === "reply_to_comment") return { type: "reply_to_comment", text: "" }
  if (type === "create_lead") {
    return { type: "create_lead", moveProjectId: "", boardId: "", columnId: "", createLeadSourceText: "" }
  }
  if (type === "create_contact") return { type: "create_contact" }
  if (type === "stop_flow") return { type: "stop_flow" }
  return { type: "execute_agent", agentId: "", sendReply: agentAutoReplyEnabled }
}

/** When AI / auto-reply is off for the workspace, force `sendReply: false` on every `execute_agent` in memory. */
function withoutAgentSendReply(actions: VisualAction[]): VisualAction[] {
  return actions.map((a) => (a.type === "execute_agent" ? { ...a, sendReply: false } : a))
}

export function normalizeVisualRulesAgentSendReply(rules: VisualRule[], agentAutoReplyEnabled: boolean): VisualRule[] {
  if (agentAutoReplyEnabled) return rules
  return rules.map((r) => ({
    ...r,
    actions: withoutAgentSendReply(r.actions),
    ...(r.elseActions ? { elseActions: withoutAgentSendReply(r.elseActions) } : {}),
    ...(r.labelActions
      ? {
          labelActions: Object.fromEntries(
            Object.entries(r.labelActions).map(([label, actions]) => [label, withoutAgentSendReply(actions)])
          ),
        }
      : {}),
  }))
}

/** Advanced JSON: set `sendReply: false` on every `execute_agent` action before persisting. */
export function stripExecuteAgentSendReplyFromRoot(root: Record<string, unknown>): Record<string, unknown> {
  let next: Record<string, unknown>
  try {
    next = structuredClone(root) as Record<string, unknown>
  } catch {
    next = JSON.parse(JSON.stringify(root)) as Record<string, unknown>
  }
  const rules = next.rules
  if (!Array.isArray(rules)) return next
  for (const rule of rules) {
    if (!rule || typeof rule !== "object") continue
    const rec = rule as Record<string, unknown>
    const lists = [rec.actions, rec.elseActions]
    if (rec.labelActions && typeof rec.labelActions === "object") {
      lists.push(...Object.values(rec.labelActions as Record<string, unknown>))
    }
    for (const actions of lists) {
      if (!Array.isArray(actions)) continue
      for (const act of actions) {
        if (!act || typeof act !== "object") continue
        const o = act as Record<string, unknown>
        if (o.type === "execute_agent") o.sendReply = false
      }
    }
  }
  return next
}

export function parseWhen(w: unknown): VisualWhen | null {
  if (!w || typeof w !== "object") return null
  const o = w as Record<string, unknown>
  const type = String(o.type ?? "")
  if (type === "first_inbound") return { type: "first_inbound" }
  if (type === "within_business_hours") return { type: "within_business_hours" }
  if (type === "outside_business_hours") return { type: "outside_business_hours" }
  if (type === "new_lead") {
    const scope = o.scope === "project" ? "project" : "workspace"
    const projectId = String(o.projectId ?? "").trim()
    const columnIds = Array.isArray(o.columnIds)
      ? (o.columnIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : []
    const boardId = typeof o.boardId === "string" ? o.boardId.trim() : ""
    return {
      type: "new_lead",
      newLeadScope: scope,
      ...(scope === "project"
        ? { newLeadProjectId: projectId, newLeadBoardId: boardId, newLeadColumnIds: columnIds }
        : {}),
    }
  }
  if (type === "linked_card_in") {
    const rawAnyOf = Array.isArray(o.anyOf) ? o.anyOf : []
    const linkedCardAnyOf: VisualLinkedCardMatch[] = []
    for (const row of rawAnyOf) {
      if (!row || typeof row !== "object") continue
      const r = row as Record<string, unknown>
      const projectId = String(r.projectId ?? "").trim()
      const boardId = typeof r.boardId === "string" ? r.boardId.trim() : ""
      const columnIds = Array.isArray(r.columnIds)
        ? (r.columnIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
        : []
      if (!projectId && columnIds.length === 0) continue
      linkedCardAnyOf.push({ projectId, boardId, columnIds })
    }
    return {
      type: "linked_card_in",
      linkedCardMode: o.mode === "not_in" ? "not_in" : "in",
      linkedCardAnyOf: linkedCardAnyOf.length ? linkedCardAnyOf : [{ projectId: "", columnIds: [] }],
    }
  }
  if (type === "chat_type") {
    const v = String(o.value ?? "direct")
    const chatTypeValue = v === "group" || v === "any" || v === "direct" ? v : "direct"
    return { type: "chat_type", chatTypeValue }
  }
  if (type === "from_group_in") {
    const groupIds = Array.isArray(o.groupIds)
      ? (o.groupIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : []
    return {
      type: "from_group_in",
      fromGroupMode: o.mode === "not_in" ? "not_in" : "in",
      fromGroupIds: groupIds,
    }
  }
  if (type === "from_ad") {
    const list = (v: unknown) =>
      Array.isArray(v)
        ? (v as unknown[])
            .map((x) => String(x).trim())
            .filter(Boolean)
            .join(", ")
        : ""
    const m = String(o.match ?? "any")
    return {
      type: "from_ad",
      fromAdMatch: m === "ad_in" || m === "campaign_in" || m === "headline_contains" ? m : "any",
      fromAdIdsText: list(o.adIds),
      fromAdCampaignIdsText: list(o.campaignIds),
      fromAdHeadline: typeof o.value === "string" ? o.value : "",
      fromAdScope: o.scope === "conversation" ? "conversation" : "current_message",
    }
  }
  if (type === "from_phone_in") {
    const phones = Array.isArray(o.phones) ? (o.phones as unknown[]).map((x) => String(x).trim()).filter(Boolean) : []
    return {
      type: "from_phone_in",
      fromPhoneMode: o.mode === "not_in" ? "not_in" : "in",
      fromPhonesText: phones.join(", "),
    }
  }
  if (type === "instagram_comment") {
    const postIds = Array.isArray(o.postIds)
      ? (o.postIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : []
    return {
      type: "instagram_comment",
      commentPostScope: o.postScope === "selected" ? "selected" : "all",
      commentPostIds: postIds,
      commentTextMatch:
        typeof o.textNotContains === "string" && o.textNotContains.trim()
          ? "not_contains"
          : typeof o.textContains === "string" && o.textContains.trim()
          ? "contains"
          : "any",
      commentTextValue:
        typeof o.textNotContains === "string" && o.textNotContains.trim()
          ? String(o.textNotContains)
          : typeof o.textContains === "string"
          ? String(o.textContains)
          : "",
      commentTextCaseInsensitive: o.caseInsensitive !== false,
    }
  }
  if (type === "contains" || type === "not_contains") {
    return {
      type: type as "contains" | "not_contains",
      containsValue: String(o.value ?? ""),
      containsCaseInsensitive: Boolean(o.caseInsensitive ?? true),
    }
  }
  if (type === "regex") {
    return { type: "regex", regexPattern: String(o.pattern ?? "") }
  }
  if (type === "llm_match") {
    const labels = Array.isArray(o.labels) ? (o.labels as unknown[]).map((x) => String(x)) : []
    return {
      type: "llm_match",
      llmLabelsText: labels.join(", "),
      llmMatch: String(o.match ?? ""),
      llmHint: typeof o.hint === "string" ? o.hint : "",
    }
  }
  if (type === "llm_conversation_match") {
    const labels = Array.isArray(o.labels) ? (o.labels as unknown[]).map((x) => String(x)) : []
    return {
      type: "llm_conversation_match",
      llmLabelsText: labels.join(", "),
      llmMatch: String(o.match ?? ""),
      llmHint: typeof o.hint === "string" ? o.hint : "",
      llmConversationPrompt: typeof o.classificationPrompt === "string" ? o.classificationPrompt : "",
    }
  }
  if (type === "event_date_days_ahead") {
    const daysRaw = Number(o.days)
    return {
      type: "event_date_days_ahead",
      eventDateOp: parseEventDateOp(o.op),
      eventDateDays: Number.isFinite(daysRaw) && daysRaw >= 0 ? daysRaw : 30,
      eventDateMatchIfMissing: o.matchIfMissing === true,
    }
  }
  if (type === "all" || type === "any") return null
  return null
}

export function parseWhenRoot(w: unknown): { conditions: VisualWhen[]; conditionsMatch: "all" | "any" } | null {
  if (!w || typeof w !== "object") return null
  const o = w as Record<string, unknown>
  const rootType = String(o.type ?? "")
  if (rootType === "all" || rootType === "any") {
    const clauses = o.clauses
    if (!Array.isArray(clauses) || clauses.length === 0) return null
    const out: VisualWhen[] = []
    for (const clause of clauses) {
      const parsed = parseWhen(clause)
      if (!parsed) return null
      out.push(parsed)
    }
    return { conditions: out, conditionsMatch: rootType }
  }
  const single = parseWhen(w)
  return single ? { conditions: [single], conditionsMatch: "all" } : null
}

const UNIT_TO_MINUTES: Record<DelayUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
  weeks: 60 * 24 * 7,
  months: 60 * 24 * 30,
}

export function delayToMinutes(value: number, unit: DelayUnit): number {
  return value * UNIT_TO_MINUTES[unit]
}

export function minutesToBestUnit(totalMinutes: number): { value: number; unit: DelayUnit } {
  if (totalMinutes <= 0) return { value: 0, unit: "minutes" }
  if (totalMinutes % UNIT_TO_MINUTES.months === 0)
    return { value: totalMinutes / UNIT_TO_MINUTES.months, unit: "months" }
  if (totalMinutes % UNIT_TO_MINUTES.weeks === 0) return { value: totalMinutes / UNIT_TO_MINUTES.weeks, unit: "weeks" }
  if (totalMinutes % UNIT_TO_MINUTES.days === 0) return { value: totalMinutes / UNIT_TO_MINUTES.days, unit: "days" }
  if (totalMinutes % UNIT_TO_MINUTES.hours === 0) return { value: totalMinutes / UNIT_TO_MINUTES.hours, unit: "hours" }
  return { value: totalMinutes, unit: "minutes" }
}

export function parseAction(a: unknown): VisualAction | null {
  if (!a || typeof a !== "object") return null
  const o = a as Record<string, unknown>
  const type = String(o.type ?? "")
  if (type === "execute_agent") {
    return {
      type: "execute_agent",
      agentId: String(o.agentId ?? ""),
      sendReply: o.sendReply !== false,
    }
  }
  if (type === "move_linked_card" || type === "clone_linked_card") {
    return {
      type,
      columnId: String(o.columnId ?? ""),
      moveProjectId: typeof o.projectId === "string" ? o.projectId : undefined,
      boardId: typeof o.boardId === "string" ? o.boardId : "",
    }
  }
  if (type === "send_text") {
    const content = parseOutboundContent(o.content) ?? {
      source: "text" as const,
      text: typeof o.text === "string" ? o.text : String(o.body ?? ""),
    }
    return {
      type: "send_text",
      text: content.text ?? (typeof o.text === "string" ? o.text : ""),
      outboundContent: content,
      targetConversationId:
        typeof o.targetConversationId === "string" && o.targetConversationId.trim()
          ? o.targetConversationId.trim()
          : undefined,
    }
  }
  if (type === "send_to_recipients") {
    const content = parseOutboundContent(o.content) ?? {
      source: "text" as const,
      text: typeof o.text === "string" ? o.text : "",
    }
    const recipients = Array.isArray(o.recipients)
      ? (o.recipients as unknown[]).map(parseRecipient).filter((x): x is OutboundWhatsAppRecipient => Boolean(x))
      : []
    return {
      type: "send_to_recipients",
      outboundContent: content,
      recipients,
    }
  }
  if (type === "schedule_followup") {
    const rawDelayMin = typeof o.delayMinutes === "number" ? o.delayMinutes : 30
    const rawSubHours = typeof o.subsequentDelayHours === "number" ? o.subsequentDelayHours : 24
    const { value: firstVal, unit: firstUnit } = minutesToBestUnit(rawDelayMin)
    const { value: subVal, unit: subUnit } = minutesToBestUnit(rawSubHours * 60)
    const messageContents = Array.isArray(o.messageContents)
      ? (o.messageContents as unknown[]).map(parseOutboundContent).filter((x): x is VisualOutboundContent => Boolean(x))
      : []
    const legacyMessages = Array.isArray(o.messages) ? (o.messages as unknown[]).map((m) => String(m)) : []
    const followupMessageContents =
      messageContents.length > 0 ? messageContents : legacyMessages.map((text) => ({ source: "text" as const, text }))
    const eventOffsetsMinutes = Array.isArray(o.eventOffsetsMinutes)
      ? (o.eventOffsetsMinutes as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n >= 0)
      : null
    const followupEventOffsets: VisualFollowupEventOffset[] =
      eventOffsetsMinutes && eventOffsetsMinutes.length > 0
        ? eventOffsetsMinutes.map((m) => {
            const { value, unit } = minutesToBestUnit(m)
            return { amount: value, unit }
          })
        : [
            (() => {
              const legacyMinutes =
                o.onEventDay === true ? 0 : (typeof o.daysBeforeEvent === "number" ? o.daysBeforeEvent : 30) * 24 * 60
              const { value, unit } = minutesToBestUnit(legacyMinutes)
              return { amount: value, unit }
            })(),
          ]
    return {
      type: "schedule_followup",
      followupDelayMinutes: firstVal,
      followupDelayUnit: firstUnit,
      followupMax: typeof o.maxFollowups === "number" ? o.maxFollowups : 3,
      followupSubsequentDelayHours: subVal,
      followupSubsequentDelayUnit: subUnit,
      followupStopOnReply: o.stopOnReply !== false,
      followupMessages: followupMessageContents.map((c) => c.text ?? "").filter((t) => t.length > 0),
      followupMessageContents,
      followupUseAgentGenerated: o.useAgentGenerated === true,
      followupAgentId: typeof o.agentId === "string" ? o.agentId : "",
      followupScheduleFromConversation: o.scheduleFromConversation === true,
      followupEventOffsets,
      followupSendAtLocalTime: typeof o.sendAtLocalTime === "string" ? o.sendAtLocalTime : "",
      followupRequireBusinessHours: o.requireBusinessHours === true,
    }
  }
  if (type === "add_label") {
    return {
      type: "add_label",
      labelText: String(o.labelText ?? ""),
      labelColor: typeof o.labelColor === "string" ? o.labelColor : "#6366f1",
    }
  }
  if (type === "set_lead_source") {
    return {
      type: "set_lead_source",
      leadSourceText: String(o.leadSourceText ?? ""),
    }
  }
  if (type === "transition_state") {
    return {
      type: "transition_state",
      transitionState: String(o.state ?? ""),
    }
  }
  if (type === "disable_auto_reply") return { type: "disable_auto_reply" }
  if (type === "enable_conversation_agent") {
    return {
      type: "enable_conversation_agent",
      agentId: String(o.agentId ?? ""),
    }
  }
  if (type === "distribute_lead") {
    return {
      type: "distribute_lead",
      leadDist: parseLeadDistPolicy(o.policy) ?? { crmMode: "keep_linked", assignMode: "none" },
    }
  }
  if (type === "assign_conversation") {
    const userId = typeof o.userId === "string" ? o.userId : undefined
    return {
      type: "assign_conversation",
      assignUserId: userId,
      leadDist: parseLeadDistPolicy(o.policy) ?? { assignMode: "member_list", userIds: [] },
    }
  }
  if (type === "route_to_crm") {
    const projectId = typeof o.projectId === "string" ? o.projectId : ""
    const columnId = typeof o.columnId === "string" ? o.columnId : undefined
    const policy = parseLeadDistPolicy(o.policy)
    return {
      type: "route_to_crm",
      moveProjectId: projectId,
      columnId: columnId ?? "",
      boardId: typeof o.boardId === "string" ? o.boardId : "",
      leadDist: policy ?? undefined,
    }
  }
  if (type === "reply_to_comment") {
    return { type: "reply_to_comment", text: String(o.text ?? "") }
  }
  if (type === "create_lead") {
    return {
      type: "create_lead",
      moveProjectId: typeof o.projectId === "string" ? o.projectId : "",
      boardId: typeof o.boardId === "string" ? o.boardId : "",
      columnId: typeof o.columnId === "string" ? o.columnId : "",
      createLeadSourceText: typeof o.sourceText === "string" ? o.sourceText : "",
    }
  }
  if (type === "create_contact") return { type: "create_contact" }
  if (type === "stop_flow") return { type: "stop_flow" }
  return null
}

function parseOutboundContent(raw: unknown): VisualOutboundContent | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const source = o.source === "workspace" || o.source === "meta" || o.source === "text" ? o.source : null
  if (!source) return null
  if (source === "text") {
    return { source: "text", text: typeof o.text === "string" ? o.text : "" }
  }
  if (source === "workspace") {
    const templateId = typeof o.templateId === "string" ? o.templateId : ""
    if (!templateId) return null
    return {
      source: "workspace",
      templateId,
      text: typeof o.text === "string" ? o.text : "",
      templateName: typeof o.templateName === "string" ? o.templateName : undefined,
    }
  }
  const templateId = typeof o.templateId === "string" ? o.templateId : ""
  const templateName = typeof o.templateName === "string" ? o.templateName : ""
  if (!templateId && !templateName) return null
  return {
    source: "meta",
    templateId: templateId || templateName,
    templateName: templateName || templateId,
    language: typeof o.language === "string" ? o.language : undefined,
    text: typeof o.text === "string" ? o.text : "",
  }
}

function serializeOutboundContent(c: VisualOutboundContent): Record<string, unknown> | null {
  if (c.source === "text") {
    const text = c.text ?? ""
    if (!text.trim()) return null
    return { source: "text", text }
  }
  if (c.source === "workspace") {
    const templateId = (c.templateId ?? "").trim()
    if (!templateId) return null
    return {
      source: "workspace",
      templateId,
      ...(c.text?.trim() ? { text: c.text } : {}),
      ...(c.templateName?.trim() ? { templateName: c.templateName.trim() } : {}),
    }
  }
  const templateId = (c.templateId ?? "").trim()
  const templateName = (c.templateName ?? "").trim() || templateId
  if (!templateId && !templateName) return null
  return {
    source: "meta",
    templateId: templateId || templateName,
    templateName,
    ...(c.language?.trim() ? { language: c.language.trim() } : {}),
    ...(c.text?.trim() ? { text: c.text } : {}),
  }
}

function parseRecipient(raw: unknown): OutboundWhatsAppRecipient | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const type = String(o.type ?? "")
  if (
    type === "lead_phone" ||
    type === "assignee_phone" ||
    type === "reporter_phone" ||
    type === "session_owner_phone" ||
    type === "linked_conversation"
  ) {
    return { type }
  }
  if (type === "workspace_user") {
    const userId = typeof o.userId === "string" ? o.userId.trim() : ""
    return userId ? { type: "workspace_user", userId } : null
  }
  if (type === "custom_phone") {
    const phone = typeof o.phone === "string" ? o.phone.trim() : ""
    return phone ? { type: "custom_phone", phone } : null
  }
  if (type === "custom_conversation") {
    const conversationId = typeof o.conversationId === "string" ? o.conversationId.trim() : ""
    return conversationId ? { type: "custom_conversation", conversationId } : null
  }
  return null
}

function serializeRecipient(r: OutboundWhatsAppRecipient): Record<string, unknown> | null {
  if (r.type === "workspace_user") {
    const userId = r.userId.trim()
    return userId ? { type: "workspace_user", userId } : null
  }
  if (r.type === "custom_phone") {
    const phone = r.phone.trim()
    return phone ? { type: "custom_phone", phone } : null
  }
  if (r.type === "custom_conversation") {
    const conversationId = r.conversationId.trim()
    return conversationId ? { type: "custom_conversation", conversationId } : null
  }
  return { type: r.type }
}

function parseLeadDistPolicy(raw: unknown): LeadDistributionPolicy | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  return {
    crmMode: typeof o.crmMode === "string" ? (o.crmMode as LeadDistributionPolicy["crmMode"]) : undefined,
    targetProjectId: typeof o.targetProjectId === "string" ? o.targetProjectId : undefined,
    targetColumnId: typeof o.targetColumnId === "string" ? o.targetColumnId : undefined,
    projectIds: Array.isArray(o.projectIds) ? o.projectIds.map(String) : undefined,
    assignMode: typeof o.assignMode === "string" ? (o.assignMode as LeadDistributionPolicy["assignMode"]) : undefined,
    userIds: Array.isArray(o.userIds) ? o.userIds.map(String) : undefined,
    specificUserId: typeof o.specificUserId === "string" ? o.specificUserId : undefined,
    workspaceRoleId: typeof o.workspaceRoleId === "string" ? o.workspaceRoleId : undefined,
    onlyWhenUnassigned: o.onlyWhenUnassigned !== false,
    syncCardAssignees: true,
  }
}

function serializeLeadDistPolicy(p?: LeadDistributionPolicy): Record<string, unknown> | undefined {
  if (!p) return undefined
  const out: Record<string, unknown> = {}
  if (p.crmMode) out.crmMode = p.crmMode
  if (p.targetProjectId) out.targetProjectId = p.targetProjectId
  if (p.targetColumnId) out.targetColumnId = p.targetColumnId
  if (p.projectIds?.length) out.projectIds = p.projectIds
  if (p.assignMode) out.assignMode = p.assignMode
  if (p.userIds?.length) out.userIds = p.userIds
  if (p.specificUserId) out.specificUserId = p.specificUserId
  if (p.workspaceRoleId) out.workspaceRoleId = p.workspaceRoleId
  if (p.onlyWhenUnassigned === false) out.onlyWhenUnassigned = false
  if (p.syncCardAssignees === false) out.syncCardAssignees = false
  return Object.keys(out).length ? out : undefined
}

function isLeadDistValid(p: LeadDistributionPolicy | undefined, mode: "full" | "assign"): boolean {
  const policy = p ?? {}
  if (mode === "assign") {
    const assignMode = policy.assignMode ?? "none"
    if (assignMode === "none") return false
    if (assignMode === "specific_user") return Boolean((policy.specificUserId ?? "").trim())
    if (assignMode === "member_list") return Boolean(policy.userIds?.length)
    if (assignMode === "by_workspace_role") return Boolean((policy.workspaceRoleId ?? "").trim())
    return assignMode === "all_crm_members"
  }
  const crmMode = policy.crmMode ?? "keep_linked"
  if (crmMode === "move_to" && !(policy.targetProjectId ?? "").trim()) return false
  if (crmMode === "pick_from_list" && !policy.projectIds?.length) return false
  const assignMode = policy.assignMode ?? "none"
  if (crmMode === "keep_linked" && assignMode === "none") return false
  if (assignMode === "specific_user" && !(policy.specificUserId ?? "").trim()) return false
  if (assignMode === "member_list" && !policy.userIds?.length) return false
  if (assignMode === "by_workspace_role" && !(policy.workspaceRoleId ?? "").trim()) return false
  return true
}

/** `null` = estrutura não suportada pelo editor visual (ex.: nested all/any). */
export function parseRootToVisualRules(root: unknown): VisualRule[] | null {
  if (!root || typeof root !== "object") return null
  if ((root as Record<string, unknown>).format === "graph") return null
  const rules = (root as Record<string, unknown>).rules
  if (!Array.isArray(rules) || rules.length === 0) return []

  const out: VisualRule[] = []
  for (const raw of rules) {
    if (!raw || typeof raw !== "object") return null
    const r = raw as Record<string, unknown>
    const parsedWhen = parseWhenRoot(r.when)
    if (!parsedWhen?.conditions.length) return null
    const actions = parseActionList(r.actions)
    if (!actions?.length) return null
    const elseActions = r.elseActions == null ? undefined : parseActionList(r.elseActions) ?? undefined
    if (r.elseActions != null && !elseActions) return null
    let labelActions: Record<string, VisualAction[]> | undefined
    if (r.labelActions != null) {
      if (typeof r.labelActions !== "object" || Array.isArray(r.labelActions)) return null
      labelActions = {}
      for (const [label, raw] of Object.entries(r.labelActions as Record<string, unknown>)) {
        const parsed = parseActionList(raw)
        if (!parsed) return null
        if (parsed.length) labelActions[label] = parsed
      }
    }
    out.push({
      id: newId(),
      conditionsMatch: parsedWhen.conditionsMatch,
      conditions: parsedWhen.conditions,
      actions,
      ...(elseActions?.length ? { elseActions } : {}),
      ...(labelActions && Object.keys(labelActions).length ? { labelActions } : {}),
    })
  }
  return out
}

function parseActionList(raw: unknown): VisualAction[] | null {
  if (!Array.isArray(raw)) return null
  const actions: VisualAction[] = []
  for (const item of raw) {
    const act = parseAction(item)
    if (!act) return null
    actions.push(act)
  }
  return actions
}

export function buildWhenRoot(
  conditions: VisualWhen[],
  conditionsMatch: "all" | "any" = "all"
): Record<string, unknown> {
  if (conditions.length === 1) return buildWhen(conditions[0]!)
  return { type: conditionsMatch === "any" ? "any" : "all", clauses: conditions.map(buildWhen) }
}

export function buildWhen(w: VisualWhen): Record<string, unknown> {
  switch (w.type) {
    case "first_inbound":
      return { type: "first_inbound" }
    case "within_business_hours":
      return { type: "within_business_hours" }
    case "outside_business_hours":
      return { type: "outside_business_hours" }
    case "new_lead": {
      const scope = w.newLeadScope === "project" ? "project" : "workspace"
      if (scope === "workspace") return { type: "new_lead", scope: "workspace" }
      const projectId = (w.newLeadProjectId ?? "").trim()
      const boardId = (w.newLeadBoardId ?? "").trim()
      const columnIds = (w.newLeadColumnIds ?? []).map((id) => String(id).trim()).filter(Boolean)
      return {
        type: "new_lead",
        scope: "project",
        ...(projectId ? { projectId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(columnIds.length ? { columnIds } : {}),
      }
    }
    case "linked_card_in": {
      const anyOf = (w.linkedCardAnyOf ?? [])
        .map((row) => ({
          projectId: (row.projectId ?? "").trim(),
          boardId: (row.boardId ?? "").trim(),
          columnIds: (row.columnIds ?? []).map((id) => String(id).trim()).filter(Boolean),
        }))
        .filter((row) => row.projectId)
        .map((row) => {
          const out: { projectId: string; boardId?: string; columnIds?: string[] } = {
            projectId: row.projectId,
          }
          if (row.boardId) out.boardId = row.boardId
          if (row.columnIds.length) out.columnIds = row.columnIds
          return out
        })
      return {
        type: "linked_card_in",
        ...(w.linkedCardMode === "not_in" ? { mode: "not_in" } : {}),
        anyOf,
      }
    }
    case "chat_type":
      return {
        type: "chat_type",
        value: w.chatTypeValue === "group" || w.chatTypeValue === "any" ? w.chatTypeValue : "direct",
      }
    case "from_group_in":
      return {
        type: "from_group_in",
        ...(w.fromGroupMode === "not_in" ? { mode: "not_in" } : {}),
        groupIds: (w.fromGroupIds ?? []).map((id) => id.trim()).filter(Boolean),
      }
    case "from_ad": {
      const ids = (text?: string) =>
        (text ?? "")
          .split(/[,;\n\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      const match = w.fromAdMatch ?? "any"
      return {
        type: "from_ad",
        ...(match !== "any" ? { match } : {}),
        ...(match === "ad_in" ? { adIds: ids(w.fromAdIdsText) } : {}),
        ...(match === "campaign_in" ? { campaignIds: ids(w.fromAdCampaignIdsText) } : {}),
        ...(match === "headline_contains" ? { value: (w.fromAdHeadline ?? "").trim() } : {}),
        ...(w.fromAdScope === "conversation" ? { scope: "conversation" } : {}),
      }
    }
    case "from_phone_in":
      return {
        type: "from_phone_in",
        ...(w.fromPhoneMode === "not_in" ? { mode: "not_in" } : {}),
        phones: (w.fromPhonesText ?? "")
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
      }
    case "contains":
    case "not_contains":
      return {
        type: w.type,
        value: (w.containsValue ?? "").trim() || " ",
        caseInsensitive: w.containsCaseInsensitive !== false,
      }
    case "regex":
      return { type: "regex", pattern: (w.regexPattern ?? "").trim() || "(?!)" }
    case "llm_match": {
      const labels = (w.llmLabelsText ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      return {
        type: "llm_match",
        labels: labels.length ? labels : ["other"],
        match: (w.llmMatch ?? "").trim() || "other",
        ...(w.llmHint?.trim() ? { hint: w.llmHint.trim() } : {}),
      }
    }
    case "llm_conversation_match": {
      const labels = (w.llmLabelsText ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      return {
        type: "llm_conversation_match",
        labels: labels.length ? labels : ["other"],
        match: (w.llmMatch ?? "").trim() || "other",
        ...(w.llmHint?.trim() ? { hint: w.llmHint.trim() } : {}),
        ...(w.llmConversationPrompt?.trim() ? { classificationPrompt: w.llmConversationPrompt.trim() } : {}),
      }
    }
    case "event_date_days_ahead": {
      const days = Number(w.eventDateDays)
      return {
        type: "event_date_days_ahead",
        op: parseEventDateOp(w.eventDateOp),
        days: Number.isFinite(days) && days >= 0 ? days : 30,
        ...(w.eventDateMatchIfMissing === true ? { matchIfMissing: true } : {}),
      }
    }
    case "instagram_comment": {
      const text = (w.commentTextValue ?? "").trim()
      const match = w.commentTextMatch ?? "any"
      return {
        type: "instagram_comment",
        postScope: w.commentPostScope === "selected" ? "selected" : "all",
        ...(w.commentPostScope === "selected"
          ? { postIds: (w.commentPostIds ?? []).map((id) => id.trim()).filter(Boolean) }
          : {}),
        ...(match === "contains" && text ? { textContains: text } : {}),
        ...(match === "not_contains" && text ? { textNotContains: text } : {}),
        ...(match !== "any" && w.commentTextCaseInsensitive === false ? { caseInsensitive: false } : {}),
      }
    }
    default:
      return { type: "first_inbound" }
  }
}

export function buildAction(
  a: VisualAction,
  opts?: { forceExecuteAgentSendReplyFalse?: boolean }
): Record<string, unknown> | null {
  if (a.type === "execute_agent") {
    const agentId = (a.agentId ?? "").trim()
    if (!agentId) return null
    const sendReply = opts?.forceExecuteAgentSendReplyFalse ? false : a.sendReply !== false
    return { type: "execute_agent", agentId, sendReply }
  }
  if (a.type === "move_linked_card" || a.type === "clone_linked_card") {
    const columnId = (a.columnId ?? "").trim()
    if (!columnId) return null
    const projectId = (a.moveProjectId ?? "").trim()
    const boardId = (a.boardId ?? "").trim()
    return {
      type: a.type,
      columnId,
      ...(projectId ? { projectId } : {}),
      ...(boardId ? { boardId } : {}),
    }
  }
  if (a.type === "send_text") {
    const content = a.outboundContent ?? { source: "text" as const, text: a.text ?? "" }
    const serialized = serializeOutboundContent({
      ...content,
      text: content.text ?? a.text ?? "",
    })
    if (!serialized) return null
    const text = typeof serialized.text === "string" ? serialized.text : (a.text ?? "").trim()
    const targetConversationId = (a.targetConversationId ?? "").trim()
    return {
      type: "send_text",
      ...(text ? { text } : {}),
      content: serialized,
      ...(targetConversationId ? { targetConversationId } : {}),
    }
  }
  if (a.type === "send_to_recipients") {
    const content = a.outboundContent ?? { source: "text" as const, text: "" }
    const serialized = serializeOutboundContent(content)
    if (!serialized) return null
    const recipients = (a.recipients ?? [])
      .map(serializeRecipient)
      .filter((x): x is Record<string, unknown> => Boolean(x))
    if (recipients.length === 0) return null
    return {
      type: "send_to_recipients",
      content: serialized,
      recipients,
    }
  }
  if (a.type === "schedule_followup") {
    const firstTotalMin = delayToMinutes(a.followupDelayMinutes ?? 30, a.followupDelayUnit ?? "minutes")
    const subTotalMin = delayToMinutes(a.followupSubsequentDelayHours ?? 24, a.followupSubsequentDelayUnit ?? "hours")
    const sendAt = (a.followupSendAtLocalTime ?? "").trim()
    const contents = (
      a.followupMessageContents?.length
        ? a.followupMessageContents
        : (a.followupMessages ?? []).map((text) => ({ source: "text" as const, text }))
    )
      .map(serializeOutboundContent)
      .filter((x): x is Record<string, unknown> => Boolean(x))
    const useAgent = a.followupUseAgentGenerated === true
    if (!useAgent && contents.length === 0) return null
    return {
      type: "schedule_followup",
      delayMinutes: firstTotalMin,
      maxFollowups: Math.min(10, Math.max(1, a.followupMax ?? 1)),
      subsequentDelayHours: subTotalMin / 60 || 1,
      stopOnReply: a.followupStopOnReply !== false,
      ...(contents.length
        ? {
            messageContents: contents,
            messages: contents
              .map((c) => (typeof c.text === "string" ? c.text : ""))
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
      ...(useAgent ? { useAgentGenerated: true } : {}),
      ...(useAgent && (a.followupAgentId ?? "").trim() ? { agentId: (a.followupAgentId ?? "").trim() } : {}),
      ...(a.followupScheduleFromConversation
        ? {
            scheduleFromConversation: true,
            eventOffsetsMinutes: (a.followupEventOffsets?.length
              ? a.followupEventOffsets
              : [{ amount: 30, unit: "days" as DelayUnit }]
            ).map((o) => Math.max(0, Math.round(delayToMinutes(o.amount, o.unit)))),
          }
        : {}),
      ...(sendAt ? { sendAtLocalTime: sendAt } : {}),
      ...(a.followupRequireBusinessHours ? { requireBusinessHours: true } : {}),
    }
  }
  if (a.type === "add_label") {
    const labelText = (a.labelText ?? "").trim()
    if (!labelText) return null
    return {
      type: "add_label",
      labelText,
      ...(a.labelColor?.trim() ? { labelColor: a.labelColor.trim() } : {}),
    }
  }
  if (a.type === "set_lead_source") {
    const leadSourceText = (a.leadSourceText ?? "").trim()
    if (!leadSourceText) return null
    return { type: "set_lead_source", leadSourceText }
  }
  if (a.type === "transition_state") {
    const state = (a.transitionState ?? "").trim()
    if (!state) return null
    return { type: "transition_state", state }
  }
  if (a.type === "disable_auto_reply") return { type: "disable_auto_reply" }
  if (a.type === "enable_conversation_agent") {
    const agentId = (a.agentId ?? "").trim()
    if (!agentId) return null
    return { type: "enable_conversation_agent", agentId }
  }
  if (a.type === "distribute_lead") {
    if (!isLeadDistValid(a.leadDist, "full")) return null
    const policy = serializeLeadDistPolicy(a.leadDist)
    if (!policy) return null
    return { type: "distribute_lead", policy: { ...policy, enabled: true } }
  }
  if (a.type === "assign_conversation") {
    const userId = (a.assignUserId ?? "").trim()
    if (userId) return { type: "assign_conversation", userId }
    if (!isLeadDistValid(a.leadDist, "assign")) return null
    const policy = serializeLeadDistPolicy(a.leadDist)
    if (!policy) return null
    return { type: "assign_conversation", policy: { ...policy, enabled: true } }
  }
  if (a.type === "route_to_crm") {
    const projectId = (a.moveProjectId ?? "").trim()
    if (!projectId) return null
    const columnId = (a.columnId ?? "").trim()
    const assignPolicy = serializeLeadDistPolicy(a.leadDist)
    const boardId = (a.boardId ?? "").trim()
    return {
      type: "route_to_crm",
      projectId,
      ...(columnId ? { columnId } : {}),
      ...(boardId ? { boardId } : {}),
      ...(assignPolicy ? { policy: assignPolicy } : {}),
    }
  }
  if (a.type === "reply_to_comment") {
    const text = (a.text ?? "").trim()
    if (!text) return null
    return { type: "reply_to_comment", text }
  }
  if (a.type === "create_lead") {
    const projectId = (a.moveProjectId ?? "").trim()
    const boardId = (a.boardId ?? "").trim()
    if (!projectId || !boardId) return null
    const columnId = (a.columnId ?? "").trim()
    const sourceText = (a.createLeadSourceText ?? "").trim()
    return {
      type: "create_lead",
      projectId,
      boardId,
      ...(columnId ? { columnId } : {}),
      ...(sourceText ? { sourceText } : {}),
    }
  }
  if (a.type === "create_contact") return { type: "create_contact" }
  if (a.type === "stop_flow") return { type: "stop_flow" }
  return null
}

/** Valida regras visuais; devolve erro traduzível (chave) ou `null` se OK. */
export function validateVisualRules(
  rules: VisualRule[],
  opts?: { allowLlmWhen?: boolean; agentAutoReplyEnabled?: boolean }
):
  | "whatsappLiteRuleTemplatesValidationRule"
  | "whatsappLiteRuleTemplatesValidationWhen"
  | "whatsappLiteRuleTemplatesValidationWhenChatTypeOr"
  | "whatsappLiteRuleTemplatesValidationWhenLlmRequiresPlan"
  | "whatsappLiteRuleTemplatesValidationAction"
  | null {
  if (!rules.length) return "whatsappLiteRuleTemplatesValidationRule"
  for (const rule of rules) {
    if (!rule.conditions.length) return "whatsappLiteRuleTemplatesValidationWhen"
    // Group chat_type must not be OR'd with unrelated conditions (backend rejects this too).
    if (
      (rule.conditionsMatch ?? "all") === "any" &&
      rule.conditions.some((c) => c.type === "chat_type") &&
      rule.conditions.some((c) => c.type !== "chat_type")
    ) {
      return "whatsappLiteRuleTemplatesValidationWhenChatTypeOr"
    }
    for (const when of rule.conditions) {
      if (opts?.allowLlmWhen === false && (when.type === "llm_match" || when.type === "llm_conversation_match")) {
        return "whatsappLiteRuleTemplatesValidationWhenLlmRequiresPlan"
      }
      if ((when.type === "contains" || when.type === "not_contains") && !(when.containsValue ?? "").trim())
        return "whatsappLiteRuleTemplatesValidationWhen"
      if (when.type === "regex" && !(when.regexPattern ?? "").trim()) return "whatsappLiteRuleTemplatesValidationWhen"
      if (when.type === "llm_match" && !(when.llmMatch ?? "").trim()) return "whatsappLiteRuleTemplatesValidationWhen"
      if (when.type === "llm_conversation_match" && !(when.llmMatch ?? "").trim())
        return "whatsappLiteRuleTemplatesValidationWhen"
      if (when.type === "event_date_days_ahead") {
        const days = Number(when.eventDateDays)
        if (!Number.isFinite(days) || days < 0) return "whatsappLiteRuleTemplatesValidationWhen"
        if (!when.eventDateOp) return "whatsappLiteRuleTemplatesValidationWhen"
      }
      if (when.type === "linked_card_in") {
        const hasProject = (when.linkedCardAnyOf ?? []).some((row) => !!(row.projectId ?? "").trim())
        if (!hasProject) return "whatsappLiteRuleTemplatesValidationWhen"
      }
      if (when.type === "new_lead" && (when.newLeadScope ?? "workspace") === "project") {
        if (!(when.newLeadProjectId ?? "").trim()) return "whatsappLiteRuleTemplatesValidationWhen"
      }
      if (when.type === "chat_type" && !when.chatTypeValue) return "whatsappLiteRuleTemplatesValidationWhen"
      if (when.type === "from_group_in" && !(when.fromGroupIds ?? []).some((id) => id.trim()))
        return "whatsappLiteRuleTemplatesValidationWhen"
      if (when.type === "from_ad") {
        const has = (text?: string) => (text ?? "").split(/[,;\n\s]+/).some((x) => x.trim())
        if (when.fromAdMatch === "ad_in" && !has(when.fromAdIdsText)) return "whatsappLiteRuleTemplatesValidationWhen"
        if (when.fromAdMatch === "campaign_in" && !has(when.fromAdCampaignIdsText))
          return "whatsappLiteRuleTemplatesValidationWhen"
        if (when.fromAdMatch === "headline_contains" && !(when.fromAdHeadline ?? "").trim())
          return "whatsappLiteRuleTemplatesValidationWhen"
      }
      if (
        when.type === "from_phone_in" &&
        !(when.fromPhonesText ?? "")
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .some(Boolean)
      )
        return "whatsappLiteRuleTemplatesValidationWhen"
      if (
        when.type === "instagram_comment" &&
        when.commentPostScope === "selected" &&
        !(when.commentPostIds ?? []).some((id) => id.trim())
      )
        return "whatsappLiteRuleTemplatesValidationWhen"
      if (
        when.type === "instagram_comment" &&
        (when.commentTextMatch === "contains" || when.commentTextMatch === "not_contains") &&
        !(when.commentTextValue ?? "").trim()
      )
        return "whatsappLiteRuleTemplatesValidationWhen"
    }
    const lanes = [
      ...rule.actions,
      ...(rule.elseActions ?? []),
      ...Object.values(rule.labelActions ?? {}).flat(),
    ]
    for (const act of lanes) {
      if (act.type === "schedule_followup" && !isScheduleFollowupConfigured(act)) {
        return "whatsappLiteRuleTemplatesValidationAction"
      }
      const built = buildAction(act, {
        forceExecuteAgentSendReplyFalse: opts?.agentAutoReplyEnabled === false,
      })
      if (!built) return "whatsappLiteRuleTemplatesValidationAction"
    }
  }
  return null
}

function isScheduleFollowupConfigured(act: VisualAction): boolean {
  if (act.followupUseAgentGenerated === true) return true
  const contents = act.followupMessageContents ?? []
  if (
    contents.some((c) => {
      if (c.source === "workspace") return !!(c.templateId ?? "").trim()
      if (c.source === "meta") return !!(c.templateId ?? "").trim() || !!(c.templateName ?? "").trim()
      return !!(c.text ?? "").trim()
    })
  ) {
    return true
  }
  return (act.followupMessages ?? []).some((m) => !!(m ?? "").trim())
}

export function buildRootFromVisualRules(
  rules: VisualRule[],
  opts?: { agentAutoReplyEnabled?: boolean }
): Record<string, unknown> {
  const force = opts?.agentAutoReplyEnabled === false
  const buildList = (actions: VisualAction[]) =>
    actions
      .map((a) => buildAction(a, { forceExecuteAgentSendReplyFalse: force }))
      .filter(Boolean) as Record<string, unknown>[]
  const builtRules = rules.map((rule) => {
    const elseActions = buildList(rule.elseActions ?? [])
    const labelActions: Record<string, Record<string, unknown>[]> = {}
    for (const [label, actions] of Object.entries(rule.labelActions ?? {})) {
      const built = buildList(actions)
      if (built.length) labelActions[label] = built
    }
    return {
      when: buildWhenRoot(rule.conditions, rule.conditionsMatch ?? "all"),
      actions: buildList(rule.actions),
      ...(elseActions.length ? { elseActions } : {}),
      ...(Object.keys(labelActions).length ? { labelActions } : {}),
    }
  })
  return { rules: builtRules }
}
