"use client"

import { Chart21, Danger, Lock1, SearchStatus, Timer1 } from "iconsax-react"
import Link from "next/link"
import type { AttendeReportsT } from "./useAttendeReportsT"
import { BOTS_BRAND } from "../brand"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"
import { PremiumCard } from "../ui/PremiumCard"
import { serviceErrorKey } from "lib/attende/result"

/** First load: the shape of the page (tiles, then the chart), announced as busy. */
export function ReportsSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={label} data-testid="reports-skeleton">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <PremiumCard key={i} className="h-[148px] animate-pulse bg-neutral-10 motion-reduce:animate-none" />
        ))}
      </div>
      <PremiumCard className="h-[360px] animate-pulse bg-neutral-10 motion-reduce:animate-none" />
    </div>
  )
}

/** The request failed (network, 5xx): nothing to show yet, the filters stay, one retry button. */
export function ReportsError({ t, onRetry, code }: { t: AttendeReportsT; onRetry: () => void; code?: string }) {
  const service = serviceErrorKey(code)
  return (
    <EmptyState
      icon={<Danger size={22} />}
      title={t("loadError")}
      description={t(service ?? "loadErrorHint")}
      action={
        <button type="button" className={actionClass({ variant: "secondary" })} onClick={onRetry}>
          {t("retry")}
        </button>
      }
    />
  )
}

/** The backend refused the filters (400): retrying would fail again, so offer the default window instead. */
export function ReportsInvalidFilters({ t, onReset }: { t: AttendeReportsT; onReset: () => void }) {
  return (
    <EmptyState
      icon={<SearchStatus size={22} />}
      title={t("invalidFiltersTitle")}
      description={t("invalidFiltersHint")}
      action={
        <button type="button" className={actionClass({ variant: "secondary" })} onClick={onReset}>
          {t("resetFilters")}
        </button>
      }
    />
  )
}

/** Trial over or subscription inactive: the backend answered 402. Points to the subscription page instead of a generic failure. */
export function ReportsBlocked({ t }: { t: AttendeReportsT }) {
  return (
    <EmptyState
      icon={<Lock1 size={22} />}
      title={t("gateInactiveTitle")}
      description={t("gateInactiveHint")}
      action={
        <Link href="/billing" className={actionClass()}>
          {t("gateInactiveCta")}
        </Link>
      }
    />
  )
}

/** The workspace's first sync has not finished: the numbers would be incomplete, so none are shown (never zeros). */
export function ReportsPreparing({ t }: { t: AttendeReportsT }) {
  return (
    <div role="status" data-testid="reports-preparing">
      <EmptyState icon={<Timer1 size={22} />} title={t("preparingTitle")} description={t("preparingHint")} />
    </div>
  )
}

/** Nothing happened in the window and no filter narrows it: a new account, or reports not built yet. */
export function ReportsFirstTime({ t }: { t: AttendeReportsT }) {
  return (
    <EmptyState
      icon={<Chart21 size={22} />}
      title={t("emptyTitle")}
      description={t("emptyHint")}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/inbox" className={actionClass()}>
            {t("emptyCtaLines")}
          </Link>
          <Link href="/ai-agents/new" className={actionClass({ variant: "secondary" })}>
            {t("emptyCtaAgents")}
          </Link>
          <a href={BOTS_BRAND.bookingUrl} target="_blank" rel="noopener noreferrer" className={actionClass({ variant: "ghost" })}>
            {t("emptyCtaBook")}
          </a>
        </div>
      }
    />
  )
}

/** Nothing for the chosen channel or AI agent: the way out is clearing them. */
export function ReportsFilteredEmpty({ t, onReset }: { t: AttendeReportsT; onReset: () => void }) {
  return (
    <EmptyState
      icon={<Chart21 size={22} />}
      title={t("emptyFilteredTitle")}
      description={t("emptyFilteredHint")}
      action={
        <button type="button" className={actionClass({ variant: "secondary" })} onClick={onReset}>
          {t("resetFilters")}
        </button>
      }
    />
  )
}
