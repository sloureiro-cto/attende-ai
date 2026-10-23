"use server"

import { ActionOutput } from "app/_types/Action"
import { ILabel } from "app/_types/Label"
import { FetchClient, HttpError } from "lib/api"

type GetLabelsResponse = {
  status: boolean
  labels: ILabel[]
  error?: boolean
  code?: number
  message?: string
}

const defaultErrorMessage = "Something went wrong while trying to get project the labels."

export async function getLabelsAction(projectId: string): Promise<ActionOutput<ILabel[]>> {
  if (!projectId || projectId === "undefined") {
    return { success: false, error: "missing project id" }
  }

  try {
    const data = await FetchClient.get<GetLabelsResponse>(`${process.env.BACKEND_URL}/projects/${projectId}/labels`, {
      cache: "no-store",
    })

    return {
      success: true,
      data: data.labels,
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
