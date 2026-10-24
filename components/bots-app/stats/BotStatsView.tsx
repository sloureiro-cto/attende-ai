"use client"

import { ArrowLeft, BarChart3, PencilRuler } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import type { AdvancedAutomationDetail, AdvancedAutomationStatsSummary } from "lib/automations/types"
import { DropOffList } from "./DropOffList"
import { KpiGrid } from "./KpiGrid"
import { buildFunnel, computeKpis, type DailyStatsPoint, rankDropOffs, type StatsRange } from "./statsMath"
import { StatsRangeSwitch } from "./StatsRangeSwitch"
import { StepFunnel } from "./StepFunnel"
import { TrendChart } from "./TrendChart"
import { useStatsT } from "./useStatsT"
import { BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"

type Props = {
  bot: Pick<AdvancedAutomationDetail, "id" | "name" | "startNodeId" | "nodes" | "edges">
  days: StatsRange
  stats: AdvancedAutomationStatsSummary
  /** `null` when the daily series could not be loaded: the rest of the page still works. */
  series: DailyStatsPoint[] | null
}

const MIN_TRAFFIC = 5

/** /bots/[id]/stats: headline numbers, runs per day, the per-step funnel and the biggest drop-offs. */
export function BotStatsView({ bot, days, stats, series }: Props) {
  const { t } = useStatsT()
  const statsPath = `${BOTS_ROUTES.bots}/${encodeURIComponent(bot.id)}/stats`

  const kpis = useMemo(() => computeKpis(stats), [stats])
  const steps = useMemo(() => buildFunnel(bot, stats), [bot, stats])
  const top = useMemo(() => rankDropOffs(steps, 3, MIN_TRAFFIC), [steps])
  const flagged = useMemo(() => new Set(top.map((s) => s.id)), [top])
  const empty = kpis.started === 0 && steps.every((s) => s.reached === 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={BOTS_ROUTES.bots}
          className="inline-flex items-center gap-1.5 rounded text-body-13 font-medium text-neutral-500 no-underline hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft size={14} aria-hidden />
          {t("back")}
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-[26px]">{t("title")}</h1>
          <p className="text-body-14 text-neutral-500">{t("subtitle", { name: bot.name })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatsRangeSwitch current={days} basePath={statsPath} />
          <Link href={`${BOTS_ROUTES.bots}/${encodeURIComponent(bot.id)}?stats=1`} className={actionClass({ variant: "secondary" })}>
            <PencilRuler size={15} aria-hidden />
            {t("openBuilder")}
          </Link>
        </div>
      </header>

      {empty ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} icon={<BarChart3 size={22} aria-hidden />} />
      ) : (
        <>
          <KpiGrid kpis={kpis} />
          {series ? (
            <TrendChart series={series} />
          ) : (
            <p
              className="rounded-lg border border-dashed border-neutral-100 bg-white px-4 py-6 text-center text-body-13 text-neutral-500"
              role="status"
            >
              {t("trendLoadError")}
            </p>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <StepFunnel steps={steps} flaggedIds={flagged} />
            <DropOffList top={top} enoughTraffic={steps.some((s) => !s.terminal && s.reached >= MIN_TRAFFIC)} />
          </div>
          <p className="text-body-12 text-neutral-500">{t("statsNote")}</p>
        </>
      )}
    </div>
  )
}
