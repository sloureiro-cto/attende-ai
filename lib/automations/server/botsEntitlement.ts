import { attendeGet } from "lib/attende/serverApi"

/**
 * Access to the product comes from the Attende backend: `GET /attende/entitlements` answers `entitlements: null` for a
 * workspace without an Attende-ai plan. Any plan state (trial, active, past due, even expired) gets into the app: the
 * expired ones then see the plan gate, which the backend enforces on every call.
 *
 * - `true`: the workspace has an Attende-ai plan;
 * - `false`: it has none, or the user is not a member (401/403);
 * - `null`: the answer is unknown (backend down, `JSYNQ_UNAVAILABLE`...). Callers let the request through: the backend
 *   gate is the real enforcement and its own error is more useful than a "not enabled" page.
 */
export async function readAttendeEntitlement(): Promise<boolean | null> {
  const result = await attendeGet<{ entitlements?: unknown } | null>("/attende/entitlements")
  if (result.success) return !!result.data && typeof result.data === "object" && !!result.data.entitlements
  if (result.status === 401 || result.status === 403) return false
  return null
}

const TTL_MS = 30_000
const MAX_ENTRIES = 500
const cache = new Map<string, { value: boolean; expires: number }>()

/** Test seam. */
export function clearBotsEntitlementCache(): void {
  cache.clear()
}

/**
 * The entitlement for the session's user and workspace, read with the CALLER's token. Cached for a short time per
 * user+workspace (every server action runs the gate). An unknown answer is never cached and counts as allowed.
 */
export async function fetchBotsEntitlement(userId: string, workspaceId: string): Promise<boolean> {
  const key = `${userId}:${workspaceId}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value

  const value = await readAttendeEntitlement()
  if (value === null) return true

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
  cache.set(key, { value, expires: Date.now() + TTL_MS })
  return value
}
