"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { NODE_META, TONE_CHIP } from "components/automations/bot/botNodeMeta"
import { formatCount, formatShare, pct } from "./format"
import type { FunnelStep } from "./statsMath"
import { useStatsT } from "./useStatsT"
import { useStepNames } from "./useStepNames"
import { PremiumCard } from "../ui/PremiumCard"

const HIGHLIGHT_RATE = 0.25

function Row({ step, flagged }: { step: FunnelStep; flagged: boolean }) {
  const { t, language } = useStatsT()
  const { stepTitle, kindLabel, exitLabel } = useStepNames()
  const meta = NODE_META[step.node.kind]
  const Icon = meta.icon
  const share = pct(step.reachedShare)

  return (
    <li className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-10 text-body-12 font-semibold tabular-nums text-neutral-600"
          aria-hidden
        >
          {step.order}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", TONE_CHIP[meta.tone])}
                aria-hidden
              >
                <Icon size={13} />
              </span>
              <h3 className="min-w-0 truncate text-body-14 font-semibold text-neutral-900">
                {stepTitle(step.node, step.order)}
              </h3>
              <span className="hidden shrink-0 text-body-12 text-neutral-500 sm:inline">{kindLabel(step.node)}</span>
            </div>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-body-14 font-semibold text-neutral-900">
                {t("stepReached", { count: formatCount(step.reached, language) })}
              </span>
              <span className="text-body-12 text-neutral-500">{t("stepShareOfStarted", { pct: formatShare(step.reachedShare, language) })}</span>
            </div>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-50" role="presentation">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${share}%`, minWidth: step.reached > 0 ? 4 : 0 }}
            />
          </div>

          {step.reached === 0 ? (
            <p className="text-body-12 text-neutral-500">{t("stepNoTraffic")}</p>
          ) : step.terminal ? (
            <p className="text-body-12 text-neutral-500">{t("stepEnds")}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {step.exits.map((exit) => (
                <span
                  key={exit.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-10 px-2.5 py-1 text-body-12 text-neutral-700"
                >
                  {exitLabel(step.node, exit.id)}
                  <b className="font-semibold tabular-nums text-neutral-900">{formatCount(exit.count, language)}</b>
                  <span className="tabular-nums text-neutral-500">{formatShare(exit.share, language)}</span>
                </span>
              ))}
              {step.dropOff > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-body-12 font-medium",
                    flagged ? "bg-warning-clean text-warning-darkest" : "bg-neutral-10 text-neutral-600"
                  )}
                >
                  {flagged && <AlertTriangle size={12} aria-hidden />}
                  {t("stepDropOff", { count: formatCount(step.dropOff, language), pct: formatShare(step.dropOffRate, language) })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/** Every step in flow order with how many leads arrived and which exit they took. */
export function StepFunnel({ steps, flaggedIds }: { steps: FunnelStep[]; flaggedIds: ReadonlySet<string> }) {
  const { t } = useStatsT()
  return (
    <PremiumCard className="flex flex-col gap-4 p-5">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("funnelTitle")}</h2>
        <p className="text-body-13 text-neutral-500">{t("funnelSubtitle")}</p>
      </header>
      <ol className="flex flex-col divide-y divide-neutral-50">
        {steps.map((step) => (
          <Row
            key={step.id}
            step={step}
            flagged={flaggedIds.has(step.id) || (step.dropOffRate >= HIGHLIGHT_RATE && step.dropOff >= 5)}
          />
        ))}
      </ol>
    </PremiumCard>
  )
}
