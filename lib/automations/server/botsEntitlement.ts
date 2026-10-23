import { FetchClient } from "lib/api"
import type { WorkspaceEntitlements } from "../botsFlag"

/**
 * Standalone bots app: a workspace may use bots when the backend says so (`workspace.entitlements.bots`,
 * set by us per customer). Anything but a literal `true` is "no": missing field, wrong type, errors.
 */
export function readBotsEntitlement(workspace: unknown): boolean {
  const entitlements = (workspace as { entitlements?: WorkspaceEntitlements } | null | undefined)?.entitlements
  return entitlements?.bots === true
}

const TTL_MS = 30_000
const MAX_ENTRIES = 500
const cache = new Map<string, { value: boolean; expires: number }>()

/** Test seam. */
export function clearBotsEntitlementCache(): void {
  cache.clear()
}

/**
 * Reads the entitlement with the CALLER's token (so a non-member gets a 403 and therefore `false`).
 * Cached for a short time per user+workspace: every server action runs the gate, and the answer
 * changes only when we flip the flag for a customer.
 */
export async function fetchBotsEntitlement(userId: string, workspaceId: string): Promise<boolean> {
  const key = `${userId}:${workspaceId}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value

  const data = await FetchClient.get<{ workspace?: unknown }>(`${process.env.BACKEND_URL}/workspaces/${encodeURIComponent(workspaceId)}`)
  const value = readBotsEntitlement(data?.workspace)

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
  cache.set(key, { value, expires: Date.now() + TTL_MS })
  return value
}
