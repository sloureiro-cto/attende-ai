import { auth } from "auth"
import { callAttende, toApiError } from "lib/attende/serverApi"
import type { AgentActionResult, AgentErrorDetails } from "./types"

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  /** JSON body. */
  body?: unknown
  /** Multipart body (uploads). The content type (with its boundary) is set by fetch. */
  form?: FormData
  timeoutMs?: number
}

/**
 * Error body `{ error, code, message, reference?, details: { code, ...extras } }`. The agent routes put the code in
 * `details.code`; service-level errors (plan gate, `JSYNQ_UNAVAILABLE`, `WORKSPACE_TOKEN_MISMATCH`) may only set `reference`.
 */
function parseError(status: number, payload: unknown): AgentActionResult<never> {
  const parsed = toApiError(status, payload)
  const { code: _code, ...rest } = (parsed.details ?? {}) as AgentErrorDetails & { code?: unknown }
  return {
    success: false,
    status,
    code: parsed.reference,
    message: parsed.message,
    details: Object.keys(rest).length > 0 ? (rest as AgentErrorDetails) : undefined,
  }
}

/**
 * Calls `/attende/agents*` on the Attende API (in process, or `ATTENDE_API_URL`) with the signed-in user's token. It supports
 * multipart uploads and keeps the agent error details, so it has its own thin client. Never throws.
 */
export async function agentsFetch<T>(path: string, options: Options = {}): Promise<AgentActionResult<T>> {
  const session = await auth()
  if (!session?.apiToken) return { success: false, status: 401, code: "AUTH_REQUIRED" }

  const headers: Record<string, string> = { Authorization: `Bearer ${session.apiToken}` }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"

  let response: Response
  try {
    response = await callAttende(`/attende/agents${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      timeoutMs: options.timeoutMs ?? 30_000,
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
