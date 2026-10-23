import { auth } from "auth"
import type { AttendeActionResult } from "./result"

type Query = Record<string, string | number | boolean | undefined | null | Array<string | number>>

const READ_TIMEOUT_MS = 30_000

const baseUrl = (): string | undefined => process.env.BACKEND_URL

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

async function authHeaders(): Promise<Record<string, string> | null> {
  const session = await auth()
  if (!session?.apiToken) return null
  return { Authorization: `Bearer ${session.apiToken}`, "Content-Type": "application/json" }
}

/** The platform wraps JSON in `{ success, data }`; plain bodies pass through. */
const unwrap = <T>(body: unknown): T => (body && typeof body === "object" && "data" in body ? (body as { data: T }).data : (body as T))

async function toResult<T>(response: Response): Promise<AttendeActionResult<T>> {
  let payload: unknown = null
  try {
    payload = response.status === 204 ? null : await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    const body = (payload && typeof payload === "object" ? payload : {}) as { message?: unknown; reference?: unknown }
    return {
      success: false,
      status: response.status,
      reference: typeof body.reference === "string" ? body.reference : undefined,
      message: typeof body.message === "string" ? body.message : undefined,
    }
  }
  return { success: true, data: unwrap<T>(payload) }
}

async function call<T>(method: "GET" | "PATCH", path: string, query?: Query, body?: unknown): Promise<AttendeActionResult<T>> {
  const base = baseUrl()
  if (!base) return { success: false, status: 500, message: "BACKEND_URL is not configured" }
  const headers = await authHeaders()
  if (!headers) return { success: false, status: 401, reference: "AUTH_REQUIRED" }
  try {
    const response = await fetch(`${base}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
      cache: "no-store",
    })
    return await toResult<T>(response)
  } catch {
    return { success: false, status: 0, message: "network" }
  }
}

export const attendeGet = <T>(path: string, query?: Query) => call<T>("GET", path, query)
export const attendePatch = <T>(path: string, body: unknown) => call<T>("PATCH", path, undefined, body)

/** Opens a streaming GET with the user's token (CSV export). The caller pipes `response.body`; errors come back as `null`. */
export async function attendeStream(path: string, query?: Query, signal?: AbortSignal): Promise<Response | null> {
  const base = baseUrl()
  const headers = await authHeaders()
  if (!base || !headers) return null
  try {
    return await fetch(`${base}${path}${buildQuery(query)}`, { method: "GET", headers: { Authorization: headers.Authorization ?? "" }, signal, cache: "no-store" })
  } catch {
    return null
  }
}
