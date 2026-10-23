"use server"

import { revalidatePath } from "next/cache"
import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"
import { entityId } from "lib/entityId"

type DeleteCardInput = {
  projectId: string
  cardId: string
  /** When both boardId and columnId are set, uses the nested board path; otherwise flat Home-safe path. */
  boardId?: string
  columnId?: string
  /** Ignored by BE workspace resolution for delete; prefer omit. Kept for call-site compat. */
  workspaceOwner?: string
}

type DeleteCardResponse = {
  status: boolean
}

/**
 * Soft-deletes a card (`deleted: true`).
 *
 * - Flat (Home / project+card only): `DELETE /projects/{projectId}/cards/{cardId}`
 * - Nested (board context): `DELETE /projects/{projectId}/boards/{boardId}/columns/{columnId}/cards/{cardId}`
 *
 * Same BE controller; flat is required when board/column ids are unavailable (e.g. Home priorities).
 */
export async function deleteCardAction({
  projectId,
  boardId,
  columnId,
  cardId,
}: DeleteCardInput): Promise<ActionOutput<null>> {
  const pid = entityId(projectId)
  const cid = entityId(cardId)
  const bid = entityId(boardId)
  const colId = entityId(columnId)

  if (!pid || !cid) {
    return { success: false, error: "error deleting card" }
  }

  const url =
    bid && colId
      ? `${process.env.BACKEND_URL}/projects/${pid}/boards/${bid}/columns/${colId}/cards/${cid}`
      : `${process.env.BACKEND_URL}/projects/${pid}/cards/${cid}`

  try {
    const data = await FetchClient.delete<DeleteCardResponse>(url)

    // Treat soft-delete no-op / false status as failure so Home does not drop the row locally.
    if (data && typeof data === "object" && "status" in data && data.status === false) {
      return { success: false, error: "error deleting card" }
    }

    revalidatePath("/projects", "layout")
    revalidatePath("/home", "layout")

    return {
      data: null,
      success: true,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error deleting card",
    }
  }
}
