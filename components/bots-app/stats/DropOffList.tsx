"use client"

import { TrendingDown } from "lucide-react"
import { formatCount, formatShare, pct } from "./format"
import type { FunnelStep } from "./statsMath"
import { useStatsT } from "./useStatsT"
import { useStepNames } from "./useStepNames"
import { PremiumCard } from "../ui/PremiumCard"

/** The few steps that lose the most leads, worst first. */
export function DropOffList({ top, enoughTraffic }: { top: FunnelStep[]; enoughTraffic: boolean }) {
  const { t, language } = useStatsT()
  const { stepTitle } = useStepNames()
  return (
    <PremiumCard className="flex flex-col gap-4 p-5">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("dropTitle")}</h2>
        <p className="text-body-13 text-neutral-500">{t("dropSubtitle")}</p>
      </header>
      {top.length === 0 ? (
        <p className="rounded-lg bg-neutral-10 p-3 text-body-13 text-neutral-600">
          {enoughTraffic ? t("dropNone") : t("dropNeedMore")}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {top.map((step, i) => (
            <li key={step.id} className="flex flex-col gap-2 rounded-lg border border-neutral-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-md bg-warning-clean text-warning-darkest"
                    aria-hidden
                  >
                    <TrendingDown size={13} />
                  </span>
                  <span className="min-w-0 truncate text-body-14 font-semibold text-neutral-900">
                    {i + 1}. {stepTitle(step.node, step.order)}
                  </span>
                </div>
                <span className="shrink-0 text-body-13 font-semibold tabular-nums text-warning-darkest">
                  {t("dropLost", { count: formatCount(step.dropOff, language) })}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-50" role="presentation">
                <div
                  className="h-full rounded-full bg-warning"
                  style={{ width: `${Math.max(3, pct(step.dropOffRate))}%` }}
                />
              </div>
              <p className="text-body-12 text-neutral-500">
                {t("dropRate", { pct: formatShare(step.dropOffRate, language), count: formatCount(step.reached, language) })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </PremiumCard>
  )
}
