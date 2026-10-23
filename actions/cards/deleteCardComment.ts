"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"

type DeleteCardCommentInput = {
  projectId: string
  boardId: string
  cardId: string
  commentId: string
}

type DeleteCardCommentResponse = {
  status: boolean
}

export async function deleteCardCommentAction({
  projectId,
  boardId,
  cardId,
  commentId,
}: DeleteCardCommentInput): Promise<ActionOutput<null>> {
  try {
    await FetchClient.delete<DeleteCardCommentResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/boards/${boardId}/cards/${cardId}/comments/${commentId}`
    )

    return {
      data: null,
      success: true,
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
      error: "error deleting comment",
    }
  }
}
