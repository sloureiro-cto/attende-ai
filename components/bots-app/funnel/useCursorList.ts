"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type CursorPage, fetchNextPage } from "lib/attende/funnel/paging"
import type { AttendeActionError, AttendeActionResult } from "lib/attende/result"

export type ListStatus = "idle" | "loading" | "ready" | "error"

export type ListState<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  /** The last page was cut short by the backend's scan budget (conversation filters): more may still match. */
  partial: boolean
  status: ListStatus
  /** First page failed (or a reload failed): nothing trustworthy to show. */
  error: AttendeActionError | null
  loadingMore: boolean
  /** "Load more" failed: the rows already loaded stay. */
  moreError: AttendeActionError | null
}

export type InitialList<T> = { page: CursorPage<T> | null; error: AttendeActionError | null } | null

const fromInitial = <T>(initial: InitialList<T>): ListState<T> => {
  const base: ListState<T> = { items: [], nextCursor: null, hasMore: false, partial: false, status: "idle", error: null, loadingMore: false, moreError: null }
  if (!initial) return base
  if (initial.error) return { ...base, status: "error", error: initial.error }
  if (!initial.page) return base
  const hasMore = !!initial.page.hasMore && !!initial.page.nextCursor
  return { ...base, status: "ready", items: initial.page.items, nextCursor: hasMore ? initial.page.nextCursor : null, hasMore, partial: !!initial.page.partial }
}

/**
 * A cursor-paginated list. `reload(query)` starts a new walk (filters changed: the cursor is dropped, as the contract
 * requires); `loadMore()` appends the next page. Answers of superseded walks are ignored, so a slow older response can
 * never overwrite a newer one. While a reload is in flight the previous rows stay on screen (dimmed by the caller).
 */
export function useCursorList<T, Q>(opts: {
  initial: InitialList<T>
  initialQuery: Q
  fetchPage: (query: Q, cursor: string | null) => Promise<AttendeActionResult<CursorPage<T>>>
  key: (item: T) => string
}) {
  const [state, setState] = useState<ListState<T>>(() => fromInitial(opts.initial))
  const stateRef = useRef(state)
  stateRef.current = state
  const query = useRef<Q>(opts.initialQuery)
  const seq = useRef(0)
  const mounted = useRef(true)
  const fetchRef = useRef(opts.fetchPage)
  fetchRef.current = opts.fetchPage
  const keyRef = useRef(opts.key)
  keyRef.current = opts.key

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const reload = useCallback(async (next?: Q) => {
    if (next !== undefined) query.current = next
    const mine = ++seq.current
    const q = query.current
    // Mark the list as loading right away (not only at the next render): a "load more" asked in the same tick
    // (infinite scroll, restoring a position) must not append a page of the previous query.
    stateRef.current = { ...stateRef.current, status: "loading", loadingMore: false }
    setState((s) => ({ ...s, status: "loading", loadingMore: false, moreError: null }))
    const res = await fetchNextPage((cursor) => fetchRef.current(q, cursor), [], null, keyRef.current, () => mounted.current && mine === seq.current)
    if (!res) return
    if (!res.ok) {
      setState((s) => ({ ...s, items: [], nextCursor: null, hasMore: false, partial: false, status: "error", error: res.error }))
      return
    }
    setState((s) => ({ ...s, items: res.items, nextCursor: res.nextCursor, hasMore: res.hasMore, partial: res.partial, status: "ready", error: null }))
  }, [])

  const loadMore = useCallback(async () => {
    const current = stateRef.current
    if (current.status !== "ready" || current.loadingMore || !current.hasMore) return
    const mine = seq.current
    const q = query.current
    stateRef.current = { ...current, loadingMore: true }
    setState((s) => ({ ...s, loadingMore: true, moreError: null }))
    const res = await fetchNextPage((cursor) => fetchRef.current(q, cursor), current.items, current.nextCursor, keyRef.current, () => mounted.current && mine === seq.current)
    if (!res) return
    if (!res.ok) {
      setState((s) => ({ ...s, loadingMore: false, moreError: res.error }))
      return
    }
    // Rows patched while this page was in flight (a stage move) win over the copy captured before the request.
    setState((s) => {
      const patched = new Map(s.items.map((item) => [keyRef.current(item), item]))
      return { ...s, items: res.items.map((item) => patched.get(keyRef.current(item)) ?? item), nextCursor: res.nextCursor, hasMore: res.hasMore, partial: res.partial, loadingMore: false }
    })
  }, [])

  /** Local edit of the loaded rows (optimistic updates). */
  const patch = useCallback((fn: (items: T[]) => T[]) => setState((s) => ({ ...s, items: fn(s.items) })), [])

  return { state, reload, loadMore, patch, query }
}
