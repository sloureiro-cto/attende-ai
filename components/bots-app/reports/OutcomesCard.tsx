"use client"

import { cn } from "@/lib/utils"
import { outcomeSegments } from "lib/attende/reports/chartMath"
import { formatCount, formatShare } from "lib/attende/reports/model"
import type { ConversationOutcome, OutcomesDistribution } from "lib/attende/reports/types"
import type { AttendeReportsKey } from "lib/i18n/translations/attende/reports"
import type { ReportsI18n } from "./useAttendeReportsT"
import { PremiumCard } from "../ui/PremiumCard"

export const OUTCOME_LABEL: Record<ConversationOutcome, AttendeReportsKey> = {
  resolved_by_ai: "outcomeResolvedByAi",
  handed_off: "outcomeHandedOff",
  human_handled: "outcomeHumanHandled",
  abandoned: "outcomeAbandoned",
  open: "outcomeOpen",
}

/** How each outcome is decided (backend `classifyConversation`, evaluated in this order: handed off, open, human, AI, rest). */
const OUTCOME_DEFINITION: Record<ConversationOutcome, AttendeReportsKey> = {
  resolved_by_ai: "outcomeDefResolvedByAi",
  handed_off: "outcomeDefHandedOff",
  human_handled: "outcomeDefHumanHandled",
  abandoned: "outcomeDefAbandoned",
  open: "outcomeDefOpen",
}

/** Each outcome has a colour AND a row with its name, definition and numbers, so the bar is never the only carrier of meaning. */
const SWATCH: Record<ConversationOutcome, string> = {
  resolved_by_ai: "bg-[#2F9E6D] dark:bg-[#389A6E]",
  handed_off: "bg-[#4A8FD6] dark:bg-[#5497DA]",
  human_handled: "bg-[#7C5CD6] dark:bg-[#9C86E0]",
  abandoned: "bg-[#C98A1B] dark:bg-[#D9A13C]",
  open: "bg-neutral-300",
}

type Props = ReportsI18n & { outcomes: OutcomesDistribution; range: string }

export function OutcomesCard({ outcomes, range, t, tp, language }: Props) {
  const segments = outcomeSegments(outcomes.items)
  const byOutcome = new Map(outcomes.items.map((i) => [i.outcome, i]))
  const rows = (Object.keys(OUTCOME_LABEL) as ConversationOutcome[]).map((o) => ({ outcome: o, count: byOutcome.get(o)?.count ?? 0 }))

  return (
    <PremiumCard className="flex min-w-0 flex-col gap-4 p-4 sm:p-5" data-testid="outcomes-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("outcomesTitle")}</h2>
        {outcomes.total > 0 && <p className="text-body-13 text-neutral-700">{tp("outcomesSubtitle", outcomes.total, { range })}</p>}
      </div>
      {segments.length === 0 ? (
        <p className="py-6 text-center text-body-13 text-neutral-700">{t("outcomesEmpty")}</p>
      ) : (
        <>
          <div role="img" aria-label={t("outcomesAria")} className="flex h-3.5 w-full overflow-hidden rounded-full bg-neutral-10">
            {segments.map((s) => (
              <span key={s.outcome} className={cn("h-full", SWATCH[s.outcome as ConversationOutcome])} style={{ width: `${s.share * 100}%` }} />
            ))}
          </div>
          <ul className="flex flex-col gap-2.5">
            {rows.map(({ outcome, count }) => (
              <li key={outcome} className="flex items-start justify-between gap-3 text-body-13" data-testid={`outcome-${outcome}`}>
                <span className="flex min-w-0 items-start gap-2">
                  <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", SWATCH[outcome])} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium text-neutral-900">{t(OUTCOME_LABEL[outcome])}</span>
                    <span className="text-body-12 text-neutral-700">{t(OUTCOME_DEFINITION[outcome])}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums text-neutral-900">
                  <span className="font-medium">{formatCount(count, language)}</span>
                  <span className="ml-2 text-neutral-700">{formatShare(count / outcomes.total, language)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </PremiumCard>
  )
}
