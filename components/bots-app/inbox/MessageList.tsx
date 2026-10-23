"use client"

import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDown2 } from "iconsax-react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Button from "components/Button/Button"
import { formatDate } from "lib/attende/format"
import { dayKey, groupsWithPrevious, type ThreadMessage } from "lib/bots-app/inbox/model"
import { MessageBubble } from "./MessageBubble"
import type { AttendeInboxT } from "./useAttendeInboxT"

/** Above this many messages the list is windowed (only the visible rows are in the DOM). */
export const VIRTUALIZE_THRESHOLD = 200

type Row = { kind: "day"; key: string; iso: string } | { kind: "message"; key: string; message: ThreadMessage; grouped: boolean }

export function buildRows(messages: ThreadMessage[]): Row[] {
  const rows: Row[] = []
  let lastDay = ""
  messages.forEach((message, i) => {
    const day = dayKey(message.at)
    if (day !== lastDay) {
      rows.push({ kind: "day", key: `day-${day}`, iso: message.at })
      lastDay = day
    }
    rows.push({ kind: "message", key: message.id, message, grouped: groupsWithPrevious(messages[i - 1], message) && day === dayKey(messages[i - 1]!.at) })
  })
  return rows
}

function DaySeparator({ iso, language }: { iso: string; language: string }) {
  const label = formatDate(iso, language, { weekday: "short", day: "numeric", month: "short" })
  return (
    <div className="my-4 flex justify-center">
      <span className="text-body-11 font-semibold uppercase tracking-[0.03em] text-neutral-500">{label}</span>
    </div>
  )
}

type Props = {
  messages: ThreadMessage[]
  hasMore: boolean
  loadingOlder: boolean
  language: string
  t: AttendeInboxT
  /** Screen-reader announcement for a message that just arrived (rendered in a polite live region). */
  announcement: string
  onLoadOlder: () => void
  onRetry: (clientId: string) => void | Promise<void>
  onDiscard: (clientId: string) => void
}

const NEAR_BOTTOM_PX = 120

/** Messages oldest to newest. Sticks to the bottom while you are there, keeps your place when older ones load. */
export function MessageList({ messages, hasMore, loadingOlder, language, t, announcement, onLoadOlder, onRetry, onDiscard }: Props) {
  const scroller = useRef<HTMLDivElement | null>(null)
  const rows = useMemo(() => buildRows(messages), [messages])
  const virtual = messages.length > VIRTUALIZE_THRESHOLD
  const stickToBottom = useRef(true)
  const [showJump, setShowJump] = useState(false)
  const firstIdRef = useRef<string | null>(null)
  const prevHeight = useRef(0)
  const prevRowCount = useRef(0)

  const virtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scroller.current,
    estimateSize: () => 76,
    overscan: 10,
    getItemKey: (index) => rows[index]?.key ?? index,
  })

  const scrollToBottom = useCallback(() => {
    const el = scroller.current
    if (!el) return
    if (virtual && rows.length > 0) virtualizer.scrollToIndex(rows.length - 1, { align: "end" })
    el.scrollTop = el.scrollHeight
  }, [rows.length, virtual, virtualizer])

  const onScroll = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    stickToBottom.current = near
    setShowJump(!near)
  }, [])

  // Stay at the bottom for new messages; preserve position when an older page is prepended.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || messages.length === 0) return
    const firstId = messages[0]!.id
    const prepended = firstIdRef.current !== null && firstIdRef.current !== firstId && rows.length > prevRowCount.current
    if (prepended) {
      if (virtual) virtualizer.scrollToIndex(rows.length - prevRowCount.current, { align: "start" })
      else el.scrollTop += el.scrollHeight - prevHeight.current
    } else if (firstIdRef.current === null || stickToBottom.current) {
      scrollToBottom()
    }
    firstIdRef.current = firstId
    prevHeight.current = el.scrollHeight
    prevRowCount.current = rows.length
  }, [messages, rows.length, virtual, virtualizer, scrollToBottom])

  // A new conversation starts at the bottom again.
  useEffect(() => {
    firstIdRef.current = null
    stickToBottom.current = true
    prevRowCount.current = 0
  }, [])

  const renderRow = (row: Row) =>
    row.kind === "day" ? (
      <DaySeparator iso={row.iso} language={language} />
    ) : (
      <MessageBubble message={row.message} grouped={row.grouped} language={language} t={t} onRetry={onRetry} onDiscard={onDiscard} />
    )

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={onScroll}
        role="log"
        aria-label={t("messagesRegion")}
        className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-7 sm:py-5"
        data-testid="message-scroller"
      >
        {hasMore && (
          <div className="flex justify-center pb-2">
            <Button variant="secondary" style="outline" size="small" onClick={onLoadOlder} disabled={loadingOlder}>
              {loadingOlder ? t("loadingMore") : t("loadOlder")}
            </Button>
          </div>
        )}
        {virtual ? (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]
              if (!row) return null
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
                >
                  {renderRow(row)}
                </div>
              )
            })}
          </div>
        ) : (
          rows.map((row) => <div key={row.key}>{renderRow(row)}</div>)
        )}
      </div>
      {showJump && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label={t("jumpToLatest")}
          className="absolute bottom-3 right-4 flex size-9 items-center justify-center rounded-full border border-neutral-50 bg-white text-neutral-700 shadow-md hover:bg-neutral-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowDown2 size={16} aria-hidden />
        </button>
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
