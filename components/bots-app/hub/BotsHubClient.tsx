"use client"

import { Add, Flash, SearchNormal1 } from "iconsax-react"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { BotsGrid } from "components/automations/hub/BotsGrid"
import { HubMessage, HubSkeleton } from "components/automations/hub/HubParts"
import { useHubActions } from "components/automations/hub/useHubActions"
import { STUDIO_ROUTES } from "components/automations/studioRoutes"
import { ChannelFilter } from "components/automations/ui/ChannelFilter"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog"
import { Input } from "components/ui/input"
import { formatNumber, formatPercent, plural } from "lib/attende/format"
import { HUB_PAGE_SIZE } from "lib/automations/hubConstants"
import { type BotsHubMetrics, computeBotsHubMetrics } from "./botsHubMetrics"
import { type BotsHubInitial, useBotsHubData } from "./useBotsHubData"
import { BOTS_ROUTES } from "../brand"
import { EmptyState, PremiumCard, StatTile } from "../ui"
import { actionClass } from "../ui/actionStyles"
import { PageLayout } from "../ui/PageLayout"
import { useBotsAppT } from "../useBotsAppT"

/** Shown instead of a number we do not have (never a fake 0). */
const DASH = "–"

/**
 * The automations hub (route /bots): what an automation is, header numbers (each saying what it counts), search and
 * channel filter, and the cards. Cards, row actions (toggle, delete) are the same components the JSYNQ hub uses.
 */
export function BotsHubClient({ initial }: { initial: BotsHubInitial }) {
  const { t, language } = useBotsAppT()
  const { t: ta, language: automationsLanguage } = useAutomationsT()
  const router = useRouter()
  const hub = useBotsHubData(initial)
  const actions = useHubActions(hub, ta, automationsLanguage)
  const [creating, setCreating] = useState(false)

  const metrics = computeBotsHubMetrics(hub.data)
  const pages = Math.max(1, Math.ceil(hub.total / HUB_PAGE_SIZE))
  const empty = !hub.failed && hub.data !== null && hub.data.totals.all === 0 && !hub.filtering
  const n = (value: number) => formatNumber(value, language)

  // New automation: go straight to the builder, carrying the channel filter as the starting channel.
  const goNew = (template?: "quote") => {
    setCreating(true)
    const params = new URLSearchParams()
    if (hub.channel !== "all") params.set("channel", hub.channel)
    if (template) params.set("template", template)
    const query = params.toString()
    router.push(query ? `${STUDIO_ROUTES.newBot}?${query}` : STUDIO_ROUTES.newBot)
  }

  const newButton = (
    <button type="button" className={actionClass()} disabled={creating} aria-busy={creating} onClick={() => goNew()}>
      {creating ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Add size={16} aria-hidden />}
      {t("botsHubNew")}
    </button>
  )

  const list = hub.failed ? (
    <HubMessage
      title={t("botsHubLoadError")}
      action={
        <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} onClick={() => void hub.reloadCurrent()}>
          {t("botsHubRetry")}
        </button>
      }
    />
  ) : hub.data === null ? (
    <HubSkeleton />
  ) : (
    <>
      <BotsGrid
        items={hub.items}
        loading={hub.loading}
        filtering={hub.filtering}
        language={automationsLanguage}
        t={ta}
        onEdit={(id) => router.push(STUDIO_ROUTES.bot(id))}
        onToggle={actions.toggleBot}
        onDelete={(b) => actions.setPendingDelete({ kind: "bot", id: b.id, name: b.name })}
        onNew={() => goNew()}
      />
      {pages > 1 && (
        <nav
          aria-label={t("botsHubPage", { page: hub.page, pages })}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-50 px-4 py-3 sm:px-5"
        >
          <span className="text-body-12 text-neutral-500">{t("botsHubPage", { page: n(hub.page), pages: n(pages) })}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={actionClass({ variant: "secondary", size: "sm" })}
              disabled={hub.page <= 1 || hub.loading}
              onClick={() => hub.setPage((p) => Math.max(1, p - 1))}
            >
              {t("botsHubPrev")}
            </button>
            <button
              type="button"
              className={actionClass({ variant: "secondary", size: "sm" })}
              disabled={hub.page >= pages || hub.loading}
              onClick={() => hub.setPage((p) => Math.min(pages, p + 1))}
            >
              {t("botsHubNext")}
            </button>
          </div>
        </nav>
      )}
    </>
  )

  return (
    <PageLayout title={t("botsHubTitle")} subtitle={t("botsHubSubtitle")} actions={newButton}>
      <div className="flex flex-col gap-6">
        <p className="max-w-3xl text-body-14 leading-relaxed text-neutral-600">
          {t("botsHubExplainer")}{" "}
          <Link
            href={BOTS_ROUTES.agents}
            className="whitespace-nowrap rounded font-semibold text-primary-dark underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t("botsHubSeeAgents")}
          </Link>
        </p>

        {empty ? (
          <EmptyState
            icon={<Flash size={22} variant="Bold" />}
            title={t("botsHubEmptyTitle")}
            description={t("botsHubEmptyBody")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {newButton}
                <button type="button" className={actionClass({ variant: "secondary" })} onClick={() => goNew("quote")}>
                  {t("botsHubEmptyTemplate")}
                </button>
              </div>
            }
          />
        ) : (
          <>
            <HubMetrics metrics={metrics} />

            <PremiumCard className="flex flex-col overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-50 px-4 py-3 sm:px-5">
                <label className="relative flex w-full items-center sm:w-auto">
                  <SearchNormal1 size={16} className="pointer-events-none absolute left-2.5 text-neutral-500" aria-hidden />
                  <Input
                    type="search"
                    value={hub.query}
                    onChange={(e) => hub.setQuery(e.target.value)}
                    aria-label={t("botsHubSearch")}
                    placeholder={t("botsHubSearch")}
                    className="h-9 w-full pl-8 pr-3 text-body-14 sm:w-64"
                  />
                </label>
                <ChannelFilter value={hub.channel} onChange={hub.setChannel} />
              </div>
              {list}
            </PremiumCard>
          </>
        )}

        <AlertDialog open={!!actions.pendingDelete} onOpenChange={(open) => !open && !actions.deleting && actions.setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("botsHubDeleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("botsHubDeleteBody", { name: actions.pendingDelete?.name ?? "" })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actions.deleting}>{t("botsHubDeleteCancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={actions.deleting}
                onClick={(e) => {
                  e.preventDefault()
                  void actions.confirmDelete()
                }}
              >
                {t("botsHubDeleteConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  )
}

/** Four header numbers. Each hint says what it counts; numbers we do not have are a dash with the reason. */
function HubMetrics({ metrics }: { metrics: BotsHubMetrics | null }) {
  const { t, language } = useBotsAppT()
  const n = (value: number) => formatNumber(value, language)

  const completionHint = (m: BotsHubMetrics): string => {
    if (m.started30d === null || m.completed30d === null) return t("botsHubMetricPartial")
    if (m.started30d === 0) return t("botsHubMetricNone")
    const values = { completed: n(m.completed30d), started: n(m.started30d) }
    if (m.started30d === 1) return t("botsHubCompletionSingle", values)
    return m.completed30d === 1 ? t("botsHubCompletionOneOfMany", values) : t("botsHubCompletionManyOfMany", values)
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4")}>
      <StatTile
        label={t("botsHubMetricActive")}
        value={metrics ? n(metrics.active) : DASH}
        hint={metrics ? t("botsHubMetricOf", { total: n(metrics.all) }) : t("botsHubMetricUnavailable")}
      />
      <StatTile
        label={t("botsHubMetricPaused")}
        value={metrics ? n(metrics.paused + metrics.drafts) : DASH}
        hint={
          !metrics
            ? t("botsHubMetricUnavailable")
            : metrics.drafts > 0
              ? plural(metrics.drafts, language, { one: t("botsHubMetricDraftsOne"), other: t("botsHubMetricDraftsOther") })
              : undefined
        }
      />
      <StatTile
        label={t("botsHubMetricStarted")}
        value={metrics?.started30d != null ? n(metrics.started30d) : DASH}
        hint={!metrics ? t("botsHubMetricUnavailable") : metrics.started30d === null ? t("botsHubMetricPartial") : undefined}
      />
      <StatTile
        label={t("botsHubMetricCompletion")}
        value={metrics?.completionRate != null ? formatPercent(metrics.completionRate, language) : DASH}
        hint={metrics ? completionHint(metrics) : t("botsHubMetricUnavailable")}
      />
    </div>
  )
}
