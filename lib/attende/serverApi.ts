import { auth } from "auth"
import type { AttendeActionError, AttendeActionResult } from "./result"

/**
 * Server-side clients for the two APIs this app calls with the signed-in user's token (`session.apiToken`, as Bearer):
 * - `attende*`: the Attende API: signup, entitlements, billing portal, agents, advanced automations. It is served by this
 *   app (`app/api/attende/*`, `app/api/messaging-automations/advanced*`, code in `server/`) and called in process; set
 *   `ATTENDE_API_URL` only to call another deployment over HTTP instead;
 * - `jsynq*`: generic JSYNQ endpoints (`BACKEND_URL`): the CRM board table (funnel) and conversation analytics (reports).
 * Both answer errors as `{error, code, message, reference?, details?}`. These helpers never throw.
 */

export type ApiTarget = "attende" | "jsynq"
export type Query = Record<string, string | number | boolean | undefined | null | Array<string | number>>

const READ_TIMEOUT_MS = 30_000
const ENV_NAME: Record<ApiTarget, string> = { attende: "ATTENDE_API_URL", jsynq: "BACKEND_URL" }

/** Base URL of an API (it includes `/api`), without a trailing slash. `undefined` when the env is not set. */
export function apiBaseUrl(target: ApiTarget): string | undefined {
  const raw = target === "attende" ? process.env.ATTENDE_API_URL : process.env.BACKEND_URL
  const base = raw?.trim().replace(/\/+$/, "")
  return base || undefined
}

export const missingBaseMessage = (target: ApiTarget) => `${ENV_NAME[target]} is not configured`

export function buildQuery(query?: Query): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","))
    } else {
      params.set(key, String(value))
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ""
}

/** `Bearer <apiToken>` of the signed-in user, or null without a session. */
export async function userBearer(): Promise<string | null> {
  const session = await auth()
  return session?.apiToken ? `Bearer ${session.apiToken}` : null
}

/** The APIs wrap JSON in `{ success, data }`; plain bodies pass through. */
export const unwrapData = <T>(body: unknown): T =>
  body && typeof body === "object" && "data" in body ? (body as { data: T }).data : (body as T)

/**
 * Error body -> result. The stable code is `reference`; agent-style errors also carry it in `details.code`, so either is
 * read. The UI branches on the code, never on the message.
 */
export function toApiError(status: number, payload: unknown): AttendeActionError {
  const body = (payload && typeof payload === "object" ? payload : {}) as {
    message?: unknown
    reference?: unknown
    details?: unknown
  }
  const details =
    body.details && typeof body.details === "object" && !Array.isArray(body.details)
      ? (body.details as Record<string, unknown>)
      : undefined
  const reference =
    typeof body.reference === "string" ? body.reference : typeof details?.code === "string" ? details.code : undefined
  return {
    success: false,
    status,
    reference,
    message: typeof body.message === "string" ? body.message : undefined,
    ...(details ? { details } : {}),
  }
}

async function toResult<T>(response: Response): Promise<AttendeActionResult<T>> {
  let payload: unknown = null
  try {
    payload = response.status === 204 ? null : await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) return toApiError(response.status, payload)
  return { success: true, data: unwrapData<T>(payload) }
}

export type AttendeCallInit = {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit
  timeoutMs?: number
}

/**
 * One call to the Attende API, `path` relative to its `/api` (e.g. `/attende/entitlements`). With `ATTENDE_API_URL` set it
 * is a fetch to that base; otherwise the request runs in process through this app's own route handlers (same handler,
 * same status and body, no HTTP round trip to itself). Like fetch, it throws only on network errors.
 */
export async function callAttende(path: string, init: AttendeCallInit = {}): Promise<Response> {
  const base = apiBaseUrl("attende")
  if (base) {
    return fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: init.headers,
      body: init.body,
      signal: AbortSignal.timeout(init.timeoutMs ?? READ_TIMEOUT_MS),
      cache: "no-store",
    })
  }
  const { attendeLocalFetch } = await import("server/local")
  return attendeLocalFetch(path, { method: init.method, headers: init.headers, body: init.body })
}

export type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE"
export type RequestOptions = { query?: Query; body?: unknown; timeoutMs?: number }

/** One JSON request with the user's token. Network problems come back as `status: 0`, a missing session as 401. */
export async function apiRequest<T>(
  target: ApiTarget,
  method: ApiMethod,
  path: string,
  options: RequestOptions = {}
): Promise<AttendeActionResult<T>> {
  const base = target === "jsynq" ? apiBaseUrl(target) : undefined
  if (target === "jsynq" && !base) return { success: false, status: 500, message: missingBaseMessage(target) }
  const authorization = await userBearer()
  if (!authorization) return { success: false, status: 401, reference: "AUTH_REQUIRED" }
  const headers: Record<string, string> = { Authorization: authorization }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  const body = options.body === undefined ? undefined : JSON.stringify(options.body)
  const url = `${path}${buildQuery(options.query)}`
  try {
    const response =
      target === "attende"
        ? await callAttende(url, { method, headers, body, timeoutMs: options.timeoutMs })
        : await fetch(`${base}${url}`, {
            method,
            headers,
            body,
            signal: AbortSignal.timeout(options.timeoutMs ?? READ_TIMEOUT_MS),
            cache: "no-store",
          })
    return await toResult<T>(response)
  } catch {
    return { success: false, status: 0, message: "network" }
  }
}

// --- Attende API (in process, or ATTENDE_API_URL) -----------------------------------------------------------
export const attendeGet = <T>(path: string, query?: Query) => apiRequest<T>("attende", "GET", path, { query })
export const attendePost = <T>(path: string, body: unknown = {}, timeoutMs?: number) =>
  apiRequest<T>("attende", "POST", path, { body, timeoutMs })

// --- JSYNQ generic endpoints (BACKEND_URL) -----------------------------------------------------------
export const jsynqGet = <T>(path: string, query?: Query) => apiRequest<T>("jsynq", "GET", path, { query })
export const jsynqPatch = <T>(path: string, body: unknown) => apiRequest<T>("jsynq", "PATCH", path, { body })

/** Opens a streaming GET on JSYNQ with the user's token (CSV export, files). The caller pipes `response.body`; errors come back as `null`. */
export async function jsynqStream(path: string, query?: Query, signal?: AbortSignal): Promise<Response | null> {
  const base = apiBaseUrl("jsynq")
  const authorization = await userBearer()
  if (!base || !authorization) return null
  try {
    return await fetch(`${base}${path}${buildQuery(query)}`, {
      method: "GET",
      headers: { Authorization: authorization },
      signal,
      cache: "no-store",
    })
  } catch {
    return null
  }
}
