"use client"

import { memo, type ReactNode, useCallback, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { displayName, formatDealValue, formatRelativeTime, type FunnelColumn } from "lib/attende/funnel/model"
import type { FunnelRow } from "lib/attende/funnel/types"
import { Avatar, CHANNEL_KEY, COLUMN_KEY, HANDLING_KEY, LabelPill, StageBadge } from "./atoms"
import { ROW_HEIGHT, ScrollTable, STICKY_TD_CLASS, TD_CLASS, TH_CLASS } from "./ScrollTable"
import type { AttendeFunnelT } from "./useAttendeFunnelT"

const MAX_LABELS = 2

/** The row's name: the contact's name, else the deal title, else the phone or e-mail (empty when none exists). */
export const rowName = (row: FunnelRow): string => displayName(row.contact, row.title)
/** What the avatar initials come from: a real name or title, never a phone number. */
export const rowAvatarName = (row: FunnelRow): string => row.contact?.name?.trim() || row.title?.trim() || ""

type CellCtx = { t: AttendeFunnelT; language: string; now: Date; onOpen: (row: FunnelRow) => void }

function cell(column: FunnelColumn, row: FunnelRow, { t, language, now, onOpen }: CellCtx): ReactNode {
  switch (column) {
    case "contact": {
      const name = rowName(row) || t("unnamed")
      // One line per row: the phone and e-mail live in the drawer. Only a deal without a contact says so.
      const sub = row.contact ? null : t("noContact")
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={rowAvatarName(row)} url={row.contact?.avatarUrl} />
          <div className="flex min-w-0 flex-col">
            <button
              type="button"
              aria-label={t("openDetails", { name })}
              onClick={(e) => {
                e.stopPropagation()
                onOpen(row)
              }}
              className="truncate text-left text-body-14 font-medium text-neutral-900 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {name}
            </button>
            {sub && <span className="truncate text-body-12 text-neutral-500">{sub}</span>}
          </div>
        </div>
      )
    }
    case "stage":
      return <StageBadge stage={row.stage} t={t} />
    case "deal": {
      // `deal: null` is "no value", not zero (see the API contract); the amount keeps the deal's own currency.
      const value = formatDealValue(row.deal, language)
      return value ? <span className="whitespace-nowrap tabular-nums text-neutral-900">{value}</span> : <span className="whitespace-nowrap text-neutral-500">{t("dealNoValue")}</span>
    }
    case "owner":
      return row.owner ? (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={row.owner.name} url={row.owner.avatarUrl} size={22} />
          <span className="truncate">{row.owner.name || t("unnamed")}</span>
        </span>
      ) : (
        <span className="text-neutral-500">{t("unassigned")}</span>
      )
    case "labels":
      return row.labels.length === 0 ? null : (
        <span className="flex flex-wrap items-center gap-1">
          {row.labels.slice(0, MAX_LABELS).map((l) => (
            <LabelPill key={l.id} text={l.text} color={l.color} />
          ))}
          {row.labels.length > MAX_LABELS && <span className="text-body-11 text-neutral-500">{t("moreLabels", { count: row.labels.length - MAX_LABELS })}</span>}
        </span>
      )
    case "source":
      return <span className="truncate">{row.sources.map((s) => s.text).join(", ")}</span>
    case "lastMessage": {
      const at = row.conversation?.lastMessageAt ?? row.lastMessageAt
      // Channel and who is answering are a hover away (and in the drawer), not a second line.
      const hint = row.conversation ? t("conversationSummary", { channel: t(CHANNEL_KEY[row.conversation.channel]), handling: t(HANDLING_KEY[row.conversation.handling]) }) : undefined
      const when = formatRelativeTime(at, now, language)
      if (!when) return <span className="whitespace-nowrap text-neutral-500">{t("noMessages")}</span>
      return (
        <span className="whitespace-nowrap text-neutral-700" title={hint}>
          {when}
        </span>
      )
    }
    case "updated":
      return <span className="whitespace-nowrap">{formatRelativeTime(row.updatedAt, now, language)}</span>
  }
}

const COL_CLASS: Partial<Record<FunnelColumn, string>> = {
  contact: "min-w-[220px] w-[32%]",
  stage: "min-w-[150px]",
  deal: "min-w-[120px] text-right",
  owner: "min-w-[160px]",
  labels: "min-w-[150px]",
  source: "min-w-[120px]",
  lastMessage: "min-w-[150px]",
  updated: "min-w-[110px]",
}

const Row = memo(function Row({ row, columns, ctx, selected, index }: { row: FunnelRow; columns: FunnelColumn[]; ctx: CellCtx; selected: boolean; index?: number }) {
  return (
    <tr
      data-index={index}
      data-testid="funnel-row"
      aria-selected={selected}
      onClick={() => ctx.onOpen(row)}
      className={cn("group cursor-pointer bg-white transition-colors hover:bg-neutral-10", selected && "bg-primary-clean hover:bg-primary-clean")}
      style={{ height: ROW_HEIGHT }}
    >
      {columns.map((c) => (
        <td
          key={c}
          className={cn(TD_CLASS, COL_CLASS[c], c === "contact" && STICKY_TD_CLASS)}
        >
          {cell(c, row, ctx)}
        </td>
      ))}
    </tr>
  )
})

type Props = {
  rows: FunnelRow[]
  columns: FunnelColumn[]
  selectedId: string | null
  hasMore: boolean
  loadingMore: boolean
  busy: boolean
  t: AttendeFunnelT
  language: string
  now?: Date
  onOpen: (row: FunnelRow) => void
  onLoadMore: () => void
  /** Scroll position to put back once (coming back to the funnel), and where the table is scrolled now. */
  restoreScrollTop?: number | null
  onScrollTop?: (top: number) => void
  onRestored?: () => void
}

/** The deals table (contacts + stage + deal). Clicking a row opens its drawer. */
export function DealsTable({ rows, columns, selectedId, hasMore, loadingMore, busy, t, language, now, onOpen, onLoadMore, restoreScrollTop, onScrollTop, onRestored }: Props) {
  const [clock] = useState(() => now ?? new Date())
  const ctx = useMemo<CellCtx>(() => ({ t, language, now: clock, onOpen }), [t, language, clock, onOpen])
  const renderRow = useCallback(
    (row: FunnelRow, index: number) => <Row key={row.cardId} index={index} row={row} columns={columns} ctx={ctx} selected={row.cardId === selectedId} />,
    [columns, ctx, selectedId]
  )
  return (
    <ScrollTable
      rows={rows}
      rowKey={(r) => r.cardId}
      renderRow={renderRow}
      ariaLabel={t("tableAria")}
      hasMore={hasMore}
      loadingMore={loadingMore}
      busy={busy}
      onLoadMore={onLoadMore}
      restoreScrollTop={restoreScrollTop}
      onScrollTop={onScrollTop}
      onRestored={onRestored}
      header={
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col" className={cn(TH_CLASS, COL_CLASS[c], c === "contact" && "sticky left-0 z-10")}>
              {t(COLUMN_KEY[c])}
            </th>
          ))}
        </tr>
      }
    />
  )
}
