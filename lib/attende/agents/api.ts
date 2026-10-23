import { auth } from "auth"
import type { AgentActionResult, AgentErrorDetails } from "./types"

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  /** JSON body. */
  body?: unknown
  /** Multipart body (uploads). The content type (with its boundary) is set by fetch. */
  form?: FormData
  timeoutMs?: number
}

const baseUrl = () => process.env.BACKEND_URL

/** Backend error envelope: `{ message, details: { code, ...extras } }` (docs/attende/agents.md). */
function parseError(status: number, payload: unknown): AgentActionResult<never> {
  const body = (payload && typeof payload === "object" ? payload : {}) as { message?: unknown; details?: unknown }
  const details = (body.details && typeof body.details === "object" ? body.details : {}) as AgentErrorDetails & { code?: unknown }
  const { code, ...rest } = details as AgentErrorDetails & { code?: unknown }
  return {
    success: false,
    status,
    code: typeof code === "string" ? code : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    details: Object.keys(rest).length > 0 ? (rest as AgentErrorDetails) : undefined,
  }
}

/**
 * Calls `/api/attende/agents*` with the signed-in user's token. The shared `FetchClient` keeps only the error message,
 * but this feature branches on the stable `details.code`, so it has its own thin client. Never throws.
 */
export async function agentsFetch<T>(path: string, options: Options = {}): Promise<AgentActionResult<T>> {
  const base = baseUrl()
  if (!base) return { success: false, status: 500, message: "BACKEND_URL is not configured" }
  const session = await auth()
  if (!session?.apiToken) return { success: false, status: 401, code: "AUTH_REQUIRED" }

  const headers: Record<string, string> = { Authorization: `Bearer ${session.apiToken}` }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"

  let response: Response
  try {
    response = await fetch(`${base}/attende/agents${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
      cache: "no-store",
    })
  } catch {
    return { success: false, status: 0, message: "network" }
  }

  let payload: unknown = null
  try {
    payload = response.status === 204 ? null : await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) return parseError(response.status, payload)
  const data = payload && typeof payload === "object" && "data" in (payload as object) ? (payload as { data: T }).data : (payload as T)
  return { success: true, data }
}
