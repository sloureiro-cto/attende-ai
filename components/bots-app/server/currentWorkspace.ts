import { cache } from "react"
import { getWorkspaceAction } from "@/actions/workspaces/getWorkspace"
import type { IWorkspace } from "context/WorkspaceContext"

/** Current workspace of the session. `cache()` dedupes the read between the root layout and the guards of one request. */
export const getCurrentWorkspace = cache(async (workspaceId: string | undefined | null): Promise<IWorkspace | null> => {
  if (!workspaceId) return null
  const result = await getWorkspaceAction({ id: workspaceId })
  return result.data ?? null
})
