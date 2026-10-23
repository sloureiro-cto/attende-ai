"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"

export type WorkspaceUser = {
  id: string
  name: string
  email: string
  image: string
  workspaceRole: string
  projectsCount: number
}

type GetUsersFromWorkspaceResponse = {
  user?: WorkspaceUser
  members?: WorkspaceUser[]
}

export const getUsersFromWorkspace = async (
  workspaceId: string,
  userId?: string
): Promise<ActionOutput<WorkspaceUser[]>> => {
  try {
    const query = userId ? { query: { userId } } : {}
    const data = await FetchClient.get<GetUsersFromWorkspaceResponse>(
      `${process.env.BACKEND_URL}/users/workspaces/${workspaceId}`,
      {
        ...query,
      }
    )

    if (data.user) {
      return { success: true, data: [data.user] }
    }
    return { success: true, data: data.members ?? [] }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching users from workspace",
    }
  }
}
