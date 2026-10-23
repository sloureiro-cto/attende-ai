import type { IColumn } from "app/_types/Column"
import type { IProject } from "app/_types/Project"
import {
  boardIdFromProject,
  boardRefsFromProject,
  columnsForSelect,
  fetchAllBoardColumnsForProjectId,
  fetchColumnsForBoard,
  resolveAutomationBoardId,
} from "lib/projects/listProjectBoardColumns"

export { boardIdFromProject }

function findCrmProject(projectId: string, crmProjects?: IProject[] | unknown): IProject | null {
  if (!Array.isArray(crmProjects)) return null
  return (
    crmProjects.find((entry): entry is IProject => {
      if (!entry || typeof entry !== "object" || !("_id" in entry)) return false
      return String((entry as IProject)._id) === projectId
    }) ?? null
  )
}

/**
 * Fetch columns for every board tab on the project (not only `project.board`).
 * When the project has multiple boards, column titles are prefixed with the board name.
 */
export async function fetchProjectColumns(
  projectId: string,
  crmProjects?: IProject[] | unknown,
  _opts?: { workspaceOwner?: string }
): Promise<IColumn[]> {
  if (!projectId.trim()) return []

  const project = findCrmProject(projectId, crmProjects)

  const columns = await fetchAllBoardColumnsForProjectId(projectId, project)
  return columnsForSelect(columns)
}

/** One board's columns for automation pickers. Empty boardId + several tabs → no fetch. */
export async function fetchAutomationBoardColumns(
  projectId: string,
  crmProjects?: IProject[] | unknown,
  boardId?: string
): Promise<{ boardId: string; columns: IColumn[] } | null> {
  if (!projectId.trim()) return null
  const project = findCrmProject(projectId, crmProjects)
  const boards = project ? boardRefsFromProject(project) : []
  const targetBoardId = resolveAutomationBoardId(project, boardId)
  if (!targetBoardId) return null
  const columns = columnsForSelect(await fetchColumnsForBoard(projectId, targetBoardId, boards))
  return { boardId: targetBoardId, columns }
}
