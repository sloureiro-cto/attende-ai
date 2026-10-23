/**
 * Where the user was in the funnel list, kept for the trip to a conversation (or anywhere else) and back.
 *
 * Filters, sort, search, tab, page size and the open deal already live in the URL. What the URL cannot hold is how
 * far the list was scrolled and how many pages were loaded: that goes to `sessionStorage` (this tab only) when the
 * funnel unmounts, and is read once when it mounts again with the same URL state. The rows themselves are never
 * cached: the pages are fetched again (fresh data), then the scroll position is put back.
 */
import { type FunnelTab, type FunnelUrlState, stateToSearchParams } from "./model"

export type ListSnapshot = { key: string; tab: FunnelTab; count: number; scrollTop: number; savedAt: number }

export const SNAPSHOT_STORAGE_KEY = "attende.funnel.position.v1"
/** Older than this, a position is not worth restoring (the list has moved on). */
export const SNAPSHOT_TTL_MS = 30 * 60_000
/** Never re-fetch more than this many rows just to put the scroll back. */
export const MAX_RESTORE_ROWS = 500

/** The list a position belongs to: everything in the URL but the open drawer. */
export const snapshotKey = (state: FunnelUrlState): string => stateToSearchParams({ ...state, deal: null }).toString()

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">

const session = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function saveSnapshot(snapshot: ListSnapshot, storage: Storage | null = session()): void {
  try {
    storage?.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Blocked storage: coming back starts at the top, nothing else changes.
  }
}

/** The saved position for this list (read once: it is removed), or `null` when it is missing, stale or for another list. */
export function takeSnapshot(key: string, now: number, storage: Storage | null = session()): ListSnapshot | null {
  let raw: string | null = null
  try {
    raw = storage?.getItem(SNAPSHOT_STORAGE_KEY) ?? null
    storage?.removeItem(SNAPSHOT_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as Partial<ListSnapshot>
    if (s.key !== key || (s.tab !== "deals" && s.tab !== "contacts")) return null
    if (typeof s.savedAt !== "number" || now - s.savedAt > SNAPSHOT_TTL_MS || s.savedAt > now + 60_000) return null
    const count = Number.isFinite(s.count) ? Math.max(0, Math.min(MAX_RESTORE_ROWS, Math.floor(s.count as number))) : 0
    const scrollTop = Number.isFinite(s.scrollTop) ? Math.max(0, s.scrollTop as number) : 0
    if (count === 0 && scrollTop === 0) return null
    return { key, tab: s.tab, count, scrollTop, savedAt: s.savedAt }
  } catch {
    return null
  }
}
