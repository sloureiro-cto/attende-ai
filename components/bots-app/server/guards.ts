import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "auth"
import { BOTS_ROUTES } from "components/bots-app/brand"
import { isWorkspaceEntitled } from "components/bots-app/entitlement"
import { safeBotsCallback } from "components/bots-app/safeBotsCallback"
import type { IWorkspace } from "context/WorkspaceContext"
import { getCurrentWorkspace } from "./currentWorkspace"

/** The signed-in session, or a redirect to /login that remembers where the person was going (safe, relative only). */
export async function requireBotsSession() {
  const session = await auth()
  if (!session?.user) {
    const headersList = await headers()
    const path = `${headersList.get("x-pathname") ?? ""}${headersList.get("x-search") ?? ""}`
    const callback = safeBotsCallback(path, BOTS_ROUTES.bots)
    redirect(`${BOTS_ROUTES.login}?callbackUrl=${encodeURIComponent(callback)}`)
  }
  return session
}

/**
 * Pages that need bots: a session and a current workspace that is entitled. (The API gate is the real
 * enforcement; this keeps people from ever landing on a screen whose every request would be refused.)
 */
export async function requireEntitledWorkspace(): Promise<IWorkspace> {
  const session = await requireBotsSession()
  const workspace = await getCurrentWorkspace(session.user.workspaceId)
  if (!workspace) redirect(BOTS_ROUTES.workspaces)
  if (!isWorkspaceEntitled(workspace)) redirect(BOTS_ROUTES.notEntitled)
  return workspace
}
