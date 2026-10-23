"use server"

import { ActionOutput } from "app/_types/Action"
import { IWorkspace } from "context/WorkspaceContext"
import { FetchClient, HttpError } from "lib/api"

type GetWorkspacesResponse = {
  status: boolean
  workspaces: IWorkspace[]
  total?: number
  page?: number
  limit?: number
  hasMore?: boolean
}

export type GetWorkspacesActionOptions = {
  search?: string
  page?: number
  limit?: number
}

export type GetWorkspacesActionData = {
  workspaces: IWorkspace[]
  total?: number
  page?: number
  limit?: number
  hasMore?: boolean
}

/** Legacy callers expect `IWorkspace[]`. Paginated callers use `getWorkspacesPageAction`. */
export async function getWorkspacesAction(): Promise<ActionOutput<IWorkspace[]>> {
  try {
    const data = await FetchClient.get<GetWorkspacesResponse>(`${process.env.BACKEND_URL}/workspaces`)

    return {
      success: true,
      data: data.workspaces,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching workspaces",
    }
  }
}

export async function getWorkspacesPageAction(
  options: GetWorkspacesActionOptions = {}
): Promise<ActionOutput<GetWorkspacesActionData>> {
  try {
    const query: Record<string, string> = {}
    if (options.search?.trim()) query.search = options.search.trim()
    query.page = String(Math.max(1, options.page ?? 1))
    query.limit = String(Math.min(100, Math.max(1, options.limit ?? 20)))

    const data = await FetchClient.get<GetWorkspacesResponse>(`${process.env.BACKEND_URL}/workspaces`, {
      query,
    })

    return {
      success: true,
      data: {
        workspaces: data.workspaces ?? [],
        total: data.total,
        page: data.page,
        limit: data.limit,
        hasMore: data.hasMore ?? false,
      },
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching workspaces",
    }
  }
}
