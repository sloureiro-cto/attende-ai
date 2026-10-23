import { resolveSafeCallbackUrl } from "lib/auth/safeCallback"

/**
 * Callback allow-list for the bots app: the shared same-origin guard plus "never loop back into /login".
 * (The guard itself lives in lib/auth/safeCallback, shared with the middleware.)
 */
export function safeBotsCallback(raw: string | null | undefined, fallback: string): string {
  const resolved = resolveSafeCallbackUrl(raw, { fallback })
  if (resolved === "/login" || resolved.startsWith("/login?") || resolved.startsWith("/login/")) return fallback
  return resolved
}
