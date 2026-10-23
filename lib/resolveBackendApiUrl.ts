/**
 * Build an absolute API URL for browser-side fetches.
 * `NEXT_PUBLIC_BACKEND_URL` should include `/api` when the Express app mounts routes under `/api`
 * (e.g. `http://127.0.0.1:5004/api`). When only the origin is set, `/api` is inserted.
 */
export function resolveBackendApiUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
  if (!base) return null

  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const trimmedBase = base.replace(/\/+$/, "")

  if (trimmedBase.endsWith("/api")) {
    return `${trimmedBase}${normalizedPath}`
  }

  if (/\/api(\/|$)/.test(trimmedBase)) {
    return `${trimmedBase}${normalizedPath}`
  }

  return `${trimmedBase}/api${normalizedPath}`
}
