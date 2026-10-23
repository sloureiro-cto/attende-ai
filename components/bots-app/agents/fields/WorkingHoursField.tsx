"use client"

import { cn } from "@/lib/utils"
import { applyPreset, applyToAllOpenDays, browserTimezone, DAY_ORDER, dayWindow, detectPreset, type HoursPreset, isDayOpen, setDayTime, summarizeHours, toggleDay } from "lib/attende/agents/hours"
import { DAY_LABELS } from "lib/attende/agents/samples"
import type { AgentLanguage, WorkingHours } from "lib/attende/agents/types"
import { chipClass, controlClass } from "./classes"
import type { AttendeAgentsT } from "../useAttendeAgentsT"

type Props = {
  path: string
  value: WorkingHours
  onChange: (next: WorkingHours) => void
  language: AgentLanguage
  t: AttendeAgentsT
  invalid?: boolean
}

const PRESETS: Array<{ key: HoursPreset; label: "hoursPresetBusiness" | "hoursPresetAlways" | "hoursPresetCustom" }> = [
  { key: "business", label: "hoursPresetBusiness" },
  { key: "always", label: "hoursPresetAlways" },
  { key: "custom", label: "hoursPresetCustom" },
]

/** Weekly hours: three presets and, for "Custom", one row per weekday with open/close times. `null` = always on (24/7). */
export function WorkingHoursField({ value, onChange, language, t, invalid }: Props) {
  const labels = DAY_LABELS[language]
  const active = detectPreset(value)
  const timezone = value?.timezone ?? browserTimezone()

  const choose = (preset: HoursPreset) => {
    if (preset === "custom") {
      // Start from the business-hours schedule so the grid is never empty, and make every day editable.
      onChange(value ?? applyPreset("business", timezone))
      return
    }
    onChange(applyPreset(preset, timezone))
  }

  // Every schedule except 24/7 is editable day by day; the presets are just starting points.
  const showGrid = value !== null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("summaryHours")}>
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active === key}
            onClick={() => choose(key)}
            className={cn(chipClass, active === key ? "border-primary bg-primary-clean font-semibold text-primary-darkest" : "border-neutral-border bg-white text-neutral-700 hover:border-primary-lighter")}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {value !== null && <p className="text-body-13 font-medium text-neutral-800">{summarizeHours(value, labels, t("hoursPresetAlways"))}</p>}

      {showGrid && value && (
        <div className={cn("flex flex-col gap-2 rounded-2xl border bg-neutral-10/60 p-3", invalid ? "border-error" : "border-neutral-border")}>
          {DAY_ORDER.map((day) => {
            const open = isDayOpen(value, day)
            const window = dayWindow(value, day)
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <label className="flex min-h-11 w-28 shrink-0 cursor-pointer items-center gap-2.5 text-body-14 font-medium text-neutral-800">
                  <input
                    type="checkbox"
                    checked={open}
                    onChange={() => onChange(toggleDay(value, day, timezone))}
                    aria-label={t("hoursDayToggle", { day: labels[day] ?? "" })}
                    className="size-5 rounded border-neutral-100 accent-[rgb(var(--color-primary,69_173_126))]"
                  />
                  {labels[day]}
                </label>
                {open && window ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={window.open}
                      aria-label={t("hoursOpenOn", { day: labels[day] ?? "" })}
                      onChange={(e) => onChange(setDayTime(value, day, { open: e.target.value }))}
                      className={cn(controlClass, "w-32 py-2")}
                    />
                    <span className="text-body-13 text-neutral-400" aria-hidden>
                      –
                    </span>
                    <input
                      type="time"
                      value={window.close}
                      aria-label={t("hoursCloseOn", { day: labels[day] ?? "" })}
                      onChange={(e) => onChange(setDayTime(value, day, { close: e.target.value }))}
                      className={cn(controlClass, "w-32 py-2")}
                    />
                    <button type="button" onClick={() => onChange(applyToAllOpenDays(value, day))} className="hidden text-body-12 font-medium text-primary-dark underline-offset-2 hover:underline sm:inline">
                      {t("hoursApplyAll")}
                    </button>
                  </div>
                ) : (
                  <span className="text-body-13 text-neutral-500">{t("hoursClosed")}</span>
                )}
              </div>
            )
          })}
          <p className="pt-1 text-body-12 text-neutral-600">{value.timezone === browserTimezone() ? t("hoursTimezoneBrowser", { zone: value.timezone }) : t("hoursTimezoneValue", { zone: value.timezone })}</p>
        </div>
      )}

      <p className="rounded-xl bg-neutral-10 px-3.5 py-3 text-body-13 text-neutral-700">{t("hoursTeamNote")}</p>
    </div>
  )
}
