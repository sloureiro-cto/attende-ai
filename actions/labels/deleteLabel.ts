"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"

type CreateLabelResponse = {
  status: boolean
  error?: boolean
  code?: number
  message?: string
}

const defaultErrorMessage = "Something went wrong while trying to delete the label."

export async function deleteLabelAction({
  projectId,
  labelId,
}: {
  projectId: string
  labelId: string
}): Promise<ActionOutput<null>> {
  try {
    await FetchClient.delete<CreateLabelResponse>(`${process.env.BACKEND_URL}/projects/${projectId}/label/${labelId}`)

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
      error: defaultErrorMessage,
    }
  }
}
