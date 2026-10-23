import { auth } from "auth"
import { pickWorkspaceOwner } from "lib/pickWorkspaceOwner"

export { pickWorkspaceOwner }

export async function resolveSessionWorkspaceOwner(explicit?: string | null): Promise<string | undefined> {
  const session = explicit?.trim() ? null : await auth()
  return pickWorkspaceOwner(explicit, session?.user?.workspaceId)
}
