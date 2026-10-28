import type { AdvancedAutomationEdge, AdvancedAutomationNode, AdvancedAutomationNodeKind } from "./types"

/** Limits shared with the backend validation (src/modules/messaging-automations/advanced/types.ts). */
export const SALES_BOT_LIMITS = {
  nodes: 200,
  textChars: 4096,
  buttons: 3,
  listRows: 10,
  buttonLabelChars: 20,
  listLabelChars: 24,
  noReplyMinutesMax: 60 * 24 * 7,
  waitMinutesMax: 60 * 24 * 30,
} as const

const SALES_BOT_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/
const RESERVED_OPTION_IDS = ["other", "no_reply", "send_failed", "next", "answered"]

let seq = 0
export function newBotId(prefix: string): string {
  seq += 1
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}${seq}`.slice(0, 40)
}

/** The exits a step can leave through. Edges reference these ids (same rules as the backend). */
export function nodeOutputs(node: AdvancedAutomationNode): string[] {
  switch (node.kind) {
    case "send_message": {
      const outs: string[] = []
      if (node.replyMode === "none") outs.push("next")
      else if (node.replyMode === "free") outs.push("answered")
      else outs.push(...(node.options ?? []).map((o) => o.id), "other")
      if (node.replyMode !== "none" && node.noReplyMinutes) outs.push("no_reply")
      if (node.replyMode !== "none") outs.push("send_failed")
      return outs
    }
    case "condition":
      return [...node.rows.map((r) => r.id), "none"]
    case "split":
      return [...node.paths.map((p) => p.id), "else"]
    case "ai_agent":
      return ["understood", "not_understood"]
    case "wait":
    case "set_field":
    case "move_stage":
    case "add_label":
    case "create_task":
    case "webhook":
    case "send_meta_template":
      return ["next"]
    case "goto_automation":
    case "stop":
    case "handoff":
      return []
  }
}

/** Human label key of an exit (fixed exits). Option/row/path exits use the author's own name. */
export const FIXED_EXIT_LABEL_KEYS = {
  next: "advancedAutomationExitNext",
  answered: "advancedAutomationExitAnswered",
  other: "advancedAutomationExitOther",
  no_reply: "advancedAutomationExitNoReply",
  send_failed: "advancedAutomationExitSendFailed",
  none: "advancedAutomationExitNone",
  else: "advancedAutomationExitElse",
  understood: "advancedAutomationExitUnderstood",
  not_understood: "advancedAutomationExitNotUnderstood",
} as const

export function exitDisplayName(node: AdvancedAutomationNode, exitId: string): { fixedKey?: keyof typeof FIXED_EXIT_LABEL_KEYS; name?: string } {
  if (exitId in FIXED_EXIT_LABEL_KEYS && !(node.kind === "send_message" && (node.options ?? []).some((o) => o.id === exitId))) {
    return { fixedKey: exitId as keyof typeof FIXED_EXIT_LABEL_KEYS }
  }
  if (node.kind === "send_message") return { name: node.options?.find((o) => o.id === exitId)?.label }
  if (node.kind === "condition") return { name: node.rows.find((r) => r.id === exitId)?.name }
  if (node.kind === "split") return { name: node.paths.find((p) => p.id === exitId)?.name }
  return {}
}

const hex24 = (v: unknown) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v)

/** Defaults for a freshly dropped step. */
export function createBotNode(kind: AdvancedAutomationNodeKind, x: number, y: number): AdvancedAutomationNode {
  const base = { id: newBotId(kind.slice(0, 6)), x, y }
  switch (kind) {
    case "send_message":
      return { ...base, kind, text: "", replyMode: "none" }
    case "condition":
      return { ...base, kind, rows: [] }
    case "wait":
      return { ...base, kind, minutes: 60 }
    case "split":
      return { ...base, kind, paths: [{ id: newBotId("a"), name: "A", percent: 50 }, { id: newBotId("b"), name: "B", percent: 50 }] }
    case "goto_automation":
      return { ...base, kind, automationId: "" }
    case "stop":
      return { ...base, kind }
    case "set_field":
      return { ...base, kind, fieldId: "", value: "" }
    case "move_stage":
      return { ...base, kind, columnId: "" }
    case "add_label":
      return { ...base, kind, labelText: "" }
    case "create_task":
      return { ...base, kind, title: "" }
    case "ai_agent":
      return { ...base, kind, instruction: "", saveAnswerTo: "" }
    case "handoff":
      return { ...base, kind, assignMode: "all_crm_members" }
    case "webhook":
      return { ...base, kind, url: "" }
    case "send_meta_template":
      return { ...base, kind, templateId: "" }
  }
}

/** Fields a preset (palette drag payload) may set per node kind. Identity and canvas position are never overridable. */
const PRESET_FIELDS: Record<AdvancedAutomationNodeKind, readonly string[]> = {
  send_message: ["text", "replyMode", "options", "noReplyMinutes", "noReplyBusinessHoursOnly", "saveAnswerTo", "attachmentUrl", "label"],
  condition: ["rows", "label"],
  wait: ["minutes", "label"],
  split: ["paths", "label"],
  goto_automation: ["automationId", "label"],
  stop: ["label"],
  set_field: ["fieldId", "value", "label"],
  move_stage: ["columnId", "projectId", "boardId", "label"],
  add_label: ["labelText", "labelColor", "projectId", "label"],
  create_task: ["title", "dueInHours", "label"],
  ai_agent: ["instruction", "saveAnswerTo", "label"],
  handoff: ["message", "to", "agentId", "assignMode", "userIds", "specificUserId", "workspaceRoleId", "label"],
  webhook: ["url", "label"],
  send_meta_template: ["templateId", "label"],
}

/** A preset comes from a drag-and-drop payload, which anything on the page (or outside it) can forge: keep only known fields. */
export function sanitizeNodePreset(kind: AdvancedAutomationNodeKind, preset: unknown): Record<string, unknown> {
  if (!preset || typeof preset !== "object" || Array.isArray(preset)) return {}
  const allowed = PRESET_FIELDS[kind]
  if (!allowed) return {}
  const out: Record<string, unknown> = {}
  for (const key of allowed) {
    const value = (preset as Record<string, unknown>)[key]
    if (value !== undefined && typeof value !== "function") out[key] = value
  }
  return out
}

type NodeIssueCode =
  | "text_missing"
  | "options_missing"
  | "options_too_many"
  | "option_label_missing"
  | "option_label_too_long"
  | "option_id_invalid"
  | "rows_missing"
  | "row_condition_missing"
  | "split_total_over_100"
  | "target_automation_missing"
  | "field_missing"
  | "column_missing"
  | "label_missing"
  | "title_missing"
  | "instruction_missing"
  | "webhook_url_invalid"
  | "template_missing"
  | "handoff_target_missing"

/** Per-step completeness check used to show "needs setup" on the canvas and block activation. */
export function nodeIssues(node: AdvancedAutomationNode): NodeIssueCode[] {
  const issues: NodeIssueCode[] = []
  switch (node.kind) {
    case "send_message": {
      if (!node.text.trim() && !node.attachmentUrl?.trim()) issues.push("text_missing")
      if (node.replyMode === "buttons" || node.replyMode === "list") {
        const options = node.options ?? []
        const max = node.replyMode === "buttons" ? SALES_BOT_LIMITS.buttons : SALES_BOT_LIMITS.listRows
        const labelMax = node.replyMode === "buttons" ? SALES_BOT_LIMITS.buttonLabelChars : SALES_BOT_LIMITS.listLabelChars
        if (options.length === 0) issues.push("options_missing")
        if (options.length > max) issues.push("options_too_many")
        if (options.some((o) => !o.label.trim())) issues.push("option_label_missing")
        if (options.some((o) => o.label.length > labelMax)) issues.push("option_label_too_long")
        if (options.some((o) => !SALES_BOT_ID_PATTERN.test(o.id) || RESERVED_OPTION_IDS.includes(o.id))) issues.push("option_id_invalid")
      }
      return issues
    }
    case "condition":
      if (node.rows.length === 0) issues.push("rows_missing")
      if (node.rows.some((r) => !r.condition || !(r.condition as { type?: string }).type)) issues.push("row_condition_missing")
      return issues
    case "split":
      if (node.paths.reduce((n, p) => n + p.percent, 0) > 100) issues.push("split_total_over_100")
      return issues
    case "goto_automation":
      if (!hex24(node.automationId)) issues.push("target_automation_missing")
      return issues
    case "set_field":
      if (!node.fieldId.trim()) issues.push("field_missing")
      return issues
    case "move_stage":
      if (!hex24(node.columnId)) issues.push("column_missing")
      return issues
    case "add_label":
      if (!node.labelText.trim()) issues.push("label_missing")
      return issues
    case "create_task":
      if (!node.title.trim()) issues.push("title_missing")
      return issues
    case "ai_agent":
      if (!node.instruction.trim()) issues.push("instruction_missing")
      if (!node.saveAnswerTo.trim()) issues.push("field_missing")
      return issues
    case "webhook":
      if (!/^https:\/\/[^\s/]+\.[^\s/]+/i.test(node.url)) issues.push("webhook_url_invalid")
      return issues
    case "send_meta_template":
      if (!node.templateId.trim()) issues.push("template_missing")
      return issues
    case "handoff":
      if (node.to === "ai") {
        if (!hex24(node.agentId)) issues.push("handoff_target_missing")
        return issues
      }
      if (node.assignMode === "specific_user" && !hex24(node.specificUserId)) issues.push("handoff_target_missing")
      if (node.assignMode === "member_list" && !node.userIds?.length) issues.push("handoff_target_missing")
      if (node.assignMode === "by_workspace_role" && !hex24(node.workspaceRoleId)) issues.push("handoff_target_missing")
      return issues
    case "stop":
      return issues
    default:
      return issues
  }
}

/** Edges whose exit no longer exists (e.g. an option was removed) must be dropped on edit. */
export function pruneDanglingEdges(nodes: AdvancedAutomationNode[], edges: AdvancedAutomationEdge[]): AdvancedAutomationEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return edges.filter((e) => {
    const from = byId.get(e.from)
    return !!from && byId.has(e.to) && nodeOutputs(from).includes(e.output)
  })
}

/** Steps nobody can reach from the start (shown as a warning; they are harmless but dead). */
export function unreachableNodeIds(startNodeId: string, nodes: AdvancedAutomationNode[], edges: AdvancedAutomationEdge[]): string[] {
  const reach = new Set<string>()
  const queue = [startNodeId]
  while (queue.length) {
    const id = queue.shift()!
    if (reach.has(id)) continue
    reach.add(id)
    for (const e of edges) if (e.from === id) queue.push(e.to)
  }
  return nodes.filter((n) => !reach.has(n.id)).map((n) => n.id)
}
