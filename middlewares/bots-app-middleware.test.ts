/** @jest-environment node */
const mockGetToken = jest.fn()
jest.mock("next-auth/jwt", () => ({ getToken: (...a: unknown[]) => mockGetToken(...a) }))

import { NextRequest } from "next/server"
import { BOTS_SESSION_COOKIE } from "lib/auth/botsAuthCookies"
import { classifyBotsAppPath, handleBotsAppRequest } from "./bots-app-middleware"

const req = (path: string, init: { method?: string; host?: string } = {}) =>
  new NextRequest(`https://bots.jsynq.com${path}`, { method: init.method ?? "GET", headers: { host: init.host ?? "bots.jsynq.com" } })

beforeEach(() => {
  jest.clearAllMocks()
  mockGetToken.mockResolvedValue({ id: "u1" })
})

describe("classifyBotsAppPath", () => {
  it.each(["/", "/login", "/robots.txt", "/api/auth/session", "/api/auth/callback/google", "/_next/static/x.js", "/bots-assets/logo", "/favicon.ico", "/api/health", "/whatsapp-connect/header-bg.webp"])(
    "public: %s",
    (p) => expect(classifyBotsAppPath(p)).toBe("public")
  )

  it.each(["/workspaces", "/bots", "/bots/new", "/bots/abc/stats", "/lines", "/lines/whatsapp", "/me", "/not-entitled", "/start", "/inbox", "/inbox/abc", "/funnel", "/ai-agents", "/ai-agents/new", "/ai-agents/abc/knowledge", "/reports", "/team", "/billing", "/billing/plans", "/settings", "/setup", "/setup/step-2"])("protected: %s", (p) =>
    expect(classifyBotsAppPath(p)).toBe("protected")
  )

  it.each(["/signup", "/signup/verify", "/pricing", "/pricing/faq"])("public (marketing/signup): %s", (p) =>
    expect(classifyBotsAppPath(p)).toBe("public")
  )

  it.each([
    "/settings/workspace",
    "/settings/workspace/messages/whatsapp",
    "/settings/account",
    "/signups",
    "/pricing-admin",
    "/teamwork",
    "/inboxes",
    "/funnels",
    "/starter",
    "/reports-old",
  ])("stays blocked (JSYNQ screens / look-alikes): %s", (p) => expect(classifyBotsAppPath(p)).toBe("blocked"))

  it.each([
    "/home",
    "/messages",
    "/settings/workspace/messages/whatsapp",
    "/automation-studio/bots/new",
    "/projects/abc",
    "/agent-chat",
    "/api/whatsapp-templates",
    "/api/workspaces",
    "/botsx",
    "/bots-evil",
    "/workspacesx",
    "/linesx",
    "/account",
    "/account/billing",
    "/account-admin",
    "/login/extra",
    "/_nextevil",
    "/healthz/x",
  ])("blocked: %s", (p) => expect(classifyBotsAppPath(p)).toBe("blocked"))
})

describe("handleBotsAppRequest", () => {
  it("404s everything outside the allow-list and marks it noindex", async () => {
    const res = await handleBotsAppRequest(req("/messages"))
    expect(res.status).toBe(404)
    expect(res.headers.get("x-middleware-rewrite")).toContain("/_bots-not-found")
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow")
    expect(mockGetToken).not.toHaveBeenCalled()
  })

  it("serves a disallow-all robots.txt", async () => {
    const res = await handleBotsAppRequest(req("/robots.txt"))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("User-agent: *\nDisallow: /\n")
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow")
  })

  it("lets public pages through without looking at the session", async () => {
    for (const p of ["/", "/login", "/api/auth/session"]) {
      const res = await handleBotsAppRequest(req(p))
      expect(res.status).toBe(200)
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow")
    }
    expect(mockGetToken).not.toHaveBeenCalled()
  })

  it("reads the bots cookie (same name and salt) for protected pages", async () => {
    await handleBotsAppRequest(req("/bots"))
    expect(mockGetToken).toHaveBeenCalledWith(expect.objectContaining({ cookieName: BOTS_SESSION_COOKIE, salt: BOTS_SESSION_COOKIE }))
  })

  it("passes a signed-in user through and forwards pathname, search and mode to server components", async () => {
    const res = await handleBotsAppRequest(req("/bots/abc?tab=stats"))
    expect(res.status).toBe(200)
    expect(res.headers.get("x-middleware-override-headers")).toContain("x-pathname")
    expect(res.headers.get("x-middleware-request-x-pathname")).toBe("/bots/abc")
    expect(res.headers.get("x-middleware-request-x-search")).toBe("?tab=stats")
    expect(res.headers.get("x-middleware-request-x-app-mode")).toBe("bots")
  })

  it("redirects an anonymous user to /login with a safe callbackUrl", async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await handleBotsAppRequest(req("/bots/abc?tab=stats"))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location") as string)
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("callbackUrl")).toBe("/bots/abc?tab=stats")
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow")
  })

  it("answers 401 (not a redirect) to an anonymous server-action POST", async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await handleBotsAppRequest(req("/bots/abc", { method: "POST" }))
    expect(res.status).toBe(401)
  })

  it("treats a token without an id as anonymous", async () => {
    mockGetToken.mockResolvedValue({})
    const res = await handleBotsAppRequest(req("/lines"))
    expect(res.status).toBe(307)
  })
})

describe("handleBotsAppRequest: product and marketing routes", () => {
  it.each(["/pricing", "/signup", "/signup/verify"])("serves %s without a session (no token lookup)", async (p) => {
    mockGetToken.mockResolvedValue(null)
    const res = await handleBotsAppRequest(req(p))
    expect(res.status).toBe(200)
    expect(mockGetToken).not.toHaveBeenCalled()
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow")
  })

  it.each(["/team", "/inbox", "/funnel", "/ai-agents/new", "/reports", "/billing", "/start", "/settings", "/setup"])(
    "sends an anonymous visitor of %s to /login with the page as callback",
    async (p) => {
      mockGetToken.mockResolvedValue(null)
      const res = await handleBotsAppRequest(req(p))
      expect(res.status).toBe(307)
      const location = new URL(res.headers.get("location") ?? "")
      expect(location.pathname).toBe("/login")
      expect(location.searchParams.get("callbackUrl")).toBe(p)
    }
  )

  it("lets a signed-in user through to /team", async () => {
    const res = await handleBotsAppRequest(req("/team"))
    expect(res.status).toBe(200)
    expect(mockGetToken).toHaveBeenCalledWith(expect.objectContaining({ cookieName: BOTS_SESSION_COOKIE }))
  })

  it("keeps JSYNQ's own settings screens a 404 even though /settings itself is allowed", async () => {
    const res = await handleBotsAppRequest(req("/settings/workspace/messages/whatsapp"))
    expect(res.status).toBe(404)
    expect(mockGetToken).not.toHaveBeenCalled()
  })
})

describe("handleBotsAppRequest: Attende API routes", () => {
  it.each([
    "/api/attende/entitlements",
    "/api/attende/signup",
    "/api/attende/signup/plans",
    "/api/attende/agents/abc/knowledge/doc1",
    "/api/attende/billing/portal",
    "/api/messaging-automations/advanced",
    "/api/messaging-automations/advanced/abc/stats/series",
    "/api/stripe/webhook",
    "/api/jsynq/webhooks",
    "/api/jsynq/inbound",
    "/api/cron/billing-reconcile",
    "/api/cron/agent-sweeper",
  ])("api: %s", (p) => expect(classifyBotsAppPath(p)).toBe("api"))

  it.each(["/api/attendex", "/api/messaging-automations", "/api/messaging-automations/basic", "/api/stripe", "/api/stripe/webhooks", "/api/jsynq", "/api/jsynq/other", "/api/cronjobs"])(
    "look-alikes stay blocked: %s",
    (p) => expect(classifyBotsAppPath(p)).toBe("blocked")
  )

  it("lets a webhook POST through without a session and without reading the cookie", async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await handleBotsAppRequest(req("/api/stripe/webhook", { method: "POST" }))
    expect(res.status).toBe(200)
    expect(res.headers.get("x-middleware-rewrite")).toBeNull()
    expect(mockGetToken).not.toHaveBeenCalled()
  })
})
