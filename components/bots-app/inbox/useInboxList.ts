"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type InboxPage, loadInboxPageAction } from "lib/bots-app/inbox/actions"
import { DEFAULT_INBOX_FILTERS, type InboxFilters, type InboxItem, mergeInboxPage } from "lib/bots-app/inbox/model"

export type ListStatus = "ready" | "loading" | "error"

type Options = {
  initial: InboxPage | null
  initialFailed?: boolean
  initialFilters?: InboxFilters
  /** Test seam; defaults to the server action. */
  loadPage?: typeof loadInboxPageAction
  searchDebounceMs?: number
}

/**
 * The conversation list: filters, debounced search, cursor pagination and local patches for live events.
 * Stale responses are dropped with a request counter, so a slow page never overwrites a newer filter.
 */
export function useInboxList({ initial, initialFailed = false, initialFilters = DEFAULT_INBOX_FILTERS, loadPage = loadInboxPageAction, searchDebounceMs = 300 }: Options) {
  const [filters, setFilters] = useState<InboxFilters>(initialFilters)
  const [items, setItems] = useState<InboxItem[]>(initial?.items ?? [])
  const [cursor, setCursor] = useState<string | null>(initial?.nextCursor ?? null)
  const [hasMore, setHasMore] = useState(initial?.hasMore ?? false)
  const [status, setStatus] = useState<ListStatus>(initialFailed ? "error" : "ready")
  const [loadingMore, setLoadingMore] = useState(false)
  const seq = useRef(0)
  const filtersRef = useRef(filters)
  const first = useRef(true)

  const fetchFirst = useCallback(
    async (f: InboxFilters, silent = false) => {
      const mine = ++seq.current
      if (!silent) setStatus("loading")
      const res = await loadPage(f, null)
      if (mine !== seq.current) return
      if (!res.success) {
        if (!silent) setStatus("error")
        return
      }
      setItems(res.data.items)
      setCursor(res.data.nextCursor)
      setHasMore(res.data.hasMore)
      setStatus("ready")
    },
    [loadPage]
  )

  // Re-query when filters change (search is debounced; the initial render already has data).
  useEffect(() => {
    filtersRef.current = filters
    if (first.current) {
      first.current = false
      return
    }
    const timer = setTimeout(() => void fetchFirst(filters), searchDebounceMs)
    return () => clearTimeout(timer)
  }, [filters, fetchFirst, searchDebounceMs])

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || loadingMore || status === "loading") return
    const mine = seq.current
    setLoadingMore(true)
    const res = await loadPage(filtersRef.current, cursor)
    if (mine !== seq.current) {
      setLoadingMore(false)
      return
    }
    setLoadingMore(false)
    if (!res.success) return
    setItems((current) => mergeInboxPage(current, res.data.items))
    setCursor(res.data.nextCursor)
    setHasMore(res.data.hasMore)
  }, [cursor, hasMore, loadPage, loadingMore, status])

  const patch = useCallback((fn: (items: InboxItem[]) => InboxItem[]) => setItems((current) => fn(current)), [])
  const reload = useCallback((silent = false) => fetchFirst(filtersRef.current, silent), [fetchFirst])
  const updateFilters = useCallback((next: Partial<InboxFilters>) => setFilters((current) => ({ ...current, ...next })), [])
  const clearFilters = useCallback(() => setFilters(DEFAULT_INBOX_FILTERS), [])

  return { filters, items, status, hasMore, loadingMore, updateFilters, clearFilters, loadMore, reload, patch }
}
