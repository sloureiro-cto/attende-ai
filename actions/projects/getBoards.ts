"use server"

import { ActionOutput } from "app/_types/Action"
import { IBoard } from "app/_types/Board"
import { FetchClient, HttpError } from "lib/api"
import { resolveSessionWorkspaceOwner } from "lib/sessionWorkspace"

type GetBoardsResponse = {
  boards: IBoard[]
  status: boolean
}

export async function getBoardsAction(projectId: string): Promise<ActionOutput<IBoard[]>> {
  if (!projectId.trim()) {
    return { success: false, error: "missing project id" }
  }

  try {
    const data = await FetchClient.get<GetBoardsResponse>(`${process.env.BACKEND_URL}/projects/${projectId}/boards`, {
      cache: "no-store",
      query: { workspaceOwner: await resolveSessionWorkspaceOwner() },
    })

    return {
      success: true,
      data: data.boards ?? [],
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "something went wrong fetching project boards",
    }
  }
}
