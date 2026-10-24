import type { IColumn } from "app/_types/Column"
import type { IProject } from "app/_types/Project"
import { columnBoardId } from "lib/projects/projectBoardRefs"
import type { AdvancedAutomationNode } from "./types"

/** What a "move to stage" step stores. All three are persisted so the picker reopens as it was left. */
export type StageSelection = { projectId: string; boardId: string; columnId: string }

type MoveStageNode = Extract<AdvancedAutomationNode, { kind: "move_stage" }>

export const EMPTY_STAGE: StageSelection = { projectId: "", boardId: "", columnId: "" }

export const stageOfNode = (node: Pick<MoveStageNode, "projectId" | "boardId" | "columnId">): StageSelection => ({
  projectId: node.projectId ?? "",
  boardId: node.boardId ?? "",
  columnId: node.columnId ?? "",
})

/** A new project invalidates the board and column chosen under the old one. */
export function selectProject(projectId: string): StageSelection {
  return { projectId, boardId: "", columnId: "" }
}

/** Another board keeps the column only when that column belongs to it. */
export function selectBoard(current: StageSelection, boardId: string, columns: IColumn[]): StageSelection {
  const column = columns.find((c) => c._id === current.columnId)
  const keep = Boolean(column && boardId && columnBoardId(column.board) === boardId)
  return { ...current, boardId, columnId: keep ? current.columnId : "" }
}

/** The column decides the board (a column belongs to exactly one). */
export function selectColumn(current: StageSelection, columnId: string, columns: IColumn[]): StageSelection {
  const column = columns.find((c) => c._id === columnId)
  return { ...current, columnId, boardId: (column ? columnBoardId(column.board) : "") || current.boardId }
}

/** Seeds the only board of a project so its columns can be fetched without asking the author. */
export function withSoleBoard(current: StageSelection, boardIds: string[]): StageSelection {
  if (!current.projectId || current.boardId || boardIds.length !== 1) return current
  return { ...current, boardId: boardIds[0]! }
}

/** Column title for the card summary, or undefined while the columns are not loaded. */
export function columnTitle(columns: IColumn[] | undefined, columnId: string): string | undefined {
  const title = columns?.find((c) => c._id === columnId)?.title?.trim()
  return title || undefined
}

/** Distinct (project, board) pairs of the move-stage steps: what must be loaded to name them. */
export function stageRefsOfNodes(nodes: AdvancedAutomationNode[]): Array<{ projectId: string; boardId: string }> {
  const seen = new Map<string, { projectId: string; boardId: string }>()
  for (const n of nodes) {
    if (n.kind !== "move_stage" || !n.projectId) continue
    seen.set(`${n.projectId}:${n.boardId ?? ""}`, { projectId: n.projectId, boardId: n.boardId ?? "" })
  }
  return [...seen.values()]
}

/** nodeId -> "Project · Column" for every move-stage step whose column is already loaded. */
export function stageLabelsByNode(
  nodes: AdvancedAutomationNode[],
  columnsByProject: Record<string, IColumn[] | undefined>,
  projects: Array<Pick<IProject, "_id" | "title">>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const n of nodes) {
    if (n.kind !== "move_stage" || !n.columnId) continue
    const column = columnTitle(n.projectId ? columnsByProject[n.projectId] : undefined, n.columnId)
    if (!column) continue
    const project = projects.find((p) => p._id === n.projectId)?.title?.trim()
    out[n.id] = project ? `${project} · ${column}` : column
  }
  return out
}
