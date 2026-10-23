"use server"

import { ActionOutput } from "app/_types/Action"
import { ICard } from "app/_types/Card"
import { FetchClient, HttpError } from "lib/api"

type GetSubtasksInput = {
  cardId: string
  projectId: string
}

type GetSubtasksResponse = {
  subtasks: ICard[]
  status: boolean
}

export async function getSubtasksAction({ cardId, projectId }: GetSubtasksInput): Promise<ActionOutput<ICard[]>> {
  try {
    const data = await FetchClient.get<GetSubtasksResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/cards/${cardId}/subtasks`
    )

    return {
      success: true,
      data: data.subtasks,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "something went wrong fetching card",
    }
  }
}
