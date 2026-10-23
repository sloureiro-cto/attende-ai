import { getColumnsAction } from "actions/columns/getColumns"
import { getBoardsAction } from "actions/projects/getBoards"
import { getProjectTabsAction } from "actions/projects/getProjectTabs"
import type { IColumn } from "app/_types/Column"
import type { IProject } from "app/_types/Project"
import {
  boardIdFromProject,
  boardRefsFromProject,
  labelColumnsForBoards,
  type LabeledBoardColumn,
  mergeProjectBoardRefs,
  type ProjectBoardRef,
  shouldUseInlineProjectBoardRefs,
} from "lib/projects/projectBoardRefs"

export {
  boardIdFromProject,
  boardRefsFromProject,
  boardsForColumnPicker,
  columnBoardId,
  formMatchesBoard,
  isActiveBoardCrm,
  labelColumnsForBoards,
  mergeProjectBoardRefs,
  mergeProjectColumnCache,
  preferCrmBoardRefs,
  resolveAutomationBoardId,
  shouldUseInlineProjectBoardRefs,
  type LabeledBoardColumn,
  type ProjectBoardRef,
} from "lib/projects/projectBoardRefs"

export type RequestBoardColumns = (projectId: string, boardId?: string) => void

async function fetchBoardDocsAsRefs(projectId: string): Promise<ProjectBoardRef[]> {
  const res = await getBoardsAction(projectId)
  if (!res.success || !res.data?.length) return []
  return res.data
    .map((board) => {
      const boardId = String(board._id ?? "").trim()
      if (!boardId) return null
      return {
        boardId,
        title: board.title?.trim() || boardId,
      } satisfies ProjectBoardRef
    })
    .filter((ref): ref is ProjectBoardRef => ref != null)
}

export async function resolveProjectBoardRefs(project: IProject): Promise<ProjectBoardRef[]> {
  if (shouldUseInlineProjectBoardRefs(project)) {
    return boardRefsFromProject(project)
  }
  const [tabsRes, fromDocs] = await Promise.all([
    getProjectTabsAction(String(project._id)),
    fetchBoardDocsAsRefs(String(project._id)),
  ])
  const fromTabs = boardRefsFromProject(
    tabsRes.success && tabsRes.data?.length ? { ...project, tabs: tabsRes.data } : project
  )
  return mergeProjectBoardRefs(fromTabs, fromDocs)
}

export async function fetchColumnsForBoard(
  projectId: string,
  boardId: string,
  boards?: ProjectBoardRef[]
): Promise<LabeledBoardColumn[]> {
  if (!projectId.trim() || !boardId.trim()) return []
  const res = await getColumnsAction({ projectId, boardId })
  const cols = res.success && res.data ? res.data : []
  return labelColumnsForBoards(cols, boards ?? [{ boardId, title: boardId }])
}

export async function fetchAllBoardColumnsForProject(project: IProject): Promise<LabeledBoardColumn[]> {
  const boards = await resolveProjectBoardRefs(project)
  if (boards.length === 0) return []

  const chunks = await Promise.all(
    boards.map(async (board) => {
      const res = await getColumnsAction({ projectId: String(project._id), boardId: board.boardId })
      return res.success && res.data ? res.data : []
    })
  )
  return labelColumnsForBoards(chunks.flat(), boards)
}

export async function fetchAllBoardColumnsForProjectId(
  projectId: string,
  project?: IProject | null
): Promise<LabeledBoardColumn[]> {
  if (!projectId.trim()) return []
  const stub: IProject = project ?? ({ _id: projectId, private: false, folderId: "" } as IProject)
  return fetchAllBoardColumnsForProject({ ...stub, _id: projectId })
}

/** Dropdown-ready columns: `title` already includes the board name when the project has multiple boards. */
export function columnsForSelect(columns: LabeledBoardColumn[]): IColumn[] {
  return columns.map((column) => ({ ...column, title: column.displayLabel }))
}
