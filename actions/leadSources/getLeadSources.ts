"use server"

import { ActionOutput } from "app/_types/Action"
import { ILeadSource } from "app/_types/Card"
import { FetchClient, HttpError } from "lib/api"

type GetLeadSourcesInput = {
  projectId: string
  workspaceOwner?: string
  boardId?: string
}

type GetLeadSourcesResponse = {
  success: boolean
  leadSources: ILeadSource[]
  message: string
}

export async function getLeadSourcesAction({
  projectId,
  workspaceOwner,
  boardId,
}: GetLeadSourcesInput): Promise<ActionOutput<ILeadSource[]>> {
  if (!projectId || projectId === "undefined") {
    return { success: false, error: "missing project id" }
  }

  try {
    const data = await FetchClient.get<GetLeadSourcesResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/lead-sources`,
      {
        query: { workspaceOwner, boardId },
      }
    )

    return {
      success: true,
      data: data.leadSources || [],
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      // If it's a 404 or 400, it might mean the project is not CRM or endpoint doesn't exist
      // Return empty array instead of error for these cases
      if (error.status === 404 || error.status === 400) {
        return {
          success: true,
          data: [],
        }
      }
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: "something went wrong fetching lead sources",
    }
  }
}
