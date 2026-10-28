import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { BOTS_SESSION_COOKIE } from "lib/auth/botsAuthCookies"
import { resolveSafeCallbackUrl } from "lib/auth/safeCallback"

/**
 * Request handling of the app (run by middleware.ts).
 *
 * Allow-list model: only the routes below exist. Every other path (/api/*, ...) is a 404.
 */

export const BOTS_NOINDEX = "noindex, nofollow"
const NOT_FOUND_REWRITE = "/_bots-not-found"

const PUBLIC_EXACT = new Set(["/", "/login", "/robots.txt", "/healthz", "/health", "/ping", "/api/health", "/api/healthz"])
/** No session needed (auth endpoints, framework assets, brand assets). */
/** `/whatsapp-connect`: static art of the (reused) WhatsApp connect modal. */
const PUBLIC_PREFIXES = ["/api/auth", "/_next", "/bots-assets", "/favicon", "/whatsapp-connect", "/signup", "/pricing"]
/**
 * The Attende API (route handlers in app/api, code in server/). No session cookie check here: each route
 * authenticates itself (user JWT as Bearer, Stripe/JSYNQ signature, or CRON_SECRET) and answers JSON errors.
 */
const API_PREFIXES = ["/api/attende", "/api/messaging-automations/advanced", "/api/cron"]
const API_EXACT = new Set(["/api/stripe/webhook", "/api/jsynq/webhooks", "/api/jsynq/inbound"])
/** The product. A session is required. */
const PROTECTED_PREFIXES = [
  "/workspaces",
  "/bots",
  "/lines",
  "/me",
  "/not-entitled",
  "/start",
  "/inbox",
  "/funnel",
  "/ai-agents",
  "/reports",
  "/team",
  "/billing",
  "/setup",
]
/**
 * Protected for the exact path only. JSYNQ's own settings screens live under `/settings/...` in this same codebase,
 * so a prefix here would expose them: sub-pages of the product's settings must be added explicitly, one by one.
 */
const PROTECTED_EXACT = new Set(["/settings"])

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`) || (prefix === "/favicon" && pathname.startsWith("/favicon"))

export type BotsRouteKind = "public" | "protected" | "api" | "blocked"

export function classifyBotsAppPath(pathname: string): BotsRouteKind {
  if (API_EXACT.has(pathname) || API_PREFIXES.some((p) => matchesPrefix(pathname, p))) return "api"
  if (PUBLIC_EXACT.has(pathname)) return "public"
  if (PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p))) return "public"
  if (PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p))) return "protected"
  if (PROTECTED_EXACT.has(pathname)) return "protected"
  return "blocked"
}

function withNoIndex<T extends NextResponse>(response: T): T {
  response.headers.set("X-Robots-Tag", BOTS_NOINDEX)
  return response
}

export async function handleBotsAppRequest(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl

  if (pathname === "/robots.txt") {
    return withNoIndex(
      new NextResponse("User-agent: *\nDisallow: /\n", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    )
  }

  const kind = classifyBotsAppPath(pathname)
  // Untouched: the route handler authenticates and answers (webhooks need the request exactly as sent).
  if (kind === "api") return withNoIndex(NextResponse.next())
  if (kind === "blocked") {
    const url = req.nextUrl.clone()
    url.pathname = NOT_FOUND_REWRITE
    url.search = ""
    return withNoIndex(NextResponse.rewrite(url, { status: 404 }))
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", pathname)
  requestHeaders.set("x-search", search)
  requestHeaders.set("x-app-mode", "bots")

  if (kind === "protected") {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV !== "development",
      cookieName: BOTS_SESSION_COOKIE,
      salt: BOTS_SESSION_COOKIE,
    })
    if (!token?.id) {
      // Server actions are POSTs to the page URL: answer 401 instead of redirecting a fetch.
      if (req.method !== "GET" && req.method !== "HEAD") return withNoIndex(new NextResponse(null, { status: 401 }))
      const host = req.headers.get("host") ?? req.nextUrl.host
      const callback = resolveSafeCallbackUrl(`${pathname}${search}`, { host, fallback: "/bots" })
      const login = req.nextUrl.clone()
      login.pathname = "/login"
      login.search = `?callbackUrl=${encodeURIComponent(callback)}`
      return withNoIndex(NextResponse.redirect(login))
    }
  }

  return withNoIndex(NextResponse.next({ request: { headers: requestHeaders } }))
}
