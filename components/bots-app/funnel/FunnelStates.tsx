"use client"

import { Danger, Lock1, People, Profile2User } from "iconsax-react"
import Link from "next/link"
import { Skeleton } from "components/ui/skeleton"
import type { AttendeFunnelT } from "./useAttendeFunnelT"
import { BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"

export function FunnelTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-neutral-50 rounded-[14px] border border-neutral-50 bg-white" aria-busy="true" data-testid="funnel-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-1/4" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="hidden h-3.5 w-16 sm:block" />
          <Skeleton className="hidden h-3.5 w-20 md:block" />
        </div>
      ))}
    </div>
  )
}

export function FunnelError({ t, onRetry }: { t: AttendeFunnelT; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<Danger size={22} />}
      title={t("errorTitle")}
      action={
        <button type="button" className={actionClass({ variant: "secondary" })} onClick={onRetry}>
          {t("retry")}
        </button>
      }
    />
  )
}

/** Trial over or subscription inactive (402): point to the plan page instead of a generic failure. */
export function FunnelBlocked({ t }: { t: AttendeFunnelT }) {
  return (
    <EmptyState
      icon={<Lock1 size={22} />}
      title={t("gateTitle")}
      description={t("gateHint")}
      action={
        <Link href={BOTS_ROUTES.billing} className={actionClass()}>
          {t("gateCta")}
        </Link>
      }
    />
  )
}

/** 404 from the backend: the workspace has no CRM board to read the funnel from. */
export function FunnelNoBoard({ t }: { t: AttendeFunnelT }) {
  return <EmptyState icon={<Danger size={22} />} title={t("noBoardTitle")} description={t("noBoardHint")} />
}

export function FunnelEmpty({ t, filtered, onClear, contacts = false }: { t: AttendeFunnelT; filtered: boolean; onClear: () => void; contacts?: boolean }) {
  if (filtered) {
    return (
      <EmptyState
        icon={<People size={22} />}
        title={t("emptyFilteredTitle")}
        description={t("emptyFilteredHint")}
        action={
          <button type="button" className={actionClass({ variant: "secondary" })} onClick={onClear}>
            {t("clearFilters")}
          </button>
        }
      />
    )
  }
  return contacts ? (
    <EmptyState icon={<Profile2User size={22} />} title={t("contactsEmptyTitle")} description={t("contactsEmptyHint")} />
  ) : (
    <EmptyState icon={<People size={22} />} title={t("emptyTitle")} description={t("emptyHint")} />
  )
}
