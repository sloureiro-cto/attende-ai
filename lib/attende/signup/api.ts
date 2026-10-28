import { headers } from "next/headers"
import { auth } from "auth"
import { callAttende, toApiError } from "lib/attende/serverApi"

export type AttendeApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; reference?: string; message?: string }

type Options = {
  method?: "GET" | "POST"
  body?: unknown
  /** Send the signed-in user's apiToken. Public endpoints (signup, verify, plans) must leave this off. */
  session?: boolean
}

/**
 * Calls `/attende/*` on the Attende API (in process). The platform's shared `FetchClient` keeps only the error message, but the signup contract
 * branches on the stable `reference`, so this helper keeps it. It never throws: network problems become `status: 0`.
 *
 * Public calls forward the visitor's IP and country so the backend rate limits and picks the currency per visitor,
 * not per Next.js server.
 */
export async function attendeFetch<T>(path: string, options: Options = {}): Promise<AttendeApiResult<T>> {
  const requestHeaders: Record<string, string> = { "Content-Type": "application/json" }

  if (options.session) {
    const session = await auth()
    if (!session?.apiToken) return { ok: false, status: 401, reference: "AUTH_REQUIRED" }
    requestHeaders.Authorization = `Bearer ${session.apiToken}`
  }

  try {
    const incoming = await headers()
    const forwarded = incoming.get("x-forwarded-for")
    if (forwarded) requestHeaders["x-forwarded-for"] = forwarded
    const country = incoming.get("cf-ipcountry") ?? incoming.get("x-vercel-ip-country") ?? incoming.get("x-render-country")
    if (country) requestHeaders["cf-ipcountry"] = country
  } catch {
    // Not in a request scope (tests/build): no forwarding.
  }

  let response: Response
  try {
    response = await callAttende(path, {
      method: options.method ?? "GET",
      headers: requestHeaders,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    return { ok: false, status: 0, message: "network" }
  }

  let payload: unknown = null
  try {
    payload = response.status === 204 ? null : await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const error = toApiError(response.status, payload)
    return { ok: false, status: response.status, reference: error.reference, message: error.message }
  }
  return { ok: true, status: response.status, data: payload as T }
}
