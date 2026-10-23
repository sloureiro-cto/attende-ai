"use client"

import { Danger, MessageText1 } from "iconsax-react"
import { memo, useEffect, useRef } from "react"
import Button from "components/Button/Button"
import { Skeleton } from "components/ui/skeleton"
import { filtersAreDefault, type InboxFilters, type InboxItem } from "lib/bots-app/inbox/model"
import { ConversationRow } from "./ConversationRow"
import { type AttendeInboxT, countLabel } from "./useAttendeInboxT"
import type { ListStatus } from "./useInboxList"
import { EmptyState } from "../ui/EmptyState"

export function ConversationListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="flex flex-col" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

type Props = {
  items: InboxItem[]
  status: ListStatus
  filters: InboxFilters
  hasMore: boolean
  loadingMore: boolean
  selectedKey: string | null
  language: string
  t: AttendeInboxT
  onSelect: (item: InboxItem) => void
  onLoadMore: () => void
  onRetry: () => void
  onClearFilters: () => void
}

/** Conversation list with its loading / empty / error states and infinite loading near the bottom. */
export const ConversationList = memo(function ConversationList({
  items,
  status,
  filters,
  hasMore,
  loadingMore,
  selectedKey,
  language,
  t,
  onSelect,
  onLoadMore,
  onRetry,
  onClearFilters,
}: Props) {
  const sentinel = useRef<HTMLDivElement | null>(null)

  // Load the next page when the sentinel scrolls into view; the button below is the keyboard/no-IO fallback.
  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onLoadMore(), {
      rootMargin: "240px",
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, items.length])

  if (status === "loading" && items.length === 0) return <ConversationListSkeleton />

  if (status === "error" && items.length === 0) {
    return (
      <EmptyState
        className="m-2"
        icon={<Danger size={22} />}
        title={t("listError")}
        action={
          <Button variant="secondary" style="outline" size="medium" onClick={onRetry}>
            {t("retry")}
          </Button>
        }
      />
    )
  }

  if (items.length === 0) {
    const filtered = !filtersAreDefault(filters)
    return (
      <EmptyState
        className="m-2"
        icon={<MessageText1 size={22} />}
        title={filtered ? t("listNoMatchTitle") : t("listEmptyTitle")}
        description={filtered ? t("listNoMatchHint") : t("listEmptyHint")}
        action={
          filtered ? (
            <Button variant="secondary" style="outline" size="medium" onClick={onClearFilters}>
              {t("clearFilters")}
            </Button>
          ) : undefined
        }
      />
    )
  }

  const filtered = !filtersAreDefault(filters)
  // Says what the number is: everything, what matches the filters, or only what is loaded so far.
  const footer = hasMore
    ? countLabel(t, language, items.length, "listCountLoadedOne", "listCountLoadedOther")
    : filtered
      ? countLabel(t, language, items.length, "listCountFilteredOne", "listCountFilteredOther")
      : countLabel(t, language, items.length, "listCountAllOne", "listCountAllOther")

  return (
    <div aria-busy={status === "loading"}>
      <ul className="flex flex-col gap-px">
        {items.map((item) => (
          <ConversationRow key={item.key} item={item} selected={item.key === selectedKey} language={language} t={t} onSelect={onSelect} />
        ))}
      </ul>
      <div ref={sentinel} className="flex flex-col items-center gap-2 py-3">
        <p className="text-body-11 text-neutral-500" data-testid="list-count">
          {footer}
        </p>
        {hasMore && (
          <Button variant="secondary" style="outline" size="small" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
        )}
      </div>
    </div>
  )
})
