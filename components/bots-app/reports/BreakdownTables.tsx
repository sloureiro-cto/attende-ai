"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatCount, formatDuration, formatShare } from "lib/attende/reports/model"
import type { AgentBreakdownRow, ChannelBreakdownRow, HandoffReasonCount } from "lib/attende/reports/types"
import type { AttendeReportsT, ReportsI18n } from "./useAttendeReportsT"
import { PremiumCard } from "../ui/PremiumCard"

export const CHANNEL_LABEL = { whatsapp: "channelWhatsapp", instagram: "channelInstagram", sms: "channelSms" } as const

function Th({ children, align = "right", className }: { children: string; align?: "left" | "right"; className?: string }) {
  return (
    <th scope="col" className={cn("px-3 py-2 font-medium", align === "left" ? "text-left" : "text-right", className)}>
      {children}
    </th>
  )
}

/** The row header stays visible while a wide table scrolls sideways on a phone. */
const STICKY_CELL = "sticky left-0 z-[1] bg-white"

export const agentDisplayName = (row: AgentBreakdownRow, t: AttendeReportsT): string => (row.agentId === null ? t("agentNone") : (row.name ?? t("agentUnnamed")))

/** A table cell for a value that can be missing: "No data" in words, never 0 or a lone dash. */
function Value({ text, i18n, title }: { text: string | null; i18n: ReportsI18n; title?: string }) {
  if (text === null) return <span className="text-neutral-500">{i18n.t("noData")}</span>
  return <span title={title}>{text}</span>
}

/**
 * Handoff share of a row with its numerator and denominator. The backend's rate is handed_off / conversations, so
 * rate x conversations gives the whole count back; it is shown as a tooltip and to screen readers.
 */
function HandoffCell({ rate, conversations, i18n }: { rate: number | null; conversations: number; i18n: ReportsI18n }) {
  const text = formatShare(rate, i18n.language)
  if (text === null) return <Value text={null} i18n={i18n} />
  const detail = i18n.tp("rowShare", conversations, { part: formatCount(Math.round((rate ?? 0) * conversations), i18n.language) ?? "" })
  return (
    <span title={detail}>
      {text}
      <span className="sr-only"> ({detail})</span>
    </span>
  )
}

function TableCard({ title, hint, testId, children }: { title: string; hint?: string; testId: string; children: ReactNode }) {
  return (
    <PremiumCard className="flex min-w-0 flex-col gap-3 p-4 sm:p-5" data-testid={testId}>
      <div className="flex flex-col gap-1">
        <h2 className="text-body-16 font-semibold text-neutral-900">{title}</h2>
        {hint && <p className="text-body-13 text-neutral-700">{hint}</p>}
      </div>
      {children}
    </PremiumCard>
  )
}

/** One row per AI agent, plus one for everything that is not attributable to an AI agent. */
export function AgentsTable({ rows, i18n }: { rows: AgentBreakdownRow[]; i18n: ReportsI18n }) {
  const { t, language } = i18n
  return (
    <TableCard title={t("agentsTitle")} hint={t("agentsHint")} testId="agents-table">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-body-13 text-neutral-700">{t("agentsEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-50" role="region" aria-label={t("agentsTitle")} tabIndex={0}>
          <table className="w-full min-w-[720px] text-body-13 tabular-nums">
            <thead className="bg-neutral-10 text-body-12 text-neutral-700">
              <tr>
                <Th align="left" className={cn(STICKY_CELL, "bg-neutral-10")}>
                  {t("colAgent")}
                </Th>
                <Th>{t("colConversations")}</Th>
                <Th>{t("colAiReplies")}</Th>
                <Th>{t("colHandoff")}</Th>
                <Th>{t("colResolution")}</Th>
                <Th>{t("colFirstResponse")}</Th>
                <Th>{t("colLeads")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.agentId ?? "none"} className="border-t border-neutral-50 text-neutral-900">
                  <th scope="row" className={cn(STICKY_CELL, "max-w-[200px] truncate px-3 py-2 text-left font-medium")} title={agentDisplayName(r, t)}>
                    {/* Agent names are user content: never translated. */}
                    {agentDisplayName(r, t)}
                  </th>
                  <td className="px-3 py-2 text-right">{formatCount(r.conversations, language)}</td>
                  <td className="px-3 py-2 text-right">{formatCount(r.aiReplies, language)}</td>
                  <td className="px-3 py-2 text-right">
                    <HandoffCell rate={r.handoffRate} conversations={r.conversations} i18n={i18n} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Value text={formatShare(r.aiResolutionRate, language)} i18n={i18n} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Value text={formatDuration(r.firstResponseAiMedianMs, language)} i18n={i18n} />
                  </td>
                  <td className="px-3 py-2 text-right">{formatCount(r.leadsCreated, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableCard>
  )
}

export function ChannelsTable({ rows, i18n }: { rows: ChannelBreakdownRow[]; i18n: ReportsI18n }) {
  const { t, language } = i18n
  if (rows.length === 0) return null
  return (
    <TableCard title={t("channelsTitle")} testId="channels-table">
      <div className="overflow-x-auto rounded-lg border border-neutral-50" role="region" aria-label={t("channelsTitle")} tabIndex={0}>
        <table className="w-full min-w-[640px] text-body-13 tabular-nums">
          <thead className="bg-neutral-10 text-body-12 text-neutral-700">
            <tr>
              <Th align="left" className={cn(STICKY_CELL, "bg-neutral-10")}>
                {t("colChannel")}
              </Th>
              <Th>{t("colConversations")}</Th>
              <Th>{t("colCustomerMessages")}</Th>
              <Th>{t("colAiReplies")}</Th>
              <Th>{t("colTeamReplies")}</Th>
              <Th>{t("colHandoff")}</Th>
              <Th>{t("colResolution")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.channel} className="border-t border-neutral-50 text-neutral-900">
                <th scope="row" className={cn(STICKY_CELL, "px-3 py-2 text-left font-medium")}>
                  {t(CHANNEL_LABEL[r.channel])}
                </th>
                <td className="px-3 py-2 text-right">{formatCount(r.conversations, language)}</td>
                <td className="px-3 py-2 text-right">{formatCount(r.inboundMessages, language)}</td>
                <td className="px-3 py-2 text-right">{formatCount(r.aiReplies, language)}</td>
                <td className="px-3 py-2 text-right">{formatCount(r.humanReplies, language)}</td>
                <td className="px-3 py-2 text-right">
                  <HandoffCell rate={r.handoffRate} conversations={r.conversations} i18n={i18n} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Value text={formatShare(r.aiResolutionRate, language)} i18n={i18n} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableCard>
  )
}

export function TablesFootnote({ t }: { t: AttendeReportsT }) {
  return <p className="text-body-12 leading-relaxed text-neutral-700">{t("tablesFootnote")}</p>
}

export function HandoffReasons({ reasons, i18n }: { reasons: HandoffReasonCount[]; i18n: ReportsI18n }) {
  const { t, tp } = i18n
  const max = reasons.reduce((m, r) => Math.max(m, r.count), 0)
  return (
    <TableCard title={t("reasonsTitle")} hint={t("reasonsHint")} testId="handoff-reasons">
      {reasons.length === 0 ? (
        <p className="py-4 text-center text-body-13 text-neutral-700">{t("reasonsEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {reasons.map((r) => (
            <li key={r.reason} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-body-13">
                {/* Free text written by rules and people: rendered as text only, never as markup, never translated. */}
                <span className="min-w-0 truncate text-neutral-900" title={r.reason}>
                  {r.reason}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-700">{tp("reasonCount", r.count)}</span>
              </div>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-10" aria-hidden>
                <span className="block h-full rounded-full bg-[#4A8FD6] dark:bg-[#5497DA]" style={{ width: `${max > 0 ? (r.count / max) * 100 : 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </TableCard>
  )
}
