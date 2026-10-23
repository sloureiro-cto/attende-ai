"use server"

import { ActionOutput } from "app/_types/Action"
import { ICard } from "app/_types/Card"
import { FetchClient, HttpError } from "lib/api"

type GetCardsInput = {
  projectId: string
  workspaceOwner?: string
  query?: {
    exclude?: string
    onlyActiveSprints?: string
    type?: string
    include?: string
    includeTimeEntries?: string
    sprintIds?: string[]
    withoutSprint?: string
    page?: number
    limit?: number
    /** Search/filter string when supported by `/projects/:id/cards`. */
    search?: string
    /** Multi-board tabs — narrows to a single board's own cards instead of the whole project. */
    board?: string
  }
}

type GetCardsResponse = {
  cards: ICard[]
  status: boolean
  total?: number
}

export async function getCardsAction({
  projectId,
  workspaceOwner,
  query,
}: GetCardsInput): Promise<ActionOutput<ICard[]>> {
  if (!projectId || projectId === "undefined") {
    return { success: false, error: "missing project id" }
  }

  try {
    const limit = Number(query?.limit ?? 40) || 40
    const page = Number(query?.page ?? 1) || 1
    const data = await FetchClient.get<GetCardsResponse>(`${process.env.BACKEND_URL}/projects/${projectId}/cards`, {
      query: { ...query, workspaceOwner },
    })

    return {
      success: true,
      data: data.cards,
      ...(typeof data.total === "number"
        ? {
            pagination: {
              total: data.total,
              page,
              limit,
              totalPages: Math.ceil(data.total / Math.max(limit, 1)),
            },
          }
        : {}),
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: "something went wrong fetching project cards",
    }
  }
}
