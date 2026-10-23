"use server"

import { ActionOutput } from "app/_types/Action"
import { IComment } from "app/_types/Comment"
import { FetchClient, HttpError } from "lib/api"

type CommentOnCardInput = {
  projectId: string
  boardId: string
  cardId: string
  comment: string
}

type CommentOnCardResponse = {
  status: boolean
  comment: IComment
}

export async function commentOnCardAction({
  projectId,
  boardId,
  cardId,
  comment,
}: CommentOnCardInput): Promise<ActionOutput<IComment>> {
  try {
    const data = await FetchClient.post<CommentOnCardResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/boards/${boardId}/cards/${cardId}/comments`,
      { text: comment }
    )

    return {
      success: true,
      data: data.comment,
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
      error: "error commenting on card",
    }
  }
}
