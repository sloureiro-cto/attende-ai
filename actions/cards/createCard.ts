"use server"

import { revalidatePath } from "next/cache"
import { serializeCardPayload } from "@/lib/card/cardCalendarDate"
import { ActionOutput } from "app/_types/Action"
import { ICard } from "app/_types/Card"
import { FetchClient, HttpError } from "lib/api"

type CreateCardInput = {
  card: Partial<ICard>
  workspaceOwner?: string
}

type CreateCardResponse = {
  card: ICard
  status: boolean
}

export async function createCardAction({ card, workspaceOwner }: CreateCardInput): Promise<ActionOutput<ICard>> {
  try {
    const serializedCard = serializeCardPayload({ ...card })
    const data = await FetchClient.post<CreateCardResponse>(
      `${process.env.BACKEND_URL}/projects/${card.project}/cards`,
      serializedCard,
      { query: { workspaceOwner } }
    )

    const { card: newCard } = data

    revalidatePath("/projects", "layout")

    return {
      success: true,
      data: newCard,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error creating card",
    }
  }
}
