"use client"

import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { displayName, lacksPhoneAndEmail } from "lib/attende/funnel/model"
import type { ContactRow } from "lib/attende/funnel/types"
import { Avatar, StageBadge } from "./atoms"
import { ScrollTable, STICKY_TD_CLASS, TD_CLASS, TH_CLASS } from "./ScrollTable"
import type { AttendeFunnelT, AttendeFunnelTn } from "./useAttendeFunnelT"
import { actionClass } from "../ui/actionStyles"

type Props = {
  rows: ContactRow[]
  hasMore: boolean
  loadingMore: boolean
  busy: boolean
  t: AttendeFunnelT
  tn: AttendeFunnelTn
  onOpenDeal: (contact: ContactRow) => void
  onLoadMore: () => void
  restoreScrollTop?: number | null
  onScrollTop?: (top: number) => void
  onRestored?: () => void
}

/** A missing value in a cell: a dash on screen, words for a screen reader. */
const Missing = ({ label }: { label: string }) => (
  <>
    <span aria-hidden className="text-neutral-500">
      –
    </span>
    <span className="sr-only">{label}</span>
  </>
)

/** Contact directory (`GET /contacts`), ordered by name, with a shortcut to each contact's latest deal. */
export function ContactsTable({ rows, hasMore, loadingMore, busy, t, tn, onOpenDeal, onLoadMore, restoreScrollTop, onScrollTop, onRestored }: Props) {
  const renderRow = useCallback(
    (c: ContactRow) => {
      const name = displayName(c) || t("unnamed")
      return (
        <tr key={c.id} data-testid="funnel-contact-row" className="group bg-white hover:bg-neutral-10">
          <td className={cn(TD_CLASS, STICKY_TD_CLASS, "min-w-[200px]")}>
            <span className="flex min-w-0 items-center gap-3">
              <Avatar name={c.name} url={c.avatarUrl} />
              <span className="truncate text-body-14 font-medium text-neutral-900">{name}</span>
            </span>
          </td>
          {lacksPhoneAndEmail(c) ? (
            <td colSpan={2} className={cn(TD_CLASS, "min-w-[320px] text-neutral-500")}>
              {t("noPhoneOrEmail")}
            </td>
          ) : (
            <>
              <td className={cn(TD_CLASS, "min-w-[140px] whitespace-nowrap tabular-nums")}>{c.phone?.trim() || <Missing label={t("noPhone")} />}</td>
              <td className={cn(TD_CLASS, "min-w-[180px]")}>
                {c.email?.trim() ? <span className="block max-w-[240px] truncate">{c.email}</span> : <Missing label={t("noEmail")} />}
              </td>
            </>
          )}
          <td className={cn(TD_CLASS, "min-w-[150px]")}>
            {c.deals.total > 0 ? (
              t("contactDealsSummary", { deals: tn("dealsCountOne", "dealsCountOther", c.deals.total), open: tn("openCountOne", "openCountOther", c.deals.open) })
            ) : (
              <span className="text-neutral-500">{t("contactNoDeals")}</span>
            )}
          </td>
          <td className={cn(TD_CLASS, "min-w-[140px]")}>
            <StageBadge stage={c.latestStage} t={t} />
          </td>
          <td className={cn(TD_CLASS, "min-w-[150px] text-right")}>
            {c.latestCardId && (
              <button
                type="button"
                aria-label={t("contactOpenDealOf", { name })}
                onClick={() => onOpenDeal(c)}
                className={actionClass({ variant: "ghost", size: "sm", className: "text-primary-dark hover:text-primary-darkest" })}
              >
                {t("contactOpenDeal")}
              </button>
            )}
          </td>
        </tr>
      )
    },
    [t, tn, onOpenDeal]
  )

  return (
    <ScrollTable
      rows={rows}
      rowKey={(c) => c.id}
      renderRow={renderRow}
      ariaLabel={t("contactsTableAria")}
      minWidth={780}
      hasMore={hasMore}
      loadingMore={loadingMore}
      busy={busy}
      onLoadMore={onLoadMore}
      restoreScrollTop={restoreScrollTop}
      onScrollTop={onScrollTop}
      onRestored={onRestored}
      header={
        <tr>
          <th scope="col" className={cn(TH_CLASS, "sticky left-0 z-10")}>
            {t("colName")}
          </th>
          <th scope="col" className={TH_CLASS}>
            {t("colPhone")}
          </th>
          <th scope="col" className={TH_CLASS}>
            {t("colEmail")}
          </th>
          <th scope="col" className={TH_CLASS}>
            {t("colDeals")}
          </th>
          <th scope="col" className={TH_CLASS}>
            {t("colLatestStage")}
          </th>
          <th scope="col" className={TH_CLASS}>
            <span className="sr-only">{t("contactOpenDeal")}</span>
          </th>
        </tr>
      }
    />
  )
}
