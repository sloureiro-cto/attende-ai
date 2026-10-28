"use server"

import { revalidateTag } from "next/cache"
import { ActionOutput } from "app/_types/Action"
import { auth } from "auth"
import { WORKSPACE_INVITES_PREFIX } from "constants/actions"
import { FetchClient, HttpError } from "lib/api"
import { attendePlanCheck } from "lib/attende/planGuard"

type SendWorkspaceInvitesInput = {
  invitees: { email: string; role: string }[]
  workspaceId: string
}

export async function sendWorkspaceInvitesAction({
  invitees,
  workspaceId,
}: SendWorkspaceInvitesInput): Promise<ActionOutput<boolean>> {
  // Attende plan (JSYNQ keeps no Attende limits): refuse before JSYNQ creates anything.
  const plan = await attendePlanCheck("seats", invitees.length)
  if (!plan.ok) return { success: false, error: plan.message }
  try {
    const session = await auth()

    await FetchClient.post<void, { invitees: { email: string; role: string }[] }>(
      `${process.env.BACKEND_URL}/invites/workspaces/${workspaceId}`,
      { invitees }
    )

    revalidateTag(`${WORKSPACE_INVITES_PREFIX}${session?.user.workspaceId}-pending`)

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
      error: "Error sending workspace invites.",
    }
  }
}
