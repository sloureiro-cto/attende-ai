"use server"

import { ActionOutput } from "app/_types/Action"
import { IWorkspace } from "context/WorkspaceContext"
import { FetchClient, HttpError } from "lib/api"

type GetWorkspaceInput = {
  id: string
}

type GetWorkspaceResponse = {
  status: boolean
  workspace: IWorkspace
}

export async function getWorkspaceAction({ id }: GetWorkspaceInput): Promise<ActionOutput<IWorkspace>> {
  try {
    const data = await FetchClient.get<GetWorkspaceResponse>(`${process.env.BACKEND_URL}/workspaces/${id}`)

    return {
      success: true,
      data: data.workspace,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching workspaces",
    }
  }
}
