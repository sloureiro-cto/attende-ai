import { IProject } from "app/_types/Project"

/**
 * Check if a project has a specific property enabled
 */
export function hasProjectProperty(project: IProject | null | undefined, property: string): boolean {
  if (!project?.projectType?.properties) {
    return false
  }
  return project.projectType.properties.includes(property)
}

/**
 * Check if project has backlog feature
 */
export function hasBacklog(project: IProject | null | undefined): boolean {
  return hasProjectProperty(project, "projects:backlog")
}

/**
 * Check if project has epic feature
 */
export function hasEpic(project: IProject | null | undefined): boolean {
  return hasProjectProperty(project, "projects:epic")
}

/**
 * Sprint controls belong only on a scrum project, and only on a scrum board.
 * Kanban and pipeline (crm) projects never show them, even when the type still
 * lists `projects:sprint` or the open board is tagged scrum.
 */
export function hasSprint(project: IProject | null | undefined, boardType?: string | null): boolean {
  const title = project?.projectType?.title?.toLowerCase()
  if (title === "crm" || title === "kanban") return false
  const board = boardType?.toLowerCase()
  if (board === "crm" || board === "kanban") return false
  if (board === "scrum" || title === "scrum") return true
  return hasProjectProperty(project, "projects:sprint")
}

/**
 * Check if project is a CRM project
 */
export function isCrmProject(project: IProject | null | undefined): boolean {
  return project?.projectType?.title === "crm"
}

/**
 * Project that holds CRM leads: a CRM project, or any project with its own CRM (pipeline)
 * board tab. Saved views of another project (`linkedProjectId`) don't count — their cards
 * live in the linked project. Use this wherever leads can land (messaging lead creation,
 * project CRM channel settings), not `isCrmProject`.
 */
export function projectHasCrmBoard(project: IProject | null | undefined): boolean {
  if (!project) return false
  if (isCrmProject(project)) return true
  return (project.tabs ?? []).some(
    (tab) => tab.type === "board" && tab.boardType === "crm" && !tab.linkedProjectId
  )
}
