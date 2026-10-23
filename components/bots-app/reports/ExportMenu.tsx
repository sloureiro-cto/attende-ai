"use client"

import { DocumentDownload } from "iconsax-react"
import { MenuContent, MenuItem } from "components/automations/ui/Menu"
import { Dropdown, DropdownTrigger } from "components/ui/dropdown-menu"
import { agentsCsv, channelsCsv, dailyCsv, exportFileName, outcomesCsv } from "lib/attende/reports/exports"
import type { OverviewResponse } from "lib/attende/reports/types"
import type { AttendeReportsKey } from "lib/i18n/translations/attende/reports"
import { CHANNEL_LABEL } from "./BreakdownTables"
import { OUTCOME_LABEL } from "./OutcomesCard"
import type { AttendeReportsT } from "./useAttendeReportsT"
import { actionClass } from "../ui/actionStyles"

/** Saves text as a file in the browser (no server round trip: the numbers are already on the page). */
export function downloadCsv(name: string, content: string): void {
  // A leading BOM makes Excel read UTF-8 (accents in agent names) correctly.
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** CSV of the tables the user is looking at, built client-side from the loaded overview. */
export function ExportMenu({ overview, t, disabled }: { overview: OverviewResponse | null; t: AttendeReportsT; disabled?: boolean }) {
  const label = (key: string) => t(key as AttendeReportsKey)
  const { from, to } = overview?.range ?? { from: "", to: "" }

  const items = overview
    ? [
        { id: "daily", key: "exportDaily", run: () => downloadCsv(exportFileName("daily", from, to), dailyCsv(overview.series, label)) },
        { id: "agents", key: "exportAgents", run: () => downloadCsv(exportFileName("agents", from, to), agentsCsv(overview.byAgent, label, t("agentNone"))) },
        { id: "channels", key: "exportChannels", run: () => downloadCsv(exportFileName("channels", from, to), channelsCsv(overview.byChannel, label, (c) => t(CHANNEL_LABEL[c]))) },
        { id: "outcomes", key: "exportOutcomes", run: () => downloadCsv(exportFileName("outcomes", from, to), outcomesCsv(overview.outcomes, label, (o) => (o in OUTCOME_LABEL ? t(OUTCOME_LABEL[o as keyof typeof OUTCOME_LABEL]) : o))) },
      ]
    : []

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} disabled={disabled || !overview} aria-label={t("exportMenuAria")}>
          <DocumentDownload size={16} aria-hidden />
          {t("exportCsv")}
        </button>
      </DropdownTrigger>
      <MenuContent align="end">
        {items.map((item) => (
          <MenuItem key={item.id} onSelect={item.run}>
            {t(item.key as AttendeReportsKey)}
          </MenuItem>
        ))}
      </MenuContent>
    </Dropdown>
  )
}
