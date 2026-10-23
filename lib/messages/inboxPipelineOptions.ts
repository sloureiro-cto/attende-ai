export type InboxPipelineColumnOption = { id: string; title: string }

export type InboxPipelineProjectOption = {
  id: string
  title: string
  columns: InboxPipelineColumnOption[]
}

type BoardColumnLike = { _id: string; title?: string }
type BoardWithColumns = { columns?: BoardColumnLike[] }

type ProjectLike = {
  _id: string
  title?: string
  board?: BoardWithColumns | string | null | unknown
}

function columnsFromBoard(board: ProjectLike["board"]): InboxPipelineColumnOption[] {
  if (!board || typeof board !== "object" || Array.isArray(board)) return []
  const columns = (board as BoardWithColumns).columns
  if (!Array.isArray(columns)) return []
  return columns.map((column) => ({
    id: String(column._id),
    title: column.title?.trim() || String(column._id),
  }))
}

type RowLike = {
  crmProjectId?: string | null
  crmColumnId?: string | null
}

export function buildInboxPipelineProjects(projects: ProjectLike[], rows: RowLike[]): InboxPipelineProjectOption[] {
  const byId = new Map<string, InboxPipelineProjectOption>()

  for (const project of projects) {
    const id = String(project._id)
    byId.set(id, {
      id,
      title: project.title?.trim() || id,
      columns: columnsFromBoard(project.board),
    })
  }

  for (const row of rows) {
    const projectId = row.crmProjectId?.trim()
    if (!projectId) continue
    if (!byId.has(projectId)) {
      byId.set(projectId, { id: projectId, title: projectId, columns: [] })
    }
    const columnId = row.crmColumnId?.trim()
    if (!columnId) continue
    const project = byId.get(projectId)
    if (!project) continue
    if (!project.columns.some((column) => column.id === columnId)) {
      project.columns.push({ id: columnId, title: columnId })
    }
  }

  return [...byId.values()]
}
