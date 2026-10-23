import { notFound } from "next/navigation"
import { cache } from "react"
import { auth } from "auth"
import { fetchBotsEntitlement } from "./botsEntitlement"

/**
 * Server-side read of the `bots` entitlement, memoized per request: the workspace's `entitlements.bots`
 * from the backend. Fails closed: any error (backend down, no session) means "off".
 */
export const isBotsEnabled = cache(async (): Promise<boolean> => {
  try {
    const session = await auth()
    if (!session?.user?.id) return false
    const workspaceId = session.user.workspaceId
    return workspaceId ? await fetchBotsEntitlement(session.user.id, workspaceId) : false
  } catch (error) {
    console.error("bots_flag_check_failed", error instanceof Error ? error.message : error)
    return false
  }
})

/** 404 unless the `bots` gate is on. For pages and layouts of the new surfaces. */
export async function requireBotsEnabled(): Promise<void> {
  if (!(await isBotsEnabled())) notFound()
}
