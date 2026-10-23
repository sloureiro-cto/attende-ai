"use server"

import { ActionOutput } from "app/_types/Action"
import { IEpic } from "app/_types/Epic"
import { FetchClient, HttpError } from "lib/api"
import { withBoardIdQuery } from "lib/scrum/boardScope"

type GetEpicsInput = {
  projectId: string
  boardId?: string
}

type GetEpicsResponse = {
  success: boolean
  epics: IEpic[]
  message: string
}

export async function getEpicsAction({ projectId, boardId }: GetEpicsInput): Promise<ActionOutput<IEpic[]>> {
  try {
    const data = await FetchClient.get<GetEpicsResponse>(`${process.env.BACKEND_URL}/projects/${projectId}/epics`, {
      query: withBoardIdQuery({}, boardId),
      next: {
        tags: [`project-${projectId}-epics`, `project-${projectId}-epics-${boardId ?? "default"}`],
        revalidate: 300,
      },
    })

    return {
      success: true,
      data: data.epics,
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
      error: "something went wrong fetching project epics",
    }
  }
}
