"use server"

import { revalidateTag } from "next/cache"
import { ActionOutput } from "app/_types/Action"
import { IInvite } from "app/_types/Invite"
import { auth } from "auth"
import { WORKSPACE_INVITES_PREFIX } from "constants/actions"
import { FetchClient, HttpError } from "lib/api"

type CancelWorkspaceInviteResponse = {
  status: boolean
  invite: IInvite
}

export async function cancelWorkspaceInviteAction({ inviteId }: { inviteId: string }): Promise<ActionOutput<IInvite>> {
  try {
    const session = await auth()

    const data = await FetchClient.post<CancelWorkspaceInviteResponse>(
      `${process.env.BACKEND_URL}/invites/${inviteId}/workspaces/cancel`,
      {
        inviteId,
      }
    )

    revalidateTag(`${WORKSPACE_INVITES_PREFIX}${session?.user.workspaceId}-pending`)
    revalidateTag(`${WORKSPACE_INVITES_PREFIX}${session?.user.workspaceId}-failed`)

    return {
      success: true,
      data: data.invite,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "Error canceling workspace invite.",
    }
  }
}
