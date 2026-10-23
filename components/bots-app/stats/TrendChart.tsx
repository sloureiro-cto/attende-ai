"use client"

import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatCount, formatDay } from "./format"
import {
  areaPath,
  axisLabelIndexes,
  type ChartBox,
  type DailyStatsPoint,
  linePath,
  nearestIndex,
  seriesTotals,
  trendGeometry,
} from "./statsMath"
import { useStatsT } from "./useStatsT"
import { PremiumCard } from "../ui/PremiumCard"

const BOX: ChartBox = { width: 760, height: 250, left: 40, right: 16, top: 14, bottom: 30 }

/** Series colors validated for CVD/contrast (light #2F9E6D/#4A8FD6, dark #389A6E/#5497DA); the dash and area give a second cue. */
const COLORS = "[--c-started:#4A8FD6] [--c-completed:#2F9E6D] dark:[--c-started:#5497DA] dark:[--c-completed:#389A6E]"

type View = "chart" | "table"

function Legend({ labels }: { labels: { started: string; completed: string } }) {
  return (
    <ul className="flex items-center gap-4 text-body-12 text-neutral-600" aria-hidden>
      <li className="flex items-center gap-1.5">
        <svg width="22" height="8" aria-hidden>
          <line
            x1="1"
            y1="4"
            x2="21"
            y2="4"
            stroke="var(--c-started)"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        </svg>
        {labels.started}
      </li>
      <li className="flex items-center gap-1.5">
        <svg width="22" height="8" aria-hidden>
          <line x1="1" y1="4" x2="21" y2="4" stroke="var(--c-completed)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        {labels.completed}
      </li>
    </ul>
  )
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const { t } = useStatsT()
  return (
    <div
      role="group"
      aria-label={t("viewAria")}
      className="inline-flex gap-0.5 rounded-lg border border-neutral-50 bg-neutral-10 p-1"
    >
      {(["chart", "table"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-7 rounded-md px-2.5 text-body-12 font-medium transition-colors",
            view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
          )}
        >
          {t(v === "chart" ? "viewChart" : "viewTable")}
        </button>
      ))}
    </div>
  )
}

function DataTable({ series }: { series: DailyStatsPoint[] }) {
  const { t, language } = useStatsT()
  const n = (v: number) => formatCount(v, language)
  return (
    <div className="max-h-[300px] overflow-auto rounded-lg border border-neutral-50">
      <table className="w-full text-left text-body-13 tabular-nums">
        <thead className="sticky top-0 bg-neutral-10 text-body-12 text-neutral-500">
          <tr>
            {(
              [
                "tableDay",
                "trendSeriesStarted",
                "trendSeriesCompleted",
                "tableHandedOff",
                "tableStopped",
                "tableFailed",
              ] as const
            ).map((key) => (
              <th key={key} scope="col" className="px-3 py-2 font-medium">
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...series].reverse().map((p) => (
            <tr key={p.day} className="border-t border-neutral-50 text-neutral-900">
              <th scope="row" className="px-3 py-1.5 font-medium text-neutral-700">
                {formatDay(p.day, language, true)}
              </th>
              <td className="px-3 py-1.5">{n(p.started)}</td>
              <td className="px-3 py-1.5">{n(p.completed)}</td>
              <td className="px-3 py-1.5">{n(p.handedOff)}</td>
              <td className="px-3 py-1.5">{n(p.stopped)}</td>
              <td className="px-3 py-1.5">{n(p.failed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Runs started vs completed per day. Hover or arrow keys inspect a day; the table view carries the same numbers. */
export function TrendChart({ series }: { series: DailyStatsPoint[] }) {
  const { t, language } = useStatsT()
  const [view, setView] = useState<View>("chart")
  const [active, setActive] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const geo = useMemo(() => trendGeometry(series, BOX), [series])
  const started = useMemo(() => series.map((p) => p.started), [series])
  const completed = useMemo(() => series.map((p) => p.completed), [series])
  const totals = useMemo(() => seriesTotals(series), [series])
  const baseline = geo.y(0)
  const labelIdx = useMemo(() => axisLabelIndexes(series.length), [series.length])
  const activePoint = active === null ? null : series[active]

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * (BOX.width - BOX.left - BOX.right) + BOX.left
    setActive(nearestIndex(x, series.length, geo))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? series.length) - 1))
    else if (e.key === "ArrowRight") setActive((i) => Math.min(series.length - 1, (i ?? -1) + 1))
    else if (e.key === "Escape") setActive(null)
    else return
    e.preventDefault()
  }

  return (
    <PremiumCard className={cn("flex flex-col gap-4 p-5", COLORS)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("trendTitle")}</h2>
        <div className="flex flex-wrap items-center gap-4">
          {view === "chart" && (
            <Legend labels={{ started: t("trendSeriesStarted"), completed: t("trendSeriesCompleted") }} />
          )}
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {view === "table" ? (
        <DataTable series={series} />
      ) : (
        <div
          ref={wrapRef}
          className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
          tabIndex={0}
          role="img"
          aria-label={t("trendAria", {
            started: formatCount(totals.started, language),
            completed: formatCount(totals.completed, language),
          })}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onMouseLeave={() => setActive(null)}
        >
          <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} className="block h-auto w-full" aria-hidden>
            {geo.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={BOX.left}
                  x2={BOX.width - BOX.right}
                  y1={geo.y(tick)}
                  y2={geo.y(tick)}
                  className="stroke-neutral-50"
                  strokeWidth={1}
                />
                <text
                  x={BOX.left - 8}
                  y={geo.y(tick) + 4}
                  textAnchor="end"
                  className="fill-neutral-500 text-[11px] tabular-nums"
                >
                  {formatCount(tick, language)}
                </text>
              </g>
            ))}
            {labelIdx.map((i) => (
              <text
                key={i}
                x={geo.x(i)}
                y={BOX.height - 8}
                textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}
                className="fill-neutral-500 text-[11px]"
              >
                {formatDay(series[i]?.day ?? "", language)}
              </text>
            ))}

            <path d={areaPath(started, geo, baseline)} fill="var(--c-started)" fillOpacity={0.12} />
            <path
              d={linePath(started, geo)}
              fill="none"
              stroke="var(--c-started)"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={linePath(completed, geo)}
              fill="none"
              stroke="var(--c-completed)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {activePoint && active !== null && (
              <g>
                <line
                  x1={geo.x(active)}
                  x2={geo.x(active)}
                  y1={BOX.top}
                  y2={baseline}
                  className="stroke-neutral-200"
                  strokeWidth={1}
                />
                {(
                  [
                    ["started", activePoint.started, "var(--c-started)"],
                    ["completed", activePoint.completed, "var(--c-completed)"],
                  ] as const
                ).map(([key, value, color]) => (
                  <circle
                    key={key}
                    cx={geo.x(active)}
                    cy={geo.y(value)}
                    r={4.5}
                    fill={color}
                    className="stroke-white"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            {/* Hit target: the whole plot, far larger than any mark. */}
            <rect
              x={BOX.left}
              y={BOX.top}
              width={BOX.width - BOX.left - BOX.right}
              height={baseline - BOX.top}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerDown={onPointerMove}
            />
          </svg>

          {activePoint && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 min-w-[150px] -translate-x-1/2 rounded-lg border border-neutral-50 bg-white px-3 py-2 text-body-12 shadow-[var(--bots-shadow-lift)]"
              style={{ left: `${Math.min(88, Math.max(12, (geo.x(active) / BOX.width) * 100))}%` }}
            >
              <div className="font-semibold text-neutral-900">{formatDay(activePoint.day, language, true)}</div>
              <div className="mt-1 flex items-center gap-1.5 text-neutral-700">
                <span className="size-2 rounded-full" style={{ background: "var(--c-started)" }} aria-hidden />
                {t("trendSeriesStarted")}: <b className="tabular-nums">{formatCount(activePoint.started, language)}</b>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-700">
                <span className="size-2 rounded-full" style={{ background: "var(--c-completed)" }} aria-hidden />
                {t("trendSeriesCompleted")}:{" "}
                <b className="tabular-nums">{formatCount(activePoint.completed, language)}</b>
              </div>
            </div>
          )}
        </div>
      )}
    </PremiumCard>
  )
}
