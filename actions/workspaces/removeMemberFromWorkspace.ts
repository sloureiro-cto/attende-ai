"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"

type RemoveMemberFromWorkspaceInput = {
  workspaceId: string
  memberId: string
}

export async function removeMemberFromWorkspace({
  workspaceId,
  memberId,
}: RemoveMemberFromWorkspaceInput): Promise<ActionOutput<null>> {
  try {
    await FetchClient.delete<void>(`${process.env.BACKEND_URL}/workspaces/${workspaceId}/users/${memberId}`)

    return {
      success: true,
      data: null,
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
