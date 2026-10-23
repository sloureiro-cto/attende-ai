"use client"

import { type KeyboardEvent, type PointerEvent, useId, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  ACTIVITY_SERIES,
  activityGeometry,
  type ActivitySeriesKey,
  areaPath,
  axisLabelIndexes,
  type ChartBox,
  linePath,
  nearestIndex,
  seriesValues,
} from "lib/attende/reports/chartMath"
import { formatCount, formatReportDay } from "lib/attende/reports/model"
import type { SeriesPoint } from "lib/attende/reports/types"
import type { AttendeReportsKey } from "lib/i18n/translations/attende/reports"
import type { ReportsI18n } from "./useAttendeReportsT"
import { PremiumCard } from "../ui/PremiumCard"

const BOX: ChartBox = { width: 760, height: 250, left: 44, right: 16, top: 14, bottom: 30 }

/** Blue / green / violet validated for colour-vision differences; each line also has its own dash pattern as a second cue. */
const COLORS =
  "[--c-conversations:#4A8FD6] [--c-aiReplies:#2F9E6D] [--c-humanReplies:#7C5CD6] dark:[--c-conversations:#5497DA] dark:[--c-aiReplies:#389A6E] dark:[--c-humanReplies:#9C86E0]"

const META: Record<ActivitySeriesKey, { label: AttendeReportsKey; dash?: string; width: number }> = {
  conversations: { label: "seriesConversations", dash: "5 4", width: 2 },
  aiReplies: { label: "seriesAiReplies", width: 2.75 },
  humanReplies: { label: "seriesHumanReplies", dash: "1.5 4", width: 2.5 },
}

type View = "chart" | "table"

type Props = { series: SeriesPoint[]; i18n: ReportsI18n }

/**
 * Three lines per day (new conversations, AI replies, team replies). Hover or arrow keys inspect a day; the table
 * view has the same numbers plus handoffs and leads, so nothing is only readable from the picture.
 */
export function ActivityChart({ series, i18n }: Props) {
  const { t, language } = i18n
  const [view, setView] = useState<View>("chart")
  const [active, setActive] = useState<number | null>(null)
  const descId = useId()
  const geo = useMemo(() => activityGeometry(series, BOX), [series])
  const labelIdx = useMemo(() => axisLabelIndexes(series.length), [series.length])
  const baseline = geo.y(0)
  const activePoint = active === null ? null : series[active]
  const n = (v: number) => formatCount(v, language) ?? ""
  const formatDay = (day: string, long = false) => formatReportDay(day, language, long)

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * (BOX.width - BOX.left - BOX.right) + BOX.left
    setActive(nearestIndex(x, series.length, geo))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? series.length) - 1))
    else if (e.key === "ArrowRight") setActive((i) => Math.min(series.length - 1, (i ?? -1) + 1))
    else if (e.key === "Home") setActive(0)
    else if (e.key === "End") setActive(series.length - 1)
    else if (e.key === "Escape") setActive(null)
    else return
    e.preventDefault()
  }

  return (
    <PremiumCard className="flex min-w-0 flex-col gap-4 p-4 sm:p-5" data-testid="activity-chart">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-body-16 font-semibold text-neutral-900">{t("trendTitle")}</h2>
          <p className="text-body-13 text-neutral-700">{t("trendSubtitle")}</p>
        </div>
        <div role="group" aria-label={t("viewAria")} className="inline-flex gap-0.5 rounded-lg border border-neutral-50 bg-neutral-10 p-1">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "h-8 rounded-md px-3 text-body-12 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700 hover:text-neutral-900"
              )}
            >
              {t(v === "chart" ? "viewChart" : "viewTable")}
            </button>
          ))}
        </div>
      </div>

      {view === "chart" ? (
        <div className={cn("flex flex-col gap-3", COLORS)}>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-12 text-neutral-700">
            {ACTIVITY_SERIES.map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <svg width="26" height="8" aria-hidden>
                  <line x1="1" y1="4" x2="25" y2="4" stroke={`var(--c-${key})`} strokeWidth={META[key].width} strokeDasharray={META[key].dash} strokeLinecap="round" />
                </svg>
                {t(META[key].label)}
              </li>
            ))}
          </ul>
          <div
            tabIndex={0}
            role="group"
            aria-label={t("trendAria")}
            aria-describedby={descId}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            className="relative rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {/* On a phone the chart keeps a readable width and scrolls sideways; the tooltip stays put above it. */}
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={t("trendTitle")}>
                {geo.ticks.map((tick) => (
                  <g key={tick}>
                    <line x1={BOX.left} x2={BOX.width - BOX.right} y1={geo.y(tick)} y2={geo.y(tick)} className="stroke-neutral-50" strokeWidth="1" />
                    <text x={BOX.left - 8} y={geo.y(tick) + 4} textAnchor="end" className="fill-neutral-700 text-[12px]">
                      {n(tick)}
                    </text>
                  </g>
                ))}
                <path d={areaPath(seriesValues(series, "aiReplies"), geo, baseline)} fill="var(--c-aiReplies)" opacity="0.1" />
                {ACTIVITY_SERIES.map((key) => (
                  <path
                    key={key}
                    d={linePath(seriesValues(series, key), geo)}
                    fill="none"
                    stroke={`var(--c-${key})`}
                    strokeWidth={META[key].width}
                    strokeDasharray={META[key].dash}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {labelIdx.map((i) => {
                  const day = series[i]?.day
                  return (
                    <text key={i} x={geo.x(i)} y={BOX.height - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} className="fill-neutral-700 text-[12px]">
                      {day ? formatDay(day) : ""}
                    </text>
                  )
                })}
                {active !== null && (
                  <g>
                    <line x1={geo.x(active)} x2={geo.x(active)} y1={BOX.top} y2={baseline} className="stroke-neutral-300" strokeDasharray="3 3" />
                    {ACTIVITY_SERIES.map((key) => (
                      <circle key={key} cx={geo.x(active)} cy={geo.y(seriesValues(series, key)[active] ?? 0)} r="4" className="fill-white" stroke={`var(--c-${key})`} strokeWidth="2" />
                    ))}
                  </g>
                )}
                <rect x={BOX.left} y={BOX.top} width={BOX.width - BOX.left - BOX.right} height={BOX.height - BOX.top - BOX.bottom} fill="transparent" onPointerMove={onPointerMove} onPointerLeave={() => setActive(null)} />
              </svg>
            </div>
            {activePoint && (
              <div
                role="status"
                className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-neutral-50 bg-white px-3 py-2 text-body-12 shadow-[var(--bots-shadow-lift)]"
              >
                <div className="mb-1 font-semibold text-neutral-900">{formatDay(activePoint.day, true)}</div>
                {ACTIVITY_SERIES.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-6 text-neutral-700">
                    <span>{t(META[key].label)}</span>
                    <span className="font-medium tabular-nums text-neutral-900">{n(activePoint[key])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p id={descId} className="sr-only">
            {t("trendAria")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="max-h-[360px] overflow-auto rounded-lg border border-neutral-50" role="region" aria-label={t("trendTitle")} tabIndex={0}>
            <table className="w-full min-w-[640px] text-left text-body-13 tabular-nums">
              <caption className="sr-only">{t("trendTitle")}</caption>
              <thead className="sticky top-0 z-[2] bg-neutral-10 text-body-12 text-neutral-700">
                <tr>
                  {(["tableDay", "seriesConversations", "seriesCustomerMessages", "seriesAiReplies", "seriesHumanReplies", "seriesHandoffs", "seriesLeads"] as const).map((key) => (
                    <th key={key} scope="col" className="px-3 py-2 font-medium">
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((p) => (
                  <tr key={p.day} className="border-t border-neutral-50 text-neutral-900">
                    <th scope="row" className="sticky left-0 z-[1] whitespace-nowrap bg-white px-3 py-1.5 font-medium text-neutral-900">
                      {formatDay(p.day, true)}
                    </th>
                    <td className="px-3 py-1.5">{n(p.conversations)}</td>
                    <td className="px-3 py-1.5">{n(p.inboundMessages)}</td>
                    <td className="px-3 py-1.5">{n(p.aiReplies)}</td>
                    <td className="px-3 py-1.5">{n(p.humanReplies)}</td>
                    <td className="px-3 py-1.5">{n(p.handoffEvents)}</td>
                    <td className="px-3 py-1.5">{n(p.leadsCreated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-body-12 text-neutral-700">{t("trendTableNote")}</p>
        </div>
      )}
    </PremiumCard>
  )
}
