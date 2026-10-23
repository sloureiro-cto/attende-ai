import type { VisualAction } from "lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import { allSteps, type EditorFlow } from "./flowModel"

type ColumnRequest = { projectId: string; boardId?: string }

/** Actions whose destination is a project / board / column. They all keep it in `moveProjectId`, `boardId`, `columnId`. */
const CRM_DESTINATION_ACTIONS = new Set<VisualAction["type"]>(["move_linked_card", "clone_linked_card", "create_lead", "route_to_crm"])

export const isCrmDestinationAction = (type: VisualAction["type"]) => CRM_DESTINATION_ACTIONS.has(type)

const clean = (value: string | undefined) => (value ?? "").trim()

/**
 * Every (project, board) whose columns the open automation already refers to, deduplicated. The editor
 * loads these when it opens so pickers show the saved destination instead of an empty list.
 */
export function collectColumnRequests(flow: EditorFlow): ColumnRequest[] {
  const seen = new Set<string>()
  const out: ColumnRequest[] = []
  const add = (projectId: string | undefined, boardId: string | undefined) => {
    const pid = clean(projectId)
    if (!pid) return
    const bid = clean(boardId)
    const key = `${pid}:${bid}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(bid ? { projectId: pid, boardId: bid } : { projectId: pid })
  }

  for (const step of allSteps(flow)) {
    if (isCrmDestinationAction(step.action.type)) add(step.action.moveProjectId, step.action.boardId)
  }
  const conditions = [...flow.filters, ...(flow.router?.paths.flatMap((p) => (p.kind === "condition" ? p.conditions : [])) ?? [])]
  for (const when of conditions) {
    if (when.type === "linked_card_in") for (const row of when.linkedCardAnyOf ?? []) add(row.projectId, row.boardId)
    if (when.type === "new_lead") add(when.newLeadProjectId, when.newLeadBoardId)
  }
  return out
}

export type ColumnsStatus = "loading" | "error" | "ready"

/** What the picker should tell the user about a project's columns; `null` when there is nothing to say. */
export function columnsHint(params: { projectId: string; status: ColumnsStatus | undefined; columnCount: number; boardCount: number; boardChosen: boolean }): "loading" | "error" | "pickBoard" | "empty" | null {
  if (!clean(params.projectId)) return null
  if (params.status === "loading") return "loading"
  if (params.status === "error") return "error"
  if (params.columnCount > 0) return null
  if (params.boardCount > 1 && !params.boardChosen) return "pickBoard"
  return params.status === "ready" ? "empty" : null
}
