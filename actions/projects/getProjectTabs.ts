"use server"

import { ActionOutput } from "app/_types/Action"
import { IProjectTab } from "app/_types/Project"
import { FetchClient, HttpError } from "lib/api"
import { resolveSessionWorkspaceOwner } from "lib/sessionWorkspace"

type GetProjectTabsResponse = {
  tabs: IProjectTab[]
  status: boolean
}

export async function getProjectTabsAction(projectId: string): Promise<ActionOutput<IProjectTab[]>> {
  try {
    const data = await FetchClient.get<GetProjectTabsResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/tabs`,
      {
        cache: "no-store",
        query: { workspaceOwner: await resolveSessionWorkspaceOwner() },
      }
    )

    return {
      success: true,
      data: data.tabs,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "something went wrong fetching project tabs",
    }
  }
}
