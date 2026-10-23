"use server"

import { ActionOutput } from "app/_types/Action"
import { IRole } from "app/_types/Role"
import { FetchClient, HttpError } from "lib/api"

type GetWorkspaceRolesResponse = {
  roles: IRole[]
}

type GetWorkspaceRolesProps = {
  workspaceId: string
  role?: string
}

const defaultErrorMessage = "Something went wrong while fetching the workspace roles."

export const getWorkspaceRoles = async ({
  workspaceId,
  role,
}: GetWorkspaceRolesProps): Promise<ActionOutput<IRole[]>> => {
  try {
    const data = await FetchClient.get<GetWorkspaceRolesResponse>(
      `${process.env.BACKEND_URL}/roles/workspaces/${workspaceId}`,
      {
        query: { role },
        next: { revalidate: 300, tags: [`workspace-roles-${workspaceId}`] },
      }
    )

    return { success: true, data: data.roles }
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
