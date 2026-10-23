"use client"

import { ArrowDown, ArrowRight, ArrowUp } from "iconsax-react"
import { cn } from "@/lib/utils"
import { describeDelta, formatCount, formatKpi, type KpiTileSpec } from "lib/attende/reports/model"
import type { KpiValue } from "lib/attende/reports/types"
import type { AttendeReportsKey } from "lib/i18n/translations/attende/reports"
import { InfoTip } from "./InfoTip"
import type { ReportsI18n } from "./useAttendeReportsT"
import { PremiumCard } from "../ui/PremiumCard"

export type KpiCopy = { label: AttendeReportsKey; definition: AttendeReportsKey }

type Props = ReportsI18n & {
  spec: KpiTileSpec
  kpi: KpiValue
  copy: KpiCopy
  /** What the number is measured on and when ("24 of 120 conversations started Oct 1 – 30"). */
  basis: string[]
  /** The previous window, already formatted ("Sep 1 – 30"). */
  previousRange: string
  /** False when the previous window has no recorded activity: then no change is shown at all. */
  hasPrevious: boolean
  /** Smaller tile for the secondary section. */
  compact?: boolean
}

const TONE: Record<string, string> = {
  good: "bg-success-clean text-success-darkest",
  bad: "bg-error-clean text-error-darkest",
  flat: "bg-neutral-10 text-neutral-700",
  neutral: "bg-info-clean text-info-darkest",
}

/**
 * One number, what it is measured on, and its change versus the previous period. A missing value reads "No data"
 * (never 0), and a change is shown only when both periods have data. Colour never carries the meaning alone: the
 * chip has an arrow and words, and the estimate badge has text.
 */
export function KpiTile({ spec, kpi, copy, basis, previousRange, hasPrevious, t, language, compact = false }: Props) {
  const label = t(copy.label)
  const value = formatKpi(kpi.value, spec.format, language)
  const delta = hasPrevious && value !== null ? describeDelta(kpi, spec.format, spec.betterWhen) : null
  const Arrow = delta?.direction === "up" ? ArrowUp : delta?.direction === "down" ? ArrowDown : ArrowRight

  let deltaText: string | null = null
  if (delta) {
    if (delta.direction === "flat") deltaText = t("deltaFlat")
    else if (delta.points !== null) deltaText = t(delta.direction === "up" ? "deltaPointsUp" : "deltaPointsDown", { points: formatCount(delta.points, language) ?? "" })
    else if (delta.pct !== null) deltaText = t(delta.direction === "up" ? "deltaMore" : "deltaLess", { pct: formatCount(delta.pct, language) ?? "" })
  }

  let comparison: string | null = null
  if (value !== null && !deltaText) {
    if (!hasPrevious || kpi.previous === null) comparison = t("deltaNoPrevious", { range: previousRange })
    else if (kpi.previous === 0 && (kpi.value ?? 0) > 0) comparison = t("deltaFromZero", { range: previousRange })
  }

  return (
    <PremiumCard className={cn("flex flex-col gap-2", compact ? "p-3.5" : "p-4")} data-testid={`kpi-${spec.key}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-body-13 font-medium text-neutral-700">{label}</h3>
        <span className="flex shrink-0 items-center gap-1">
          {spec.estimate && (
            <span className="rounded-full bg-warning-clean px-2 py-0.5 text-body-11 font-semibold text-warning-darkest" title={t("estimateBadgeAria")}>
              {t("estimateBadge")}
            </span>
          )}
          <InfoTip ariaLabel={t("infoAria", { metric: label })}>{t(copy.definition)}</InfoTip>
        </span>
      </div>
      {value === null ? (
        <span className={cn("font-semibold leading-none text-neutral-700", compact ? "text-[18px]" : "text-[22px]")} title={t("noDataHint")}>
          {t("noData")}
        </span>
      ) : (
        <span className={cn("font-semibold leading-none tracking-tight text-neutral-900 tabular-nums", compact ? "text-[22px]" : "text-[28px]")}>{value}</span>
      )}
      {basis.length > 0 && (
        <p className="flex flex-col text-body-12 leading-snug text-neutral-700" data-testid={`kpi-basis-${spec.key}`}>
          {basis.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-12">
        {deltaText && delta ? (
          <>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", TONE[delta.tone])}>
              <Arrow size={12} aria-hidden />
              {deltaText}
            </span>
            <span className="text-neutral-700">{t("deltaVsPrevious", { range: previousRange })}</span>
          </>
        ) : comparison ? (
          <span className="text-neutral-700">{comparison}</span>
        ) : null}
      </div>
    </PremiumCard>
  )
}
