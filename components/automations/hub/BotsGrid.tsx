"use client"

import { Add } from "iconsax-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { STUDIO_ROUTES } from "components/automations/studioRoutes"
import { channelLabelKey } from "components/automations/ui/ChannelFilter"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import { Switch } from "components/ui/switch"
import { formatRelative } from "lib/automations/relativeTime"
import type { SalesBotListItem } from "lib/automations/types"
import { HubMessage } from "./HubParts"
import { RowMenu } from "./RowMenu"

export function BotsGrid({
  items,
  loading,
  filtering,
  language,
  t,
  onEdit,
  onToggle,
  onDelete,
  onNew,
}: {
  items: SalesBotListItem[]
  loading: boolean
  filtering: boolean
  language: string
  t: AutomationsTFn
  onEdit: (id: string) => void
  onToggle: (item: SalesBotListItem) => void
  onDelete: (item: SalesBotListItem) => void
  onNew: () => void
}) {
  if (items.length === 0 && filtering) return <HubMessage title={t("automationsHubEmptySearch")} />
  return (
    <div className={cn("grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
      {items.map((b) => {
        const { started, completed } = b.stats30d
        const rate = started > 0 ? Math.round((completed / started) * 100) : 0
        const channels = b.channels.map((c) => t(channelLabelKey(c.channel))).join(" · ")
        return (
          <article key={b.id} className="flex flex-col overflow-hidden rounded-lg border border-neutral-50 bg-white">
            <Link href={STUDIO_ROUTES.bot(b.id)} className="flex flex-col no-underline" aria-label={b.name}>
              <div className="relative h-[132px] overflow-hidden border-b border-neutral-50 bg-neutral-10 [background-image:radial-gradient(theme(colors.neutral.50)_1px,transparent_1px)] [background-size:14px_14px]">
                <BotIllustration />
                <span
                  className={cn(
                    "absolute right-3 top-3 rounded-full border px-2 py-0.5 text-body-11 font-semibold",
                    b.status === "active"
                      ? "border-primary-lighter bg-primary-clean text-primary-dark"
                      : "border-neutral-50 bg-white text-neutral-600"
                  )}
                >
                  {b.status === "active" ? t("automationsHubStateActive") : b.status === "paused" ? t("automationsHubStatePaused") : t("automationsHubBotStatusDraft")}
                </span>
              </div>
              <div className="flex flex-col gap-1 px-4 pt-4">
                <span className="truncate text-body-14 font-semibold text-neutral-900">{b.name}</span>
                <span className="text-body-12 text-neutral-500">
                  {[channels, t("automationsHubBotSteps", { count: b.stepCount }), t("automationsHubEdited", { when: formatRelative(b.updatedAt, language) })]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </Link>
            <div className="flex flex-col gap-1.5 px-4 pt-3">
              <div className="flex justify-between text-body-12 text-neutral-600">
                <span>{t("automationsHubBotStarted", { count: started })}</span>
                <span className="font-semibold text-primary-dark">{t("automationsHubBotCompletes", { rate })}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-primary-clean" role="progressbar" aria-label={t("automationsHubBotCompletes", { rate })} aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Switch checked={b.status === "active"} onCheckedChange={() => onToggle(b)} aria-label={t("automationsHubToggleAria", { name: b.name })} size="sm" />
                <span className="text-body-12 text-neutral-600">{b.status === "active" ? t("automationsHubStateActive") : t("automationsHubStatePaused")}</span>
              </div>
              <RowMenu
                label={t("automationsHubMoreAria", { name: b.name })}
                items={[
                  { id: "edit", label: t("automationsHubMenuEdit"), onSelect: () => onEdit(b.id) },
                  { id: "delete", label: t("automationsHubMenuDelete"), onSelect: () => onDelete(b), danger: true },
                ]}
              />
            </div>
          </article>
        )
      })}
      <button
        type="button"
        onClick={onNew}
        className="flex min-h-[250px] flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-neutral-100 bg-neutral-10 text-neutral-600 hover:border-primary"
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-neutral-50 bg-white text-primary-dark">
          <Add size={18} aria-hidden />
        </span>
        <span className="text-body-14 font-semibold text-neutral-800">{t("automationsHubBotsCreate")}</span>
        <span className="text-body-12 text-neutral-500">{t("automationsHubBotsCreateHint")}</span>
      </button>
    </div>
  )
}

/** Decorative miniature of a bot flow (start pill, a message node, branches), as in the design. */
function BotIllustration() {
  return (
    <div aria-hidden>
      <div className="absolute left-5 top-14 h-4 w-11 rounded-full bg-primary-dark" />
      <div className="absolute left-[84px] top-[34px] h-[52px] w-14 rounded border border-primary bg-white" />
      <div className="absolute left-[90px] top-[42px] h-3 w-11 rounded-[3px] bg-primary-clean" />
      <div className="absolute left-40 top-[18px] h-9 w-16 rounded border border-neutral-50 bg-white" />
      <div className="absolute left-40 top-[72px] h-11 w-16 rounded border border-neutral-50 bg-white" />
      <div className="absolute left-[244px] top-[30px] h-[30px] w-14 rounded border border-neutral-50 bg-white" />
      <div className="absolute left-16 top-[63px] h-0.5 w-5 bg-primary-light" />
      <div className="absolute left-[140px] top-9 h-0.5 w-5 bg-primary-light" />
      <div className="absolute left-[140px] top-[90px] h-0.5 w-5 bg-primary-light" />
      <div className="absolute left-56 top-11 h-0.5 w-5 bg-neutral-100" />
    </div>
  )
}
