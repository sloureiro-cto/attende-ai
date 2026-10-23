"use server"

import { ActionOutput } from "app/_types/Action"
import { ILabel, UpdateLabelDTO } from "app/_types/Label"
import { FetchClient, HttpError } from "lib/api"

type CreateLabelResponse = {
  status: boolean
  label: ILabel
  error?: boolean
  code?: number
  message?: string
}

const defaultErrorMessage = "Something went wrong while trying to update the label."

export async function updateLabelAction({
  labelId,
  data,
  projectId,
}: {
  labelId: string
  data: Partial<UpdateLabelDTO>
  projectId: string
}): Promise<ActionOutput<null>> {
  try {
    await FetchClient.put<CreateLabelResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/label/${labelId}`,
      data
    )

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
