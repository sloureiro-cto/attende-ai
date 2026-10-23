import { IUser } from "app/_types/User"

/**
 * Accepts owner shapes from workspace/document API (string id, populated user, ObjectId)
 * without pulling in server-only deps.
 */
export function resolveWorkspaceOwnerId(owner: unknown): string | null {
  if (!owner) return null
  if (typeof owner === "string") return owner
  if (typeof owner === "object") {
    const maybeUser = owner as IUser & { _id?: unknown; toString?: () => string }
    if ("_id" in maybeUser && maybeUser._id != null && maybeUser._id !== "") {
      const fromUnderscore = String(maybeUser._id)
      if (fromUnderscore && fromUnderscore !== "[object Object]") return fromUnderscore
    }
    const maybeId = (maybeUser as { id?: unknown }).id
    if (maybeId != null && maybeId !== "") {
      const fromId = String(maybeId)
      if (fromId && fromId !== "[object Object]") return fromId
    }
    if (typeof maybeUser.toString === "function") {
      const id = maybeUser.toString()
      if (id && id !== "[object Object]" && /^[a-f\d]{24}$/i.test(id)) return id
    }
  }
  return null
}
