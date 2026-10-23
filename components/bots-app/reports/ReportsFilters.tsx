"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { BotSelect } from "components/automations/bot/BotSelect"
import TextInput from "components/TextInput/TextInput"
import { daysBetween, DEFAULT_PRESET, isDay, MAX_RANGE_DAYS, REPORT_PRESETS, type ReportPreset, toDay } from "lib/attende/reports/model"
import { type AgentBreakdownRow, REPORT_CHANNELS, type ReportChannel, type ReportFilters } from "lib/attende/reports/types"
import { agentDisplayName, CHANNEL_LABEL } from "./BreakdownTables"
import type { AttendeReportsT } from "./useAttendeReportsT"
import { actionClass } from "../ui/actionStyles"

const ALL = "__all__"
const PRESET_KEY = { 7: "range7", 30: "range30", 90: "range90" } as const

export type FiltersChange = { filters: ReportFilters; preset: ReportPreset }

type Props = {
  filters: ReportFilters
  preset: ReportPreset
  agents: AgentBreakdownRow[]
  t: AttendeReportsT
  disabled?: boolean
  /** Window start for "today" (tests pass a fixed clock). */
  now?: Date
  presetRange: (days: number) => { from: string; to: string }
  onChange: (next: FiltersChange) => void
}

export function ReportsFilters({ filters, preset, agents, t, disabled = false, now = new Date(), presetRange, onChange }: Props) {
  const [custom, setCustom] = useState(preset === "custom")
  const [from, setFrom] = useState(filters.from)
  const [to, setTo] = useState(filters.to)
  const [error, setError] = useState<string | null>(null)
  const today = toDay(now)

  const dirty = preset !== DEFAULT_PRESET || filters.channel !== null || filters.agentId !== null

  const choosePreset = (days: number) => {
    setCustom(false)
    setError(null)
    onChange({ filters: { ...filters, ...presetRange(days) }, preset: days as ReportPreset })
  }

  const applyCustom = () => {
    if (!isDay(from) || !isDay(to) || from > to || to > today) return setError(t("rangeInvalid"))
    if (daysBetween(from, to) > MAX_RANGE_DAYS) return setError(t("rangeTooLong"))
    setError(null)
    onChange({ filters: { ...filters, from, to }, preset: "custom" })
  }

  const agentItems = [
    { value: ALL, displayName: t("agentAll") },
    ...agents.filter((a) => a.agentId !== null).map((a) => ({ value: a.agentId as string, displayName: agentDisplayName(a, t) })),
    { value: "none", displayName: t("agentNone") },
  ]
  // The selected agent must stay selectable even when the current window no longer lists it.
  if (filters.agentId && !agentItems.some((i) => i.value === filters.agentId)) agentItems.splice(1, 0, { value: filters.agentId, displayName: t("agentUnnamed") })

  return (
    <div role="group" aria-label={t("filtersAria")} className="flex flex-col gap-3" data-testid="report-filters">
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <div role="group" aria-label={t("rangeAria")} className="col-span-2 inline-flex gap-0.5 overflow-x-auto rounded-lg border border-neutral-50 bg-neutral-10 p-1 sm:col-span-1">
          {REPORT_PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              disabled={disabled}
              aria-pressed={!custom && preset === days}
              onClick={() => choosePreset(days)}
              className={cn(
                "h-8 flex-1 whitespace-nowrap rounded-md px-3 text-body-13 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 sm:flex-none",
                !custom && preset === days ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700 hover:text-neutral-900"
              )}
            >
              {t(PRESET_KEY[days])}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            aria-pressed={custom || preset === "custom"}
            aria-expanded={custom}
            onClick={() => setCustom((v) => !v)}
            className={cn(
              "h-8 flex-1 whitespace-nowrap rounded-md px-3 text-body-13 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 sm:flex-none",
              custom || preset === "custom" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700 hover:text-neutral-900"
            )}
          >
            {t("rangeCustom")}
          </button>
        </div>

        <div className="min-w-0 sm:w-44">
          <BotSelect
            aria-label={t("channelAria")}
            value={filters.channel ?? ALL}
            disabled={disabled}
            items={[{ value: ALL, displayName: t("channelAll") }, ...REPORT_CHANNELS.map((c) => ({ value: c, displayName: t(CHANNEL_LABEL[c]) }))]}
            onValueChange={(v: string) => onChange({ filters: { ...filters, channel: v === ALL ? null : (v as ReportChannel) }, preset })}
          />
        </div>
        <div className="min-w-0 sm:w-56">
          <BotSelect
            aria-label={t("agentAria")}
            value={filters.agentId ?? ALL}
            disabled={disabled}
            items={agentItems}
            onValueChange={(v: string) => onChange({ filters: { ...filters, agentId: v === ALL ? null : v }, preset })}
          />
        </div>

        {dirty && (
          <button
            type="button"
            className={actionClass({ variant: "ghost", size: "sm", className: "col-span-2 justify-self-start sm:col-span-1" })}
            disabled={disabled}
            onClick={() => {
              setCustom(false)
              setError(null)
              onChange({ filters: { ...filters, ...presetRange(DEFAULT_PRESET), channel: null, agentId: null }, preset: DEFAULT_PRESET })
            }}
          >
            {t("resetFilters")}
          </button>
        )}
      </div>

      {custom && (
        <div className="flex flex-wrap items-end gap-3 rounded-[12px] border border-neutral-50 bg-neutral-10 p-3">
          <div className="w-full min-[400px]:w-40">
            <TextInput size="small" type="date" name="report-from" label={t("rangeFrom")} aria-label={t("rangeFrom")} value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-full min-[400px]:w-40">
            <TextInput size="small" type="date" name="report-to" label={t("rangeTo")} aria-label={t("rangeTo")} value={to} max={today} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="button" className={actionClass({ size: "sm" })} disabled={disabled} onClick={applyCustom}>
            {t("rangeApply")}
          </button>
          {error && (
            <p role="alert" className="basis-full text-body-12 text-error-dark">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
