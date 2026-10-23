import type { IColumn } from "app/_types/Column"
import type { IProject, IProjectTab } from "app/_types/Project"

export type ProjectBoardRef = {
  boardId: string
  title: string
  boardType?: "kanban" | "scrum" | "crm"
}

export type LabeledBoardColumn = IColumn & {
  displayLabel: string
  boardTitle: string
}

/** Normalize `column.board` / `project.board` whether the API sent a hex string or a populated `{ _id }`. */
export function columnBoardId(board: unknown): string {
  if (board == null || board === "") return ""
  if (typeof board === "string") {
    const trimmed = board.trim()
    return !trimmed || trimmed === "[object Object]" ? "" : trimmed
  }
  if (typeof board !== "object") return ""
  const rec = board as { _id?: unknown; id?: unknown }
  if (rec._id != null && rec._id !== board) return columnBoardId(rec._id)
  if (typeof rec.id === "string") {
    const trimmed = rec.id.trim()
    return !trimmed || trimmed === "[object Object]" ? "" : trimmed
  }
  return ""
}

export function boardIdFromProject(project: IProject | null | undefined): string | null {
  if (!project) return null
  return columnBoardId(project.board) || null
}

export function tabBoardId(tab: IProjectTab, defaultBoardId: string | null): string | null {
  if (tab.boardId) return tab.boardId
  if (tab.isDefault) return defaultBoardId
  return null
}

export function resolveTabBoardId(
  tab: IProjectTab | null | undefined,
  project: IProject | null | undefined
): string | undefined {
  if (!tab) return boardIdFromProject(project) ?? undefined
  return tabBoardId(tab, boardIdFromProject(project)) ?? undefined
}

export function findBoardTabByBoardId(
  tabs: IProjectTab[],
  boardId: string | undefined,
  defaultBoardId: string | null
): IProjectTab | undefined {
  if (!boardId) return undefined
  return tabs.find((tab) => tab.type === "board" && tabBoardId(tab, defaultBoardId) === boardId)
}

/** True when the project document already has board tabs we can show without extra fetches. */
export function shouldUseInlineProjectBoardRefs(project: IProject | null | undefined): boolean {
  if (!project) return false
  const boardTabs = (project.tabs ?? []).filter((tab) => tab.type === "board")
  return boardTabs.length > 0 && boardRefsFromProject(project).length > 0
}

export function boardRefsFromProject(project: IProject): ProjectBoardRef[] {
  const defaultBoardId = boardIdFromProject(project)
  const tabs = (project.tabs ?? []).filter((tab) => tab.type === "board")
  if (tabs.length === 0) {
    return defaultBoardId
      ? [
          {
            boardId: defaultBoardId,
            title: project.title?.trim() || "Board",
            boardType: project.projectType?.title,
          },
        ]
      : []
  }

  const seen = new Set<string>()
  const refs: ProjectBoardRef[] = []
  for (const tab of tabs) {
    const boardId = tabBoardId(tab, defaultBoardId)
    if (!boardId || seen.has(boardId)) continue
    seen.add(boardId)
    refs.push({
      boardId,
      title: tab.title?.trim() || (tab.isDefault ? project.title?.trim() || "Board" : boardId),
      boardType: tab.boardType ?? (tab.isDefault ? project.projectType?.title : undefined),
    })
  }
  return refs
}

/** Union board lists without dropping non-CRM / non-tab boards. First list wins on title. */
export function mergeProjectBoardRefs(...groups: ProjectBoardRef[][]): ProjectBoardRef[] {
  const byId = new Map<string, ProjectBoardRef>()
  for (const group of groups) {
    for (const ref of group) {
      const boardId = ref.boardId?.trim()
      if (!boardId) continue
      const prev = byId.get(boardId)
      if (!prev) {
        byId.set(boardId, { ...ref, boardId })
        continue
      }
      byId.set(boardId, {
        boardId,
        title: prev.title?.trim() || ref.title?.trim() || boardId,
        boardType: prev.boardType ?? ref.boardType,
      })
    }
  }
  return [...byId.values()]
}

/** Prefer CRM tabs when a kanban/scrum project also has a pipeline board. */
export function preferCrmBoardRefs(boards: ProjectBoardRef[]): ProjectBoardRef[] {
  const crm = boards.filter((board) => board.boardType === "crm")
  return crm.length > 0 ? crm : boards
}

export function isActiveBoardCrm(project: IProject, activeBoardId?: string): boolean {
  const defaultBoardId = boardIdFromProject(project)
  const tabs = project.tabs ?? []
  if (activeBoardId && tabs.length > 0) {
    const tab = tabs.find((entry) => tabBoardId(entry, defaultBoardId) === activeBoardId)
    if (tab?.boardType) return tab.boardType === "crm"
  }
  return project.projectType?.title === "crm"
}

export function formMatchesBoard(
  form: { boardId?: unknown },
  boardId: string | null | undefined,
  includeUnassigned: boolean
): boolean {
  const dest = form.boardId != null && String(form.boardId).trim() ? String(form.boardId) : ""
  if (dest) return !!boardId && dest === boardId
  return includeUnassigned
}

/** Prefer project tabs; merge in extra boards inferred from loaded columns. */
export function boardsForColumnPicker(
  project: IProject | null | undefined,
  columns: Array<IColumn & { boardTitle?: string }>
): ProjectBoardRef[] {
  const fromProject = project ? boardRefsFromProject(project) : []
  const fromColumns: ProjectBoardRef[] = []
  const seen = new Set(fromProject.map((board) => board.boardId))
  for (const column of columns) {
    const boardId = columnBoardId(column.board)
    if (!boardId || seen.has(boardId)) continue
    seen.add(boardId)
    fromColumns.push({
      boardId,
      title: column.boardTitle?.trim() || fromProject.find((board) => board.boardId === boardId)?.title || "Board",
    })
  }
  return mergeProjectBoardRefs(fromProject, fromColumns)
}

export function resolveAutomationBoardId(project: IProject | null | undefined, boardId?: string): string {
  const explicit = (boardId ?? "").trim()
  if (explicit) return explicit
  const boards = project ? boardRefsFromProject(project) : []
  return boards.length === 1 ? boards[0]!.boardId : ""
}

export function mergeProjectColumnCache(prev: IColumn[], incoming: IColumn[], boardId: string): IColumn[] {
  const kept = prev.filter((column) => columnBoardId(column.board) !== boardId)
  return [...kept, ...incoming]
}

export function labelColumnsForBoards(columns: IColumn[], boards: ProjectBoardRef[]): LabeledBoardColumn[] {
  const titleByBoard = Object.fromEntries(boards.map((board) => [board.boardId, board.title]))
  const multi = boards.length > 1
  return columns.map((column) => {
    const boardId = columnBoardId(column.board)
    const boardTitle = titleByBoard[boardId] || ""
    return {
      ...column,
      boardTitle,
      displayLabel: multi && boardTitle ? `${boardTitle} · ${column.title}` : column.title,
    }
  })
}
