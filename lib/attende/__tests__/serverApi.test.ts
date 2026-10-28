/**
 * @jest-environment node
 */
import { apiRequest, attendeGet, attendePost, jsynqGet, toApiError } from "../serverApi"

const mockAuth = jest.fn()
jest.mock("auth", () => ({ auth: () => mockAuth() }))
const mockLocal = jest.fn()
jest.mock("server/local", () => ({ attendeLocalFetch: (...a: unknown[]) => mockLocal(...a) }))

const fetchMock = jest.fn()
const ENV = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = fetchMock as unknown as typeof fetch
  process.env = { ...ENV, BACKEND_URL: "http://jsynq.test/api" }
  mockAuth.mockResolvedValue({ apiToken: "tok" })
})
afterAll(() => {
  process.env = ENV
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

describe("serverApi", () => {
  it("calls the Attende API in process with the user's token and unwraps { data }", async () => {
    mockLocal.mockResolvedValue(json(200, { success: true, data: { url: "https://x" } }))
    const res = await attendeGet<{ url: string }>("/attende/entitlements", { a: 1, b: undefined, c: ["x", "y"] })
    expect(res).toEqual({ success: true, data: { url: "https://x" } })
    const [path, init] = mockLocal.mock.calls[0]
    expect(path).toBe("/attende/entitlements?a=1&c=x%2Cy")
    expect(init.headers).toEqual({ Authorization: "Bearer tok" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("calls JSYNQ for the generic endpoints", async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, data: { projects: [] } }))
    await jsynqGet("/projects")
    expect(fetchMock.mock.calls[0][0]).toBe("http://jsynq.test/api/projects")
  })

  it("keeps the backend code from `reference` or from `details.code`", async () => {
    mockLocal.mockResolvedValueOnce(
      json(503, { error: true, code: 503, message: "JSYNQ is unavailable", reference: "JSYNQ_UNAVAILABLE" })
    )
    expect(await attendeGet("/attende/agents")).toMatchObject({
      success: false,
      status: 503,
      reference: "JSYNQ_UNAVAILABLE",
    })
    expect(toApiError(402, { message: "x", details: { code: "ATTENDE_TRIAL_EXPIRED", limit: 3 } })).toEqual({
      success: false,
      status: 402,
      reference: "ATTENDE_TRIAL_EXPIRED",
      message: "x",
      details: { code: "ATTENDE_TRIAL_EXPIRED", limit: 3 },
    })
  })

  it("runs POSTs in process through this app's route handlers, never over HTTP", async () => {
    process.env.ATTENDE_API_URL = "http://old-backend.test/api"
    mockLocal.mockResolvedValue(json(200, { success: true, data: { ok: 1 } }))
    expect(await attendePost("/attende/billing/portal", { kind: "manage" })).toEqual({ success: true, data: { ok: 1 } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockLocal).toHaveBeenCalledWith("/attende/billing/portal", {
      method: "POST",
      headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "manage" }),
    })
    mockLocal.mockResolvedValue(json(402, { error: true, code: 402, message: "x", reference: "ATTENDE_TRIAL_EXPIRED" }))
    expect(await attendeGet("/attende/agents", { page: 2 })).toMatchObject({ success: false, status: 402, reference: "ATTENDE_TRIAL_EXPIRED" })
    expect(mockLocal.mock.calls[1][0]).toBe("/attende/agents?page=2")
  })

  it("never throws: no env, no session and network failures become results", async () => {
    delete process.env.BACKEND_URL
    expect(await apiRequest("jsynq", "GET", "/x")).toMatchObject({
      success: false,
      status: 500,
      message: "BACKEND_URL is not configured",
    })
    mockAuth.mockResolvedValueOnce(null)
    expect(await apiRequest("attende", "GET", "/x")).toMatchObject({
      success: false,
      status: 401,
      reference: "AUTH_REQUIRED",
    })
    mockLocal.mockRejectedValueOnce(new Error("down"))
    expect(await apiRequest("attende", "GET", "/x")).toMatchObject({ success: false, status: 0 })
    fetchMock.mockRejectedValueOnce(new Error("down"))
    process.env.BACKEND_URL = "http://jsynq.test/api"
    expect(await apiRequest("jsynq", "GET", "/x")).toMatchObject({ success: false, status: 0 })
  })
})
