"use server"

import { revalidatePath } from "next/cache"
import { serializeCardPayload } from "@/lib/card/cardCalendarDate"
import { ActionOutput } from "app/_types/Action"
import { ICard } from "app/_types/Card"
import { FetchClient, HttpError } from "lib/api"

type UpdateCardInput = {
  cardData: Partial<ICard>
  projectId: string
  workspaceOwner?: string
}

type UpdateCardResponse = {
  status: boolean
  card: ICard
}

export async function updateCardAction({ cardData, projectId }: UpdateCardInput): Promise<ActionOutput<ICard>> {
  try {
    const serializedCardData = serializeCardPayload({ ...cardData })
    const data = await FetchClient.put<UpdateCardResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/cards/${cardData._id}`,
      serializedCardData
    )

    revalidatePath("/projects", "layout")

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
      error: "error updating card",
    }
  }
}
