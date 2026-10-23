/**
 * Normalizes API/Mongoose-style refs so Kanban/board code can compare ids reliably
 * (`string` hex vs `{ _id: string }` vs ObjectId-shaped `.toString()`).
 */
export function entityId(raw: unknown): string {
  if (raw == null || raw === "") return ""
  if (typeof raw === "string") return raw.trim()
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)

  if (typeof raw === "object") {
    const o = raw as { _id?: unknown; id?: unknown; toString?: () => string }
    if (o._id !== undefined && o._id !== null) return entityId(o._id)
    if (o.id !== undefined && o.id !== null) return entityId(o.id)
    try {
      if (typeof o.toString === "function") {
        const s = o.toString()
        if (s && s !== "[object Object]") return s.trim()
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const s = String(raw).trim()
    return s !== "[object Object]" ? s : ""
  } catch {
    return ""
  }
}

/** Optimistic client-side ids (e.g. create-card placeholder rows) — never send to the API. */
export function isOptimisticEntityId(id: unknown): boolean {
  return entityId(id).startsWith("temp-")
}

/** Normalized id safe for API calls; null when missing or optimistic. */
export function persistedEntityId(id: unknown): string | null {
  const normalized = entityId(id)
  if (!normalized || isOptimisticEntityId(normalized)) return null
  return normalized
}
