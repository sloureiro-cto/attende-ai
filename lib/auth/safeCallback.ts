/**
 * Open-redirect guard for `callbackUrl`. Returns a same-origin RELATIVE path (path + search + hash)
 * or the fallback; never an absolute URL, so the result can be passed straight to a redirect.
 *
 * Accepted: relative paths ("/bots/abc?tab=stats") and absolute http(s) URLs whose host equals `host`.
 * Rejected: other hosts, userinfo (`https://app@evil.com`), protocol-relative ("//evil.com"), backslashes
 * (browsers treat "\" like "/"), control characters (tabs/newlines are stripped by URL parsers, turning
 * "/\t/evil.com" into "//evil.com"), and any non-http(s) scheme ("javascript:", "data:").
 */
const BASE = "http://callback-guard.invalid"
// eslint-disable-next-line no-control-regex
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

type Options = { host?: string | null; fallback?: string }

function normalizeHost(host: string | null | undefined): string | null {
  const value = host?.trim().toLowerCase()
  return value ? value : null
}

export function resolveSafeCallbackUrl(input: string | null | undefined, { host, fallback = "/" }: Options = {}): string {
  if (typeof input !== "string") return fallback
  const value = input.trim()
  if (!value || CONTROL_OR_BACKSLASH.test(value)) return fallback

  if (SCHEME.test(value)) {
    const allowedHost = normalizeHost(host)
    if (!allowedHost) return fallback
    let url: URL
    try {
      url = new URL(value)
    } catch {
      return fallback
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback
    if (url.username || url.password) return fallback
    if (url.host.toLowerCase() !== allowedHost) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  }

  if (!value.startsWith("/") || value.startsWith("//")) return fallback

  let url: URL
  try {
    url = new URL(value, BASE)
  } catch {
    return fallback
  }
  if (url.origin !== BASE) return fallback
  return `${url.pathname}${url.search}${url.hash}`
}

export function isSafeCallbackUrl(input: string | null | undefined, options: Options = {}): boolean {
  const resolved = resolveSafeCallbackUrl(input, { ...options, fallback: "\u0000" })
  return resolved !== "\u0000"
}
