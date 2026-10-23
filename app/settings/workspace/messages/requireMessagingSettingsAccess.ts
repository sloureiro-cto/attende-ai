import { notFound } from "next/navigation"
import { cache } from "react"
import { PermissionsEnum } from "app/_types/Role"
import { getHasPermission } from "app/utils/checkUserPermission"
import { auth } from "auth"

/** Workspace of the session, without any permission check (cheap: reads the session only). */
export async function getMessagingSettingsWorkspaceId(): Promise<string> {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  if (!workspaceId) notFound()
  return workspaceId
}

/**
 * 404s unless the user may open messaging settings. Memoized per request: the layout and the page
 * both call it, and the page starts its data fetches without waiting for it.
 */
export const requireMessagingSettingsAccess = cache(async (): Promise<string> => {
  const workspaceId = await getMessagingSettingsWorkspaceId()
  const allowed = await getHasPermission(PermissionsEnum.WORKSPACE_MESSAGING_ACCESS, "workspace", workspaceId)
  if (!allowed) notFound()
  return workspaceId
})
