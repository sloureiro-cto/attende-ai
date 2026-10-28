"use client"

import { Calendar, Refresh } from "iconsax-react"
import { cn } from "@/lib/utils"
import type { ReportData } from "actions/attende/reports"
import { formatTime } from "lib/attende/format"
import {
  deriveInsights,
  formatDayRange,
  HEADLINE_KPIS,
  isEmptyOverview,
  KPI_NOT_AVAILABLE_KEY,
  type KpiTileSpec,
  type ParsedReportFilters,
  presetRange,
  previousHasData,
  reportBases,
  SECONDARY_KPIS,
} from "lib/attende/reports/model"
import type { OverviewResponse, ReportFilters } from "lib/attende/reports/types"
import type { AttendeActionError } from "lib/attende/result"
import { isSubscriptionBlock } from "lib/attende/result"
import { ActivityChart } from "./ActivityChart"
import { AgentsTable, ChannelsTable, HandoffReasons, TablesFootnote } from "./BreakdownTables"
import { ExportMenu } from "./ExportMenu"
import { InfoTip } from "./InfoTip"
import { InsightsStrip } from "./Insights"
import { KPI_COPY, kpiBasis } from "./kpiCopy"
import { KpiTile } from "./KpiTile"
import { HonestyNote, NotMeasured } from "./NotMeasured"
import { OutcomesCard } from "./OutcomesCard"
import { ReportsFilters } from "./ReportsFilters"
import { ReportsBlocked, ReportsError, ReportsFilteredEmpty, ReportsFirstTime, ReportsInvalidFilters, ReportsPreparing, ReportsSkeleton } from "./ReportsStates"
import { type ReportsI18n, useAttendeReportsT } from "./useAttendeReportsT"
import { useReportData } from "./useReportData"
import { PageLayout } from "../ui/PageLayout"

type Props = {
  initial: { filters: ReportFilters; preset: ParsedReportFilters["preset"]; data: ReportData | null; error: AttendeActionError | null }
}

/**
 * The period on screen and how fresh it is, always in the page bar. It describes the numbers being shown (the
 * loaded report), so while new filters load it keeps naming the window that is still on screen. `generatedAt` is
 * when the API answered, not when the data was last aggregated (the API does not return that), so it is worded
 * as "fetched at".
 */
function PeriodSummary({ overview, filters, i18n }: { overview: OverviewResponse | null; filters: ReportFilters; i18n: ReportsI18n }) {
  const { t, language } = i18n
  const range = overview?.range ?? filters
  const fetchedAt = overview ? formatTime(overview.generatedAt, language) : ""
  return (
    <div className="flex flex-col gap-1 text-body-12 text-neutral-700 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4" data-testid="report-period">
      <span className="inline-flex items-center gap-1.5">
        <Calendar size={14} aria-hidden className="shrink-0" />
        <span>
          <span className="font-semibold text-neutral-900">{t("periodLabel")}: </span>
          {t("periodValue", { range: formatDayRange(range.from, range.to, language, { withYear: true }) })}
        </span>
      </span>
      {overview && <span>{t("periodCompare", { range: formatDayRange(overview.previousRange.from, overview.previousRange.to, language) })}</span>}
      {overview && fetchedAt && (
        <span className="inline-flex items-center gap-1">
          <Refresh size={14} aria-hidden className="shrink-0" />
          {t("freshness", { time: fetchedAt })}
          <InfoTip ariaLabel={t("freshnessInfoAria")}>{t("freshnessHint")}</InfoTip>
        </span>
      )}
    </div>
  )
}

/** The reports dashboard. Server renders the first answer; later filter changes go through the server action. */
export function ReportsView({ initial }: Props) {
  const i18n = useAttendeReportsT()
  const { t, language } = i18n
  const { state, load, reload } = useReportData(initial)
  const { filters, preset, data, error, loading } = state
  const overview = data?.overview ?? null

  const hasFilters = filters.channel !== null || filters.agentId !== null
  const reset = () => load({ ...filters, ...presetRange(30), channel: null, agentId: null }, 30)
  const blocked = error !== null && !data && isSubscriptionBlock(error)

  let body
  if (!data && error) {
    if (blocked) body = <ReportsBlocked t={t} />
    else if (error.status === 400) body = <ReportsInvalidFilters t={t} onReset={reset} />
    else body = <ReportsError t={t} onRetry={reload} code={error.reference} />
  } else if (!data) body = <ReportsSkeleton />
  else if (overview?.status?.state === "preparing") body = <ReportsPreparing t={t} />
  else if (overview && isEmptyOverview(overview)) body = hasFilters ? <ReportsFilteredEmpty t={t} onReset={reset} /> : <ReportsFirstTime t={t} />
  else if (overview) {
    const range = formatDayRange(overview.range.from, overview.range.to, language)
    const previousRange = formatDayRange(overview.previousRange.from, overview.previousRange.to, language)
    const hasPrevious = previousHasData(overview)
    const bases = reportBases(overview)
    const hidden = new Set(overview.notAvailable)
    const secondary = SECONDARY_KPIS.filter((spec) => {
      const unavailable = KPI_NOT_AVAILABLE_KEY[spec.key]
      return KPI_COPY[spec.key] && !(unavailable && hidden.has(unavailable))
    })
    const tile = (spec: KpiTileSpec, compact = false) => {
      const copy = KPI_COPY[spec.key]
      if (!copy) return null
      return (
        <KpiTile
          key={spec.key}
          compact={compact}
          spec={spec}
          kpi={overview.kpis[spec.key]}
          copy={copy}
          basis={kpiBasis(spec.key, bases, range, i18n)}
          previousRange={previousRange}
          hasPrevious={hasPrevious}
          {...i18n}
        />
      )
    }
    body = (
      <div className={cn("flex flex-col gap-6 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
        {error && (
          <p role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-error-clean px-4 py-2.5 text-body-13 text-error-darkest">
            {t("loadErrorStale")}
            <button type="button" className="font-semibold underline underline-offset-2" onClick={reload}>
              {t("retry")}
            </button>
          </p>
        )}
        <section aria-label={t("headlineAria")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {HEADLINE_KPIS.map((spec) => tile(spec))}
        </section>
        <InsightsStrip insights={deriveInsights(overview)} i18n={i18n} />
        <ActivityChart series={overview.series} i18n={i18n} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <OutcomesCard outcomes={overview.outcomes} range={range} {...i18n} />
          <HandoffReasons reasons={overview.topHandoffReasons} i18n={i18n} />
        </div>
        <div className="flex flex-col gap-3">
          <AgentsTable rows={overview.byAgent} i18n={i18n} />
          <ChannelsTable rows={overview.byChannel} i18n={i18n} />
          <TablesFootnote t={t} />
        </div>
        {secondary.length > 0 && (
          <section aria-labelledby="reports-secondary" className="flex flex-col gap-3">
            <h2 id="reports-secondary" className="text-body-16 font-semibold text-neutral-900">
              {t("secondaryTitle")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{secondary.map((spec) => tile(spec, true))}</div>
          </section>
        )}
        <NotMeasured keys={overview.notAvailable} t={t} />
        <HonestyNote t={t} />
      </div>
    )
  }

  return (
    <PageLayout
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      actions={
        <>
          {loading && (
            <span className="text-body-12 text-neutral-700" role="status">
              {t("updating")}
            </span>
          )}
          <ExportMenu overview={overview} t={t} disabled={loading} />
        </>
      }
      toolbar={
        blocked ? undefined : (
          <div className="flex flex-col gap-2.5">
            <ReportsFilters filters={filters} preset={preset} agents={data?.agents ?? []} t={t} presetRange={(days) => presetRange(days)} onChange={(next) => void load(next.filters, next.preset)} />
            <PeriodSummary overview={overview} filters={filters} i18n={i18n} />
          </div>
        )
      }
    >
      {body}
    </PageLayout>
  )
}
