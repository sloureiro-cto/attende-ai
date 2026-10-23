"use server"

import { revalidateTag } from "next/cache"
import { ActionOutput } from "app/_types/Action"
import { auth } from "auth"
import { WORKSPACE_INVITES_PREFIX } from "constants/actions"
import { FetchClient, HttpError } from "lib/api"

type RemoveWorkspaceInviteInput = {
  inviteId: string
}

type RemoveWorkspaceInviteResponse = {
  status: boolean
}

export async function removeWorkspaceInviteAction({
  inviteId,
}: RemoveWorkspaceInviteInput): Promise<ActionOutput<boolean>> {
  try {
    const session = await auth()

    const data = await FetchClient.delete<RemoveWorkspaceInviteResponse>(
      `${process.env.BACKEND_URL}/invites/${inviteId}`
    )

    revalidateTag(`${WORKSPACE_INVITES_PREFIX}${session?.user.workspaceId}-failed`)

    if (!data.status) {
      return { success: false, error: "Error removing workspace invite." }
    }

    return {
      success: true,
      data: true,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "Error removing workspace invite.",
    }
  }
}
