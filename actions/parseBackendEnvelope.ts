/** Normalizes `{ success, data, meta }` vs raw API bodies from workspace-backend. */

export function pickData<T>(body: unknown): T | undefined {
  if (body == null) return undefined
  if (typeof body === "object" && "data" in body) {
    return (body as { data: T }).data
  }
  return body as T
}

export function pickMeta(body: unknown): { total?: number; limit?: number; offset?: number } {
  if (body && typeof body === "object" && "meta" in body) {
    const m = (body as { meta?: Record<string, unknown> }).meta
    if (m && typeof m === "object") {
      return {
        total: typeof m.total === "number" ? m.total : undefined,
        limit: typeof m.limit === "number" ? m.limit : undefined,
        offset: typeof m.offset === "number" ? m.offset : undefined,
      }
    }
  }
  return {}
}
