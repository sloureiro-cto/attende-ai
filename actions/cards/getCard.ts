"use server"

import { ActionOutput } from "app/_types/Action"
import { ICard } from "app/_types/Card"
import { FetchClient, HttpError } from "lib/api"

type GetCardInput = {
  projectId: string
  workspaceOwner?: string
  cardId: string
}

type GetCardResponse = {
  card: ICard
  status: boolean
}

export async function getCardAction({ projectId, workspaceOwner, cardId }: GetCardInput): Promise<ActionOutput<ICard>> {
  try {
    const data = await FetchClient.get<GetCardResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/cards/${cardId}`,
      { query: { workspaceOwner } }
    )

    return {
      success: true,
      data: data.card,
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
