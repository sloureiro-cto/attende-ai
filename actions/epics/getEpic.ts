"use server"

import { ActionOutput } from "app/_types/Action"
import { IEpic } from "app/_types/Epic"
import { FetchClient, HttpError } from "lib/api"

type GetEpicInput = {
  projectId: string
  epicId: string
}

type GetEpicResponse = {
  success: boolean
  epic: IEpic
}

export async function getEpicAction({ projectId, epicId }: GetEpicInput): Promise<ActionOutput<IEpic>> {
  try {
    const data = await FetchClient.get<GetEpicResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/epics/${epicId}`
    )

    return {
      success: true,
      data: data.epic,
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
      error: "something went wrong fetching epic",
    }
  }
}
