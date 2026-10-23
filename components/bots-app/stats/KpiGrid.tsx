"use client"

import { AlertTriangle, CheckCircle2, CircleStop, Clock, type LucideIcon, Play, Target, UserRound } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatCount, formatShare } from "./format"
import type { StatsKpis } from "./statsMath"
import { useStatsT } from "./useStatsT"
import { PremiumCard } from "../ui/PremiumCard"

type Tone = "neutral" | "primary" | "info" | "warning" | "error"

const TONE: Record<Tone, string> = {
  neutral: "bg-neutral-10 text-neutral-600",
  primary: "bg-primary-clean text-primary-dark",
  info: "bg-info-clean text-info-darkest",
  warning: "bg-warning-clean text-warning-darkest",
  error: "bg-error-clean text-error-darkest",
}

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: ReactNode
  hint: string
  icon: LucideIcon
  tone: Tone
}) {
  return (
    <PremiumCard className="flex items-start justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-body-12 font-medium text-neutral-500">{label}</span>
        <span className="text-[26px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">
          {value}
        </span>
        <span className="text-body-12 text-neutral-500">{hint}</span>
      </div>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", TONE[tone])} aria-hidden>
        <Icon size={18} />
      </span>
    </PremiumCard>
  )
}

/** The headline numbers. Every status tile carries an icon and a label, so no meaning rides on color alone. */
export function KpiGrid({ kpis }: { kpis: StatsKpis }) {
  const { t, language } = useStatsT()
  const n = (v: number) => formatCount(v, language)
  // Every percentage carries its base ("40% of 10 started"), never a bare share.
  const share = (part: number) => formatShare(kpis.started > 0 ? part / kpis.started : 0, language)
  const started = n(kpis.started)
  return (
    <section aria-label={t("title")} className="grid grid-cols-[repeat(auto-fit,minmax(168px,1fr))] gap-3">
      <Tile label={t("kpiStarted")} value={n(kpis.started)} hint={t("kpiStartedHint")} icon={Play} tone="info" />
      <Tile
        label={t("kpiCompleted")}
        value={n(kpis.completed)}
        hint={kpis.started > 0 ? t("kpiCompletedHint", { pct: share(kpis.completed), started }) : t("kpiNoBase")}
        icon={CheckCircle2}
        tone="primary"
      />
      <Tile
        label={t("kpiHandedOff")}
        value={n(kpis.handedOff)}
        hint={kpis.started > 0 ? t("kpiHandedOffHint", { pct: share(kpis.handedOff), started }) : t("kpiNoBase")}
        icon={UserRound}
        tone="primary"
      />
      <Tile
        label={t("kpiSuccess")}
        value={kpis.started > 0 ? formatShare(kpis.successRate, language) : "–"}
        hint={kpis.started > 0 ? t("kpiSuccessHint", { count: n(kpis.completed + kpis.handedOff), started }) : t("kpiNoBase")}
        icon={Target}
        tone="primary"
      />
      <Tile
        label={t("kpiStopped")}
        value={n(kpis.stopped)}
        hint={t("kpiStoppedHint")}
        icon={CircleStop}
        tone="neutral"
      />
      <Tile
        label={t("kpiFailed")}
        value={n(kpis.failed)}
        hint={t("kpiFailedHint")}
        icon={AlertTriangle}
        tone={kpis.failed > 0 ? "error" : "neutral"}
      />
      {kpis.inProgress > 0 && (
        <Tile
          label={t("kpiInProgress")}
          value={n(kpis.inProgress)}
          hint={t("kpiInProgressHint")}
          icon={Clock}
          tone="warning"
        />
      )}
    </section>
  )
}
