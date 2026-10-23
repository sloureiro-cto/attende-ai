import type { AttendeActionError, AttendeActionResult } from "lib/attende/result"
import { mergeById, shouldFollowUp } from "./model"

export type CursorPage<T> = { items: T[]; nextCursor: string | null; hasMore: boolean; partial?: boolean }

export type WalkResult<T> =
  | { ok: true; items: T[]; nextCursor: string | null; hasMore: boolean; partial: boolean }
  | { ok: false; items: T[]; error: AttendeActionError }

/**
 * Fetches the page after `cursor` and appends it without repeating rows. When the backend answers a `partial` page
 * that added nothing (its scan window ran out before finding matches) it asks again on its own, a bounded number of
 * times, so the user never sees an empty "load more" that did nothing. Returns `null` when the walk was superseded.
 */
export async function fetchNextPage<T>(
  fetchPage: (cursor: string | null) => Promise<AttendeActionResult<CursorPage<T>>>,
  existing: T[],
  cursor: string | null,
  key: (item: T) => string,
  isCurrent: () => boolean = () => true
): Promise<WalkResult<T> | null> {
  let items = existing
  let next = cursor
  let followUps = 0
  for (;;) {
    const res = await fetchPage(next)
    if (!isCurrent()) return null
    if (!res.success) return { ok: false, items, error: res }
    const page = res.data
    const merged = mergeById(items, page.items ?? [], key)
    const gained = merged.length - items.length
    items = merged
    next = page.nextCursor ?? null
    // `hasMore` mirrors `nextCursor`; without a cursor there is nothing more to ask for.
    const hasMore = !!page.hasMore && next !== null
    const partial = !!page.partial
    if (shouldFollowUp({ hasMore, partial }, gained, followUps)) {
      followUps += 1
      continue
    }
    return { ok: true, items, nextCursor: hasMore ? next : null, hasMore, partial }
  }
}
