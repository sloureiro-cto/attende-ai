"use client"

import { SearchNormal1, Setting4, TickCircle } from "iconsax-react"
import { useId } from "react"
import { cn } from "@/lib/utils"
import { Dropdown, DropdownTrigger } from "components/ui/dropdown-menu"
import { formatNumber } from "lib/attende/format"
import type { InboxFilters as Filters, InboxChannel, InboxFilter } from "lib/bots-app/inbox/model"
import type { AttendeInboxKey } from "lib/i18n/translations/attende/inbox"
import { type AttendeInboxT, countLabel } from "./useAttendeInboxT"
import { MenuContent, MenuItem } from "../ui/Menu"

/** The queue, as tabs: everything, unread, and the ones waiting on the team. Each criterion is spelled out. */
const TABS: Array<{ id: InboxFilter; key: AttendeInboxKey; help?: AttendeInboxKey }> = [
  { id: "all", key: "filterAll" },
  { id: "unread", key: "filterUnread", help: "filterUnreadHelp" },
  { id: "needs_reply", key: "filterWaitingTeam", help: "filterWaitingTeamHelp" },
]

/** Handling (by conversation phase, the only handling filter the API has): behind the filter button, with the channel. */
const HANDLING: Array<{ id: InboxFilter; key: AttendeInboxKey; help: AttendeInboxKey }> = [
  { id: "ai", key: "filterAi", help: "filterAiHelp" },
  { id: "human", key: "filterHuman", help: "filterHumanHelp" },
]

const CHANNELS: Array<{ id: InboxChannel; key: AttendeInboxKey }> = [
  { id: "whatsapp", key: "channelWhatsapp" },
  { id: "instagram", key: "channelInstagram" },
  { id: "sms", key: "channelSms" },
]

export type QueueCounts = { unread: number; needsReply: number }

type Props = {
  filters: Filters
  /** Server counts over every conversation the user can access; `null` when unknown (never shown as 0). */
  counts: QueueCounts | null
  live: boolean
  language: string
  t: AttendeInboxT
  onChange: (next: Partial<Filters>) => void
}

const shortCount = (n: number, language: string) => (n > 99 ? `${formatNumber(99, language)}+` : formatNumber(n, language))

/** Title, search, the filter menu and the queue tabs. All filtering is done by the server (cursor pagination stays exact). */
export function InboxFilters({ filters, counts, live, language, t, onChange }: Props) {
  const scopeId = useId()
  const activeHelp = TABS.find((tab) => tab.id === filters.filter)?.help ?? HANDLING.find((h) => h.id === filters.filter)?.help
  const extraFilters = (HANDLING.some((h) => h.id === filters.filter) ? 1 : 0) + (filters.channel !== "all" ? 1 : 0)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-[17px] font-bold text-neutral-900">{t("pageTitle")}</h1>
        <span className={cn("flex items-center gap-1.5 text-body-12", live ? "text-neutral-500" : "text-warning-darkest")} role="status">
          <span className={cn("size-[7px] rounded-full", live ? "bg-success" : "bg-warning")} aria-hidden />
          {live ? t("liveConnected") : t("liveReconnecting")}
        </span>
      </div>

      <div className="flex gap-1.5">
        <label className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-neutral-50 bg-neutral-10 px-2.5 focus-within:border-neutral-300">
          <SearchNormal1 size={15} className="shrink-0 text-neutral-400" aria-hidden />
          <input
            type="search"
            name="inbox-search"
            aria-label={t("searchAria")}
            placeholder={t("searchPlaceholder")}
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-[16px] text-neutral-900 outline-none placeholder:text-neutral-500 sm:text-body-13"
          />
        </label>
        <Dropdown>
          <DropdownTrigger asChild>
            <button
              type="button"
              aria-label={extraFilters > 0 ? t("moreFiltersActive", { count: extraFilters }) : t("moreFilters")}
              className={cn(
                "relative flex size-[34px] shrink-0 items-center justify-center rounded-lg border transition-colors",
                extraFilters > 0 ? "border-primary bg-primary-clean text-primary-dark" : "border-neutral-50 bg-neutral-10 text-neutral-400 hover:text-neutral-900"
              )}
            >
              <Setting4 size={16} aria-hidden />
              {extraFilters > 0 && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-white" aria-hidden />}
            </button>
          </DropdownTrigger>
          <MenuContent align="end">
            <p className="px-2.5 pb-1 pt-1.5 text-body-11 font-semibold text-neutral-500">{t("filterHandlingTitle")}</p>
            {HANDLING.map((f) => (
              <MenuItem key={f.id} onSelect={() => onChange({ filter: filters.filter === f.id ? "all" : f.id })}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span>{t(f.key)}</span>
                  <span className="max-w-64 whitespace-normal text-body-11 text-neutral-500">{t(f.help)}</span>
                </span>
                {filters.filter === f.id && <TickCircle size={16} variant="Bold" className="shrink-0 text-primary" aria-hidden />}
              </MenuItem>
            ))}
            <p className="mt-1 border-t border-neutral-50 px-2.5 pb-1 pt-2 text-body-11 font-semibold text-neutral-500">{t("channelAria")}</p>
            {CHANNELS.map((c) => (
              <MenuItem key={c.id} onSelect={() => onChange({ channel: filters.channel === c.id ? "all" : c.id })}>
                <span className="flex-1">{t(c.key)}</span>
                {filters.channel === c.id && <TickCircle size={16} variant="Bold" className="shrink-0 text-primary" aria-hidden />}
              </MenuItem>
            ))}
          </MenuContent>
        </Dropdown>
      </div>

      <div role="group" aria-label={t("filtersAria")} aria-describedby={counts ? scopeId : undefined} className="flex gap-0.5 rounded-lg bg-neutral-10 p-[3px]">
        {TABS.map((tab) => {
          const active = filters.filter === tab.id
          const count = !counts ? null : tab.id === "unread" ? counts.unread : tab.id === "needs_reply" ? counts.needsReply : null
          const label = t(tab.key)
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ filter: tab.id })}
              title={tab.help ? t(tab.help) : undefined}
              aria-label={
                count != null
                  ? t("tabCountAria", { label, conversations: countLabel(t, language, count, "conversationsOne", "conversationsOther") })
                  : undefined
              }
              className={cn(
                "flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 text-body-12 transition-colors",
                active ? "bg-white font-semibold text-neutral-900 shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "font-medium text-neutral-600 hover:text-neutral-900"
              )}
            >
              <span className="truncate">{label}</span>
              {count != null && (
                <span
                  className={cn("shrink-0 rounded-full px-1.5 text-body-11 tabular-nums", active ? "bg-neutral-10 text-neutral-900" : "bg-white text-neutral-700")}
                  aria-hidden
                >
                  {shortCount(count, language)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {counts && (
        <span id={scopeId} className="sr-only">
          {t("countsScopeHint")}
        </span>
      )}
      {activeHelp && <p className="text-body-11 leading-snug text-neutral-500">{t(activeHelp)}</p>}
    </div>
  )
}
