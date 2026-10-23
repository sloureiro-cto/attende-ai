"use client"

import { SearchNormal1, Setting4, Sort } from "iconsax-react"
import { cn } from "@/lib/utils"
import type { FunnelFilterOptions } from "actions/attende/funnel"
import { formatNumber } from "lib/attende/format"
import { type FunnelColumn, type FunnelFilters, type FunnelTab, type FunnelUrlState, MAX_SEARCH_CHARS, type PageSize } from "lib/attende/funnel/model"
import { stageLabel } from "lib/attende/funnel/stageNames"
import type { FunnelStageWithCount } from "lib/attende/funnel/types"
import { Input } from "./fields"
import { ActiveFilterChips, DisplayPopover, FiltersPopover } from "./FunnelFilters"
import { Picker } from "./Picker"
import type { AttendeFunnelT, AttendeFunnelTn } from "./useAttendeFunnelT"
import { actionClass } from "../ui/actionStyles"

const TABS: FunnelTab[] = ["deals", "contacts"]

type Props = {
  state: FunnelUrlState
  searchText: string
  options: FunnelFilterOptions | null
  columns: FunnelColumn[]
  t: AttendeFunnelT
  tn: AttendeFunnelTn
  language: string
  onTab: (tab: FunnelTab) => void
  onSearch: (text: string) => void
  onFilters: (patch: Partial<FunnelFilters>) => void
  onClearFilters: () => void
  onPageSize: (size: PageSize) => void
  onMaskPhone: (mask: boolean) => void
  onColumns: (columns: FunnelColumn[]) => void
  /** Opens "Manage stages"; the entry is hidden without it (no funnel board yet). */
  onManageStages?: () => void
}

/**
 * The second row of the page bar: tabs, search, the filters popover, sort and the columns popover, then the filters
 * that are on as removable chips. Everything lives in the URL (the parent syncs it).
 */
export function FunnelToolbar({ state, searchText, options, columns, t, tn, language, onTab, onSearch, onFilters, onClearFilters, onPageSize, onMaskPhone, onColumns, onManageStages }: Props) {
  const f = state.filters
  const deals = state.tab === "deals"

  return (
    <div role="group" aria-label={t("filtersAria")} className="flex flex-col gap-2" data-testid="funnel-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label={t("tabsAria")} className="inline-flex h-9 shrink-0 gap-0.5 rounded-lg border border-neutral-50 bg-neutral-10 p-[3px]">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`funnel-tab-${tab}`}
              aria-selected={state.tab === tab}
              aria-controls="funnel-panel"
              onClick={() => onTab(tab)}
              className={cn(
                "rounded-md px-3.5 text-body-13 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                state.tab === tab ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700 hover:text-neutral-900"
              )}
            >
              {tab === "deals" ? t("tabDeals") : t("tabContacts")}
            </button>
          ))}
        </div>

        <div className="relative order-last w-full sm:order-none sm:w-72 lg:w-80">
          <SearchNormal1 size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            type="search"
            name="funnel-search"
            aria-label={t("searchAria")}
            placeholder={t("searchPlaceholder")}
            title={t("searchHint")}
            maxLength={MAX_SEARCH_CHARS}
            value={searchText}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {deals && <FiltersPopover filters={f} options={options} t={t} tn={tn} onApply={onFilters} />}

        <div className="ml-auto flex items-center gap-2">
          {deals && (
            <Picker
              variant="button"
              icon={<Sort size={16} aria-hidden />}
              label={t("sortCurrent", { value: f.sort === "updated_asc" ? t("sortOldest") : t("sortNewest") })}
              value={f.sort === "updated_asc" ? t("sortOldestShort") : t("sortNewestShort")}
              options={[
                { id: "updated_desc", label: t("sortNewest") },
                { id: "updated_asc", label: t("sortOldest") },
              ]}
              selected={f.sort}
              onSelect={(v) => onFilters({ sort: v === "updated_asc" ? "updated_asc" : "updated_desc" })}
            />
          )}
          <DisplayPopover
            deals={deals}
            columns={columns}
            pageSize={state.pageSize}
            maskPhone={state.maskPhone}
            t={t}
            language={language}
            onColumns={onColumns}
            onPageSize={onPageSize}
            onMaskPhone={onMaskPhone}
          />
          {onManageStages && (
            <button type="button" onClick={onManageStages} aria-label={t("stagesManage")} title={t("stagesManage")} className={actionClass({ variant: "secondary", size: "sm", className: "h-9" })}>
              <Setting4 size={16} aria-hidden />
              <span className="hidden sm:inline">{t("stagesManage")}</span>
            </button>
          )}
        </div>
      </div>

      {deals && <ActiveFilterChips filters={f} options={options} t={t} language={language} onRemove={onFilters} onClearAll={onClearFilters} />}
    </div>
  )
}

/** Chip counts are capped so a huge board does not stretch the row; the exact number is in the accessible name. */
const CHIP_COUNT_CAP = 9999

function StageChip({ active, onClick, label, count, ariaLabel, language }: { active: boolean; onClick: () => void; label: string; count?: number; ariaLabel: string; language: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-13 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        active ? "border-primary bg-primary-clean text-primary-dark" : "border-neutral-50 bg-white text-neutral-700 hover:bg-neutral-10 hover:text-neutral-900"
      )}
    >
      <span className="max-w-[180px] truncate">{label}</span>
      {count != null && (
        <span aria-hidden className={cn("rounded-full px-1.5 text-body-11 font-semibold tabular-nums", active ? "bg-primary-dark text-white" : "bg-neutral-10 text-neutral-700")}>
          {count > CHIP_COUNT_CAP ? `${formatNumber(CHIP_COUNT_CAP, language)}+` : formatNumber(count, language)}
        </span>
      )}
    </button>
  )
}

/** One chip per stage (with its count) above the deals table; scrolls sideways on a phone. */
export function StageChips({
  stages,
  total,
  selected,
  t,
  tn,
  language,
  onChange,
}: {
  stages: FunnelStageWithCount[]
  total: number | null
  selected: string[]
  t: AttendeFunnelT
  tn: AttendeFunnelTn
  language: string
  onChange: (stages: string[]) => void
}) {
  if (stages.length === 0) return null
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  const named = (name: string, count: number | null | undefined) => (count == null ? name : tn("stageChipOne", "stageChipOther", count, { name }))
  const all = t("stagesAll")
  return (
    <div role="group" aria-label={t("stagesAria")} title={t("countsLagHint")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <StageChip active={selected.length === 0} onClick={() => onChange([])} label={all} ariaLabel={named(all, total)} count={total ?? undefined} language={language} />
      {stages.map((s) => {
        const label = stageLabel(s, t)
        return <StageChip key={s.id} active={selected.includes(s.id)} onClick={() => toggle(s.id)} label={label} ariaLabel={named(label, s.count)} count={s.count} language={language} />
      })}
    </div>
  )
}
