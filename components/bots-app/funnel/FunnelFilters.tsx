"use client"

import { CloseCircle, Eye, RowVertical, Setting4 } from "iconsax-react"
import { type ReactNode, useId, useState } from "react"
import { cn } from "@/lib/utils"
import type { FunnelFilterOptions } from "actions/attende/funnel"
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover"
import { formatDate, formatNumber } from "lib/attende/format"
import {
  activeSecondaryFilters,
  CONVERSATION_FILTERS_AVAILABLE,
  CLEAR_SECONDARY_FILTERS,
  clearSecondaryFilter,
  FUNNEL_COLUMNS,
  type FunnelColumn,
  type FunnelFilters,
  PAGE_SIZES,
  type PageSize,
  REQUIRED_COLUMNS,
  type SecondaryFilterKey,
} from "lib/attende/funnel/model"
import { FUNNEL_CHANNELS, type FunnelChannel } from "lib/attende/funnel/types"
import { CHANNEL_KEY, COLUMN_KEY } from "./atoms"
import { IconAction, Input } from "./fields"
import { Picker, type PickerOption } from "./Picker"
import type { AttendeFunnelT, AttendeFunnelTn } from "./useAttendeFunnelT"
import { actionClass } from "../ui/actionStyles"

const ANY = "__any__"

/** Popover surface shared by the toolbar popovers: full width on a phone, a fixed width from `sm` up. */
const PANEL_CLASS =
  "z-[400] flex max-h-[min(640px,var(--radix-popover-content-available-height))] flex-col rounded-xl border border-neutral-50 bg-white p-0 text-neutral-900 shadow-[var(--bots-shadow-lift)]"

const TRIGGER_CLASS = "h-9 data-[state=open]:border-neutral-200 data-[state=open]:bg-neutral-10"

type Options = FunnelFilterOptions | null
type Named = { id: string; name: string }

/** What a selected id reads as when its name is not in the list: still loading, or gone / not readable. */
const unknownName = (options: Options, t: AttendeFunnelT) => (options ? t("optionUnavailable") : t("loading"))

/** A value from the URL must stay selectable (and readable) even when its name could not be loaded. */
function pickerOptions(list: Named[] | undefined, anyLabel: string, selected: string | null, unknown: string): PickerOption[] {
  const items: PickerOption[] = [{ id: ANY, label: anyLabel }, ...(list ?? []).map((o) => ({ id: o.id, label: o.name }))]
  if (selected && !items.some((i) => i.id === selected)) items.push({ id: selected, label: unknown })
  return items
}

const nameOf = (list: Named[] | undefined, id: string | null, unknown: string) => (id ? (list?.find((o) => o.id === id)?.name ?? unknown) : "")

/** A `YYYY-MM-DD` day of the filter, written for the language (read as a local day, never shifted by the time zone). */
function formatDay(iso: string, language: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return formatDate(new Date(y, m - 1, d), language, { day: "numeric", month: "short", year: "numeric" })
}

/** A labelled control inside the filters popover. */
function Field({ label, children }: { label: string; children: (labelId: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={id} className="text-body-12 font-medium text-neutral-700">
        {label}
      </span>
      {children(id)}
    </div>
  )
}

/** A short single choice as a segmented control (native radios, so arrows and labels work out of the box). */
function Segmented<V extends string>({ name, legend, value, options, onChange }: { name: string; legend: string; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-body-12 font-medium text-neutral-700">{legend}</legend>
      <div className="flex gap-1 rounded-lg border border-neutral-50 bg-neutral-10 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-7 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md px-2 py-1 text-center text-body-12 font-medium leading-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
              value === o.value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700 hover:text-neutral-900"
            )}
          >
            <input type="radio" name={name} className="sr-only" value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-body-13 font-semibold text-neutral-900">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

type FiltersPopoverProps = {
  filters: FunnelFilters
  options: Options
  t: AttendeFunnelT
  tn: AttendeFunnelTn
  onApply: (patch: Partial<FunnelFilters>) => void
}

/**
 * The "Filters" button and its popover. Choices are a draft until "Apply" (one reload instead of one per click);
 * closing without applying drops them. "Clear all" turns every filter of the popover off at once.
 */
export function FiltersPopover({ filters, options, t, tn, onApply }: FiltersPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FunnelFilters>(filters)
  const titleId = useId()
  const count = activeSecondaryFilters(filters).length
  const set = (patch: Partial<FunnelFilters>) => setDraft((d) => ({ ...d, ...patch }))

  const toggle = (next: boolean) => {
    if (next) setDraft(filters)
    setOpen(next)
  }
  const apply = () => {
    onApply({
      assignee: draft.assignee,
      label: draft.label,
      source: draft.source,
      channel: draft.channel,
      openConversation: draft.openConversation,
      handling: draft.handling,
      createdFrom: draft.createdFrom,
      createdTo: draft.createdTo,
    })
    setOpen(false)
  }
  const clearAll = () => {
    onApply(CLEAR_SECONDARY_FILTERS)
    setOpen(false)
  }

  const unknown = unknownName(options, t)
  const ownerOptions = pickerOptions(options?.owners, t("filterOwnerAny"), draft.assignee, unknown)
  const labelOptions = pickerOptions(options?.labels, t("filterLabelAny"), draft.label, unknown)
  const sourceOptions = pickerOptions(options?.sources, t("filterSourceAny"), draft.source, unknown)
  const channelOptions: PickerOption[] = [{ id: ANY, label: t("channelAny") }, ...FUNNEL_CHANNELS.map((c) => ({ id: c, label: t(CHANNEL_KEY[c]) }))]
  const shown = (items: PickerOption[], id: string | null) => items.find((i) => i.id === (id ?? ANY))?.label ?? ""

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? tn("filtersButtonCountOne", "filtersButtonCountOther", count) : t("filtersButton")}
          className={actionClass({ variant: "secondary", size: "sm", className: cn(TRIGGER_CLASS, count > 0 && "border-primary-dark/40") })}
        >
          <Setting4 size={16} aria-hidden />
          {t("filtersButton")}
          {count > 0 && (
            <span aria-hidden className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-dark px-1.5 text-body-11 font-semibold tabular-nums text-white">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} aria-labelledby={titleId} className={cn(PANEL_CLASS, "w-[calc(100vw-32px)] sm:w-[520px]")}>
        <div className="flex items-center justify-between gap-3 border-b border-neutral-50 py-2 pl-4 pr-2">
          <h2 id={titleId} className="text-body-14 font-semibold text-neutral-900">
            {t("filtersTitle")}
          </h2>
          <IconAction label={t("filtersClose")} onClick={() => setOpen(false)}>
            <CloseCircle size={18} aria-hidden />
          </IconAction>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4" data-testid="funnel-filters">
          <Group title={t("filterGroupDeal")}>
            <Field label={t("filterOwner")}>
              {() => (
                <Picker
                  label={t("filterOwner")}
                  value={shown(ownerOptions, draft.assignee)}
                  options={ownerOptions}
                  selected={draft.assignee ?? ANY}
                  onSelect={(v) => set({ assignee: v === ANY ? null : v })}
                />
              )}
            </Field>
            <Field label={t("filterLabel")}>
              {() => (
                <Picker
                  label={t("filterLabel")}
                  value={shown(labelOptions, draft.label)}
                  options={labelOptions}
                  selected={draft.label ?? ANY}
                  onSelect={(v) => set({ label: v === ANY ? null : v })}
                />
              )}
            </Field>
          </Group>

          <Group title={t("filterGroupOrigin")}>
            <Field label={t("filterSource")}>
              {() => (
                <Picker
                  label={t("filterSource")}
                  value={shown(sourceOptions, draft.source)}
                  options={sourceOptions}
                  selected={draft.source ?? ANY}
                  onSelect={(v) => set({ source: v === ANY ? null : v })}
                />
              )}
            </Field>
            {CONVERSATION_FILTERS_AVAILABLE && (
              <Field label={t("filterChannel")}>
                {() => (
                  <Picker
                    label={t("filterChannel")}
                    value={shown(channelOptions, draft.channel)}
                    options={channelOptions}
                    selected={draft.channel ?? ANY}
                    onSelect={(v) => set({ channel: v === ANY ? null : (v as FunnelChannel) })}
                  />
                )}
              </Field>
            )}
          </Group>

          {CONVERSATION_FILTERS_AVAILABLE && (
          <Group title={t("filterGroupConversation")}>
            <Segmented
              name="funnel-open-conversation"
              legend={t("filterConversation")}
              value={draft.openConversation}
              options={[
                { value: "any", label: t("conversationAny") },
                { value: "yes", label: t("conversationOpen") },
                { value: "no", label: t("conversationNone") },
              ]}
              onChange={(openConversation) => set({ openConversation })}
            />
            <Segmented
              name="funnel-handling"
              legend={t("filterHandling")}
              value={draft.handling}
              options={[
                { value: "any", label: t("handlingAny") },
                { value: "ai", label: t("handlingAi") },
                { value: "human", label: t("handlingHuman") },
              ]}
              onChange={(handling) => set({ handling })}
            />
          </Group>
          )}

          <Group title={t("filterDates")}>
            <Field label={t("dateFrom")}>
              {(labelId) => (
                <Input
                  type="date"
                  name="funnel-from"
                  aria-labelledby={labelId}
                  value={draft.createdFrom ?? ""}
                  max={draft.createdTo ?? undefined}
                  onChange={(e) => set({ createdFrom: e.target.value || null })}
                />
              )}
            </Field>
            <Field label={t("dateTo")}>
              {(labelId) => (
                <Input
                  type="date"
                  name="funnel-to"
                  aria-labelledby={labelId}
                  value={draft.createdTo ?? ""}
                  min={draft.createdFrom ?? undefined}
                  onChange={(e) => set({ createdTo: e.target.value || null })}
                />
              )}
            </Field>
          </Group>

          {options?.failed && <p className="text-body-12 text-neutral-700">{t("filtersOptionsError")}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-50 px-4 py-3">
          <button type="button" onClick={clearAll} className={actionClass({ variant: "ghost", size: "sm" })}>
            {t("filtersClearAll")}
          </button>
          <button type="button" onClick={apply} className={actionClass({ variant: "primary", size: "sm", className: "min-w-24" })}>
            {t("filtersApply")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

type ChipsProps = {
  filters: FunnelFilters
  options: Options
  t: AttendeFunnelT
  language: string
  onRemove: (patch: Partial<FunnelFilters>) => void
  onClearAll: () => void
}

/** The popover's filters that are on, as removable chips under the toolbar. Renders nothing when none is on. */
export function ActiveFilterChips({ filters: f, options, t, language, onRemove, onClearAll }: ChipsProps) {
  const on = activeSecondaryFilters(f)
  if (on.length === 0) return null
  const unknown = unknownName(options, t)

  const describe = (key: SecondaryFilterKey): [string, string] => {
    switch (key) {
      case "assignee":
        return [t("filterOwner"), nameOf(options?.owners, f.assignee, unknown)]
      case "label":
        return [t("filterLabel"), nameOf(options?.labels, f.label, unknown)]
      case "source":
        return [t("filterSource"), nameOf(options?.sources, f.source, unknown)]
      case "channel":
        return [t("filterChannel"), f.channel ? t(CHANNEL_KEY[f.channel]) : ""]
      case "openConversation":
        return [t("filterConversation"), f.openConversation === "yes" ? t("conversationOpen") : t("conversationNone")]
      case "handling":
        return [t("filterHandling"), f.handling === "ai" ? t("handlingAi") : t("handlingHuman")]
      case "created": {
        const from = f.createdFrom ? formatDay(f.createdFrom, language) : null
        const to = f.createdTo ? formatDay(f.createdTo, language) : null
        return [t("filterDates"), from && to ? t("dateRange", { from, to }) : from ? t("dateSince", { date: from }) : t("dateUntil", { date: to ?? "" })]
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <ul aria-label={t("activeFiltersAria")} className="flex flex-wrap items-center gap-2" data-testid="funnel-active-filters">
        {on.map((key) => {
          const [name, value] = describe(key)
          const text = t("chipValue", { name, value })
          return (
            <li key={key} className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-neutral-50 bg-neutral-10 pl-3 pr-1 text-body-12 text-neutral-700">
              <span className="truncate">
                {name}: <span className="font-semibold text-neutral-900">{value}</span>
              </span>
              <button
                type="button"
                aria-label={t("removeFilter", { name: text })}
                title={t("removeFilter", { name: text })}
                onClick={() => onRemove(clearSecondaryFilter(key))}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <CloseCircle size={14} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={onClearAll} className={actionClass({ variant: "ghost", size: "sm" })}>
        {t("filtersClearAll")}
      </button>
    </div>
  )
}

type DisplayProps = {
  /** Deals show the column choices; contacts only the page size and the phone mask. */
  deals: boolean
  columns: FunnelColumn[]
  pageSize: PageSize
  maskPhone: boolean
  t: AttendeFunnelT
  language: string
  onColumns: (columns: FunnelColumn[]) => void
  onPageSize: (size: PageSize) => void
  onMaskPhone: (mask: boolean) => void
}

const CHECK_ROW = "flex h-9 items-center gap-2.5 rounded-lg px-2 text-body-13 text-neutral-900"

/** "Columns" (deals) or "Display" (contacts): which columns show, rows per load and the phone mask. Applies live. */
export function DisplayPopover({ deals, columns, pageSize, maskPhone, t, language, onColumns, onPageSize, onMaskPhone }: DisplayProps) {
  const titleId = useId()
  const title = deals ? t("columnsMenu") : t("viewMenu")
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={deals ? t("columnsAria") : t("viewMenu")} className={actionClass({ variant: "secondary", size: "sm", className: TRIGGER_CLASS })}>
          {deals ? <RowVertical size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          {title}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} aria-labelledby={titleId} className={cn(PANEL_CLASS, "w-[calc(100vw-32px)] sm:w-72")}>
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3" data-testid="funnel-display">
          {deals && (
            <fieldset className="flex flex-col">
              <legend className="px-2 pb-1 text-body-12 font-semibold text-neutral-700">{t("columnsLegend")}</legend>
              {FUNNEL_COLUMNS.map((c) => {
                const required = REQUIRED_COLUMNS.includes(c)
                return (
                  <label key={c} className={cn(CHECK_ROW, required ? "opacity-60" : "cursor-pointer hover:bg-neutral-10")}>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={columns.includes(c)}
                      disabled={required}
                      onChange={(e) => onColumns(e.target.checked ? FUNNEL_COLUMNS.filter((k) => k === c || columns.includes(k)) : columns.filter((k) => k !== c))}
                    />
                    {t(COLUMN_KEY[c])}
                  </label>
                )
              })}
            </fieldset>
          )}
          <div className={cn("px-2", deals && "border-t border-neutral-50 pt-3")}>
            <Segmented
              name="funnel-page-size"
              legend={t("pageSizeAria")}
              value={String(pageSize)}
              options={PAGE_SIZES.map((s) => ({ value: String(s), label: formatNumber(s, language) }))}
              onChange={(v) => onPageSize(Number(v) as PageSize)}
            />
          </div>
          <fieldset className="flex flex-col border-t border-neutral-50 pt-3">
            <legend className="sr-only">{t("privacyLegend")}</legend>
            <label className={cn(CHECK_ROW, "cursor-pointer hover:bg-neutral-10")}>
              <input type="checkbox" className="size-4 accent-primary" checked={maskPhone} onChange={(e) => onMaskPhone(e.target.checked)} />
              {t("maskPhones")}
            </label>
          </fieldset>
        </div>
      </PopoverContent>
    </Popover>
  )
}
