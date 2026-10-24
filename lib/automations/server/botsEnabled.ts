import { notFound } from "next/navigation"
import { cache } from "react"
import { auth } from "auth"
import { fetchBotsEntitlement } from "./botsEntitlement"

/**
 * Server-side read of the workspace's Attende-ai entitlement (`GET /attende/entitlements`), memoized per request.
 * No session means "off"; an unreachable backend means "on" (its own gate refuses the calls with a clear code).
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
