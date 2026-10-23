"use server"

import { ActionOutput } from "app/_types/Action"
import { IComment } from "app/_types/Comment"
import { FetchClient, HttpError } from "lib/api"

type GetCardCommentsInput = {
  projectId: string
  boardId: string
  cardId: string
  page: number
}

type GetCardCommentsResponse = {
  status: boolean
  comments: IComment[]
}

export async function getCardCommentsAction({
  projectId,
  boardId,
  cardId,
  page = 1,
}: GetCardCommentsInput): Promise<ActionOutput<IComment[]>> {
  try {
    const data = await FetchClient.get<GetCardCommentsResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/boards/${boardId}/cards/${cardId}/comments`,
      { query: { page } }
    )

    return {
      success: true,
      data: data.comments,
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
      error: "error fetching card comments",
    }
  }
}
