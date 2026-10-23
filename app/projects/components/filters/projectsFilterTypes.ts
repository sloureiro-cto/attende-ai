import type { ProjectsDateFilter, ProjectsSortBy } from "actions/projects/getProjects"

export type { ProjectsDateFilter, ProjectsSortBy }

export const DEFAULT_PROJECTS_SORT_BY: ProjectsSortBy = "createdAt"
export const DEFAULT_PROJECTS_SORT_ORDER: "asc" | "desc" = "desc"

export interface ProjectsListFilter {
  createdBy?: string[]
  createdAt?: ProjectsDateFilter
  updatedAt?: ProjectsDateFilter
}

export const EMPTY_PROJECTS_LIST_FILTER: ProjectsListFilter = {
  createdBy: [],
  createdAt: undefined,
  updatedAt: undefined,
}

export function isProjectsListFilterActive(filter: ProjectsListFilter): boolean {
  return (
    (filter.createdBy != null && filter.createdBy.length > 0) ||
    Boolean(filter.createdAt?.type) ||
    Boolean(filter.updatedAt?.type)
  )
}
