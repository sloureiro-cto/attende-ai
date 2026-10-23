/**
 * Base URL for browser WebSocket connections (no trailing slash).
 * Prefer NEXT_PUBLIC_WEBSOCKET_SERVER; fallback: derive ws/wss from NEXT_PUBLIC_BACKEND_URL.
 */
export function getPublicWebSocketOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER?.trim()
  if (explicit) {
    return explicit.replace(/\/$/, "")
  }
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
  if (!backend) return null
  try {
    const u = new URL(backend)
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:"
    return `${wsProto}//${u.host}`
  } catch {
    return null
  }
}

/**
 * y-websocket base URL for pptx-react-viewer.
 * WebsocketProvider appends `/${roomId}`, so this must be `{origin}/yjs` with no trailing slash.
 */
export function buildPptxYjsServerUrl(): string | null {
  const origin = getPublicWebSocketOrigin()
  if (!origin) return null
  return `${origin}/yjs`
}

/** Backend WebSocketSyncServer listens on `/ws` (see workspace-backend server.ts). */
export function buildPublicWebSocketUrl(params: Record<string, string | undefined>): string | null {
  const origin = getPublicWebSocketOrigin()
  if (!origin) return null
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") qs.set(key, value)
  }
  const q = qs.toString()
  return q ? `${origin}/ws?${q}` : `${origin}/ws`
}
