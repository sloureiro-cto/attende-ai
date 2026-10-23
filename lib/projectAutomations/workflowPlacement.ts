import type { WorkflowTemplate, WorkflowTrigger, WorkflowTriggerType } from "actions/workflows/types"
import type { WorkflowBuilderToolItem } from "actions/workflows/workflowBuilderCatalog"

const CRM_SEND_MESSAGE_TOOL = "local:crm_lite:crm_lite_send_message_to_card"
const CRM_SEND_EMAIL_TOOL = "local:crm_lite:crm_lite_send_email_to_card"

/** Triggers shown in Kanban columns (card enter column). */
export const PROJECT_COLUMN_TRIGGER_TYPES = new Set<WorkflowTriggerType>(["card_moved", "card_created"])

/** Triggers listed under form submissions. */
export const PROJECT_FORM_TRIGGER_TYPES = new Set<WorkflowTriggerType>(["form_response_submitted"])

export function triggerConfigRecord(t: WorkflowTrigger | undefined): Record<string, unknown> {
  if (!t?.config || typeof t.config !== "object") return {}
  return t.config as Record<string, unknown>
}

/** First trigger used for column / form placement in the project automations grid. */
export function primaryTrigger(w: WorkflowTemplate): WorkflowTrigger | undefined {
  return w.triggers?.[0]
}

export function workflowMatchesProject(w: WorkflowTemplate, projectId: string): boolean {
  const t = primaryTrigger(w)
  if (!t) return false
  const cfg = triggerConfigRecord(t)
  const pid = cfg.projectId
  if (pid == null || String(pid) !== projectId) return false
  return true
}

export function workflowBelongsToColumn(w: WorkflowTemplate, projectId: string, columnId: string): boolean {
  if (!workflowMatchesProject(w, projectId)) return false
  const t = primaryTrigger(w)
  if (!t) return false
  const cfg = triggerConfigRecord(t)
  if (t.type === "card_moved") return String(cfg.toColumnId ?? "") === columnId
  if (t.type === "card_created") return String(cfg.columnId ?? "") === columnId
  return false
}

export function workflowBelongsToAnyColumn(
  w: WorkflowTemplate,
  projectId: string,
  columnIds: readonly string[]
): boolean {
  return columnIds.some((cid) => workflowBelongsToColumn(w, projectId, cid))
}

export function workflowIsFormTrigger(w: WorkflowTemplate, projectId: string): boolean {
  if (!workflowMatchesProject(w, projectId)) return false
  const t = primaryTrigger(w)
  return t?.type === "form_response_submitted"
}

/** Workflows scoped to this project but not tied to a column or the form list (scheduled, webhook, inbound WA/SMS, …). */
export function workflowBelongsToExtendedTriggers(w: WorkflowTemplate, projectId: string): boolean {
  if (!workflowMatchesProject(w, projectId)) return false
  const t = primaryTrigger(w)
  if (!t) return false
  if (PROJECT_COLUMN_TRIGGER_TYPES.has(t.type)) return false
  if (PROJECT_FORM_TRIGGER_TYPES.has(t.type)) return false
  return true
}

/**
 * Prefer the workspace catalog `toolId` for CRM card messaging (do not assume the `local:*` id in every deploy).
 */
export function resolveCrmSendMessageToCardToolId(tools: WorkflowBuilderToolItem[]): string {
  for (const tool of tools) {
    if (tool.toolId === CRM_SEND_MESSAGE_TOOL) return tool.toolId
    const tn = (tool.toolName || "").toLowerCase().trim()
    if (tn === "crm_lite_send_message_to_card") return tool.toolId
  }
  return CRM_SEND_MESSAGE_TOOL
}

/**
 * Prefer the workspace catalog `toolId` for CRM card email (do not assume the `local:*` id in every deploy).
 */
export function resolveCrmSendEmailToCardToolId(tools: WorkflowBuilderToolItem[]): string {
  for (const tool of tools) {
    if (tool.toolId === CRM_SEND_EMAIL_TOOL) return tool.toolId
    const tn = (tool.toolName || "").toLowerCase().trim()
    if (tn === "crm_lite_send_email_to_card") return tool.toolId
  }
  return CRM_SEND_EMAIL_TOOL
}

/**
 * Backend payloads may use a plain string id or BSON extended JSON `{ $oid: "…" }`.
 * Using `String(objectId)` would yield `"[object Object]"` and break `/workflows/:id` routes (404).
 */
export function normalizeBackendEntityId(raw: unknown): string | undefined {
  if (raw == null) return undefined
  if (typeof raw === "string") {
    const t = raw.trim()
    return t || undefined
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (typeof o.$oid === "string" && o.$oid.trim()) return o.$oid.trim()
    if (typeof o.oid === "string" && o.oid.trim()) return o.oid.trim()
  }
  const s = String(raw).trim()
  if (s && s !== "[object Object]") return s
  return undefined
}

export function workflowMongoId(w: WorkflowTemplate): string | undefined {
  const fromUnderscore = normalizeBackendEntityId(w._id)
  if (fromUnderscore) return fromUnderscore
  return normalizeBackendEntityId(w.id)
}

export function pickAgentTools(tools: WorkflowBuilderToolItem[]): WorkflowBuilderToolItem[] {
  return tools.filter((tool) => {
    const c = (tool.category || "").toLowerCase()
    const tn = (tool.toolName || "").toLowerCase()
    const n = `${tool.displayName} ${tool.toolName} ${tool.toolId}`.toLowerCase()
    return c === "ai" || tn.includes("agent") || n.includes("execute_workspace") || n.includes("workspace_agent")
  })
}

export { CRM_SEND_MESSAGE_TOOL, CRM_SEND_EMAIL_TOOL }
