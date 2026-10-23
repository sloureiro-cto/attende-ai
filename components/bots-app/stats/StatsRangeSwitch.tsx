"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { STATS_RANGES, type StatsRange } from "./statsMath"
import { useStatsT } from "./useStatsT"

const LABEL = { 7: "range7", 30: "range30", 90: "range90" } as const

/** Period selector. Plain links: the page is server-rendered per range, so it works without JS and is shareable. */
export function StatsRangeSwitch({ current, basePath }: { current: StatsRange; basePath: string }) {
  const { t } = useStatsT()
  return (
    <nav
      aria-label={t("rangeAria")}
      className="inline-flex gap-0.5 rounded-lg border border-neutral-50 bg-neutral-10 p-1"
    >
      {STATS_RANGES.map((range) => {
        const active = range === current
        return (
          <Link
            key={range}
            href={`${basePath}?days=${range}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center rounded-md px-3 text-body-13 font-medium no-underline transition-colors",
              active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            {t(LABEL[range])}
          </Link>
        )
      })}
    </nav>
  )
}
