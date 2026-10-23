"use client"

import { Lamp } from "iconsax-react"
import { formatCount, formatDuration, formatReportDay, formatShare, type Insight } from "lib/attende/reports/model"
import type { ReportsI18n } from "./useAttendeReportsT"
import { PremiumCard } from "../ui/PremiumCard"

/** One insight as a sentence in the user's language (numbers, days and durations through Intl). */
export function insightText(insight: Insight, { t, tp, language }: ReportsI18n): string {
  const n = (v: number) => formatCount(v, language) ?? ""
  switch (insight.key) {
    case "resolutionUp":
      return t("insightResolutionUp", { points: n(insight.params.points) })
    case "resolutionDown":
      return t("insightResolutionDown", { points: n(insight.params.points) })
    case "handoffUp":
      return t("insightHandoffUp", { points: n(insight.params.points) })
    case "handoffDown":
      return t("insightHandoffDown", { points: n(insight.params.points) })
    case "slowAiResponse":
      return t("insightSlowAi", { time: formatDuration(insight.params.ms, language) ?? "" })
    case "topHandoffReason":
      // The reason is free text written by people and rules: inserted as is, never translated.
      return t("insightTopHandoffReason", { reason: insight.params.reason, times: tp("reasonCount", insight.params.count) })
    case "busiestDay":
      return t("insightBusiestDay", { day: formatReportDay(insight.params.day, language), count: n(insight.params.count) })
    case "bestAgent":
      return t("insightBestAgent", { name: insight.params.name, rate: formatShare(insight.params.share, language) ?? "" })
  }
}

/** Plain-language reading of the numbers, built from the data on the page (never from a model). */
export function InsightsStrip({ insights, i18n }: { insights: Insight[]; i18n: ReportsI18n }) {
  if (insights.length === 0) return null
  return (
    <PremiumCard className="flex flex-col gap-3 p-4 sm:p-5" data-testid="insights">
      <h2 className="flex items-center gap-2 text-body-16 font-semibold text-neutral-900">
        <Lamp size={18} className="text-primary-dark" aria-hidden />
        {i18n.t("insightsTitle")}
      </h2>
      <ul className="grid gap-2 md:grid-cols-2">
        {insights.map((insight) => (
          <li key={insight.key} className="rounded-lg bg-neutral-10 px-3.5 py-2.5 text-body-13 leading-relaxed text-neutral-900">
            {insightText(insight, i18n)}
          </li>
        ))}
      </ul>
    </PremiumCard>
  )
}
