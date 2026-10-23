"use server"

import { subDays, subMonths, subWeeks } from "date-fns"
import { ActionOutput } from "app/_types/Action"
import { IProject } from "app/_types/Project"
import { FetchClient, HttpError } from "lib/api"
import { resolveSessionWorkspaceOwner } from "lib/sessionWorkspace"

function getPresetDateRange(type: string): { from: string; to: string } | null {
  const now = new Date()
  const to = now.toISOString()
  let from: Date
  switch (type) {
    case "oneDayAgo":
      from = subDays(now, 1)
      break
    case "threeDaysAgo":
      from = subDays(now, 3)
      break
    case "oneWeekAgo":
      from = subWeeks(now, 1)
      break
    case "oneMonthAgo":
      from = subMonths(now, 1)
      break
    case "threeMonthsAgo":
      from = subMonths(now, 3)
      break
    case "sixMonthsAgo":
      from = subMonths(now, 6)
      break
    default:
      return null
  }
  return { from: from.toISOString(), to }
}

export type ProjectsSortBy = "name" | "createdAt" | "updatedAt"

export type ProjectsDateFilter = {
  type?: string
  range?: {
    from?: Date
    to?: Date
  }
}

export type GetProjectsInput = {
  title?: string
  page?: number
  limit?: number
  archieved?: boolean
  sortBy?: ProjectsSortBy
  sortOrder?: "asc" | "desc"
  createdBy?: string[]
  createdAt?: ProjectsDateFilter
  updatedAt?: ProjectsDateFilter
}

type GetProjectsResponse = {
  projects: IProject[]
  total: number
  status: boolean
}

function flattenDateFilter(
  filter: ProjectsDateFilter | undefined,
  startKey: string,
  endKey: string
): Record<string, string> {
  if (!filter) return {}
  const result: Record<string, string> = {}
  let from: string | undefined
  let to: string | undefined
  if (filter.range?.from && filter.range?.to) {
    from = new Date(filter.range.from).toISOString()
    to = new Date(filter.range.to).toISOString()
  } else if (filter.type) {
    const preset = getPresetDateRange(filter.type)
    if (preset) {
      from = preset.from
      to = preset.to
    }
  }
  if (from) result[startKey] = from
  if (to) result[endKey] = to
  return result
}

export async function getProjectsAction(
  params: GetProjectsInput
): Promise<ActionOutput<IProject[]> & { total: number }> {
  try {
    const query: Record<string, unknown> = {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }
    const title = typeof params.title === "string" ? params.title.trim() : ""
    if (title) query.title = title
    if (params.archieved !== undefined) query.archieved = params.archieved

    if (params.createdBy && params.createdBy.length > 0) {
      query.createdBy = params.createdBy.join(",")
    }

    Object.assign(
      query,
      flattenDateFilter(params.createdAt, "createdAtStart", "createdAtEnd"),
      flattenDateFilter(params.updatedAt, "updatedAtStart", "updatedAtEnd")
    )

    const data = await FetchClient.get<GetProjectsResponse>(`${process.env.BACKEND_URL}/projects`, {
      query: {
        ...query,
        workspaceOwner: await resolveSessionWorkspaceOwner(),
      },
    })

    return {
      success: true,
      data: data.projects,
      total: data.total,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return {
        success: false,
        error: error.message,
        total: 0,
      }
    }

    return {
      success: false,
      error: "something went wrong fetching projects",
      total: 0,
    }
  }
}
