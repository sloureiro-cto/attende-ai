"use client"

import { useVirtualizer } from "@tanstack/react-virtual"
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { VIRTUALIZE_AFTER } from "lib/attende/funnel/model"

export const ROW_HEIGHT = 60

type Props<T> = {
  rows: T[]
  rowKey: (row: T) => string
  /** One `<tr>`; `index` is set when the table is windowed (used by the virtualizer to measure). */
  renderRow: (row: T, index: number) => ReactNode
  header: ReactNode
  ariaLabel: string
  minWidth?: number
  hasMore: boolean
  loadingMore: boolean
  busy: boolean
  onLoadMore: () => void
  /** Put the box back at this scroll position once (coming back to the funnel); `onRestored` fires after. */
  restoreScrollTop?: number | null
  onRestored?: () => void
  /** Where the box is scrolled now (remembered for the way back). */
  onScrollTop?: (top: number) => void
}

/**
 * Table in its own scroll box: sticky header, horizontal scroll on small screens, windowed rendering once more than
 * `VIRTUALIZE_AFTER` rows are loaded (spacer rows keep the native table layout), and the next page requested when the
 * bottom comes into view. The caller keeps a "Load more" button as the keyboard / no-IntersectionObserver fallback.
 */
export function ScrollTable<T>({ rows, rowKey, renderRow, header, ariaLabel, minWidth = 720, hasMore, loadingMore, busy, onLoadMore, restoreScrollTop, onRestored, onScrollTop }: Props<T>) {
  const scroller = useRef<HTMLDivElement | null>(null)
  const sentinel = useRef<HTMLDivElement | null>(null)
  const virtual = rows.length > VIRTUALIZE_AFTER
  const virtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (i) => (rows[i] ? rowKey(rows[i] as T) : i),
    overscan: 12,
  })

  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore || loadingMore || busy || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onLoadMore(), { root: scroller.current, rootMargin: "320px" })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, busy, onLoadMore, rows.length])

  const restoredRef = useRef(onRestored)
  restoredRef.current = onRestored
  useLayoutEffect(() => {
    const node = scroller.current
    if (restoreScrollTop == null || !node) return
    node.scrollTop = restoreScrollTop
    restoredRef.current?.()
  }, [restoreScrollTop])

  const items = virtual ? virtualizer.getVirtualItems() : []
  const first = items[0]
  const last = items[items.length - 1]
  const padTop = first ? first.start : 0
  const padBottom = last ? virtualizer.getTotalSize() - last.end : 0

  return (
    <div
      ref={scroller}
      // The page bar stays on top (PageLayout); the table scrolls in its own box under it so the header row stays put.
      className={cn("max-h-[calc(100dvh-300px)] min-h-[320px] overflow-auto rounded-xl border border-neutral-50 bg-white shadow-sm transition-opacity", busy && "opacity-60")}
      aria-busy={busy}
      onScroll={onScrollTop ? (e) => onScrollTop(e.currentTarget.scrollTop) : undefined}
    >
      <table className="w-full border-separate border-spacing-0" style={{ minWidth }} aria-label={ariaLabel}>
        <thead className="sticky top-0 z-10">{header}</thead>
        <tbody>
          {virtual ? (
            <>
              {padTop > 0 && <tr aria-hidden style={{ height: padTop }} />}
              {items.map((item) => {
                const row = rows[item.index]
                return row === undefined ? null : renderRow(row, item.index)
              })}
              {padBottom > 0 && <tr aria-hidden style={{ height: padBottom }} />}
            </>
          ) : (
            rows.map((row, i) => renderRow(row, i))
          )}
        </tbody>
      </table>
      <div ref={sentinel} aria-hidden className="h-px" />
    </div>
  )
}

export const TH_CLASS = "h-11 whitespace-nowrap border-b border-neutral-50 bg-neutral-10 px-4 text-left align-middle text-body-12 font-semibold text-neutral-700 first:pl-5 last:pr-5"
export const TD_CLASS = "border-b border-neutral-50 px-4 py-3 align-middle text-body-14 leading-5 text-neutral-700 first:pl-5 last:pr-5"
export const STICKY_TD_CLASS = "sticky left-0 z-[1] bg-white group-hover:bg-neutral-10 group-aria-selected:bg-primary-clean"
