"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"

type DeleteAttachmentInput = {
  attachmentId: string
}

/**
 * Unlinks an attachment (DELETE /attachments/:id).
 * Removes association only; the file/document remains in storage.
 */
export async function deleteAttachmentAction({ attachmentId }: DeleteAttachmentInput): Promise<ActionOutput<null>> {
  try {
    await FetchClient.delete<Record<string, never>>(`${process.env.BACKEND_URL}/attachments/${attachmentId}`)

    return {
      success: true,
      data: null,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error deleting attachment",
    }
  }
}
