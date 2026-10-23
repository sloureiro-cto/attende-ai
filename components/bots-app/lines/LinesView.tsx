"use client"

import { AlertTriangle, ExternalLink, Link2, Plus, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { reconnectWhatsAppSessionAction } from "actions/whatsapp-lite"
import type { WhatsAppSession } from "actions/whatsapp-lite/types"
import { showToast } from "app/utils/showToast"
import { formatNumber, plural } from "lib/attende/format"
import type { AutomationChannel } from "lib/automations/types"
import { type BotsLine, canReconnectHere, lineKeyOf, type LinesLoadResult, pillStatusOf, sortLines, summarizeLines } from "lib/bots-app/lines"
import { refreshLinesAction } from "lib/bots-app/linesActions"
import { ChannelTabs } from "./ChannelTabs"
import { LineCard } from "./LineCard"
import { LineDetailsSheet } from "./LineDetailsSheet"
import { jsynqLinesUrl, LINE_CHANNEL_KEY } from "./lineMeta"
import { WhatsAppConnect } from "./WhatsAppConnect"
import { publishLinesStatus } from "../LinesStatusPillLive"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"
import { PageLayout } from "../ui/PageLayout"
import { useBotsAppT } from "../useBotsAppT"

type Props = {
  initial: LinesLoadResult
  /** Channel page (/lines/whatsapp) or null for the overview (/lines). */
  channel: AutomationChannel | null
  /** Open the "connect a number" flow on mount (deep link from /lines/whatsapp/connect). */
  autoConnect?: boolean
  /** `whatsapp:<id>` from `?line=`: open that channel's details on mount (links from the side-menu alert). */
  initialLineKey?: string | null
  /** With `initialLineKey`, also start the reconnect flow on mount (`&reconnect=1`). */
  autoReconnect?: boolean
}

/** A reconnect only needs the id/label to resume the QR step; the modal re-reads the rest from the backend. */
const sessionStub = (line: BotsLine, status: string): WhatsAppSession => ({
  _id: line.id,
  label: line.label,
  status,
  phoneNumber: line.identifier,
  transport: "baileys",
})

const retryClass =
  "rounded px-1 font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"

export function LinesView({ initial, channel, autoConnect = false, initialLineKey = null, autoReconnect = false }: Props) {
  const { t, language } = useBotsAppT()
  const [data, setData] = useState(initial)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [connectSession, setConnectSession] = useState<WhatsAppSession | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const requestSeq = useRef(0)

  const keyOf = lineKeyOf
  const visible = useMemo(() => (channel ? data.lines.filter((l) => l.channel === channel) : data.lines), [data.lines, channel])
  // Same base as the channel tabs (every listed channel), with what each tile counts said in its hint.
  const summary = useMemo(
    () => summarizeLines(visible, { botsLoaded: !data.botsUnavailable, agentsLoaded: !data.agentsUnavailable && visible.every((l) => l.agents !== undefined) }),
    [visible, data.botsUnavailable, data.agentsUnavailable]
  )
  // Derived from the list so the drawer always shows fresh data after a refresh.
  const selected = useMemo(() => data.lines.find((l) => keyOf(l) === selectedKey) ?? null, [data.lines, selectedKey])

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current
    setRefreshing(true)
    setRefreshFailed(false)
    try {
      const next = await refreshLinesAction()
      if (seq === requestSeq.current) {
        setData({ ...next, lines: sortLines(next.lines) })
        // Keep the side-menu alert in step with what this page shows (same mapping, same moment).
        if (next.failedChannels.length < 3) publishLinesStatus(pillStatusOf(next.lines))
      }
    } catch {
      if (seq === requestSeq.current) setRefreshFailed(true)
    } finally {
      if (seq === requestSeq.current) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (autoConnect && (channel === null || channel === "whatsapp")) setConnectOpen(true)
  }, [autoConnect, channel])

  useEffect(() => {
    if (initial.failedChannels.length < 3) publishLinesStatus(pillStatusOf(initial.lines))
  }, [initial])

  const closeConnect = (open: boolean) => {
    setConnectOpen(open)
    if (!open) {
      setConnectSession(null)
      void refresh()
    }
  }

  const reconnect = async (line: BotsLine) => {
    setReconnecting(true)
    try {
      // Already waiting for a scan: resume the QR step instead of asking the backend to restart the pairing.
      if (line.status === "qr_pending" || line.status === "reconnecting") {
        setConnectSession(sessionStub(line, "qr_pending"))
        setSelectedKey(null)
        setConnectOpen(true)
        return
      }
      const res = await reconnectWhatsAppSessionAction(line.id)
      if (!res.success) {
        showToast("error", t("lineReconnectFailed"))
        return
      }
      showToast("success", t("lineReconnectStarted"))
      setConnectSession(res.data)
      setSelectedKey(null)
      setConnectOpen(true)
    } catch {
      showToast("error", t("lineReconnectFailed"))
    } finally {
      setReconnecting(false)
    }
  }

  // Deep link from the side-menu alert: open that channel and, when asked, start its reconnect right away.
  const deepLinkHandled = useRef(false)
  useEffect(() => {
    if (deepLinkHandled.current || !initialLineKey) return
    deepLinkHandled.current = true
    const target = initial.lines.find((l) => lineKeyOf(l) === initialLineKey)
    if (!target) return
    if (autoReconnect && canReconnectHere(target)) void reconnect(target)
    else setSelectedKey(initialLineKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [])

  const failedHere = channel ? data.failedChannels.filter((c) => c === channel) : data.failedChannels
  const showConnect = channel === null || channel === "whatsapp"
  const allFailed = data.failedChannels.length === 3

  const connectButton = (
    <button type="button" className={actionClass()} onClick={() => setConnectOpen(true)}>
      <Plus className="size-4" aria-hidden />
      {t("linesConnectWhatsapp")}
    </button>
  )
  const manageLink = (target: AutomationChannel) => (
    <a href={jsynqLinesUrl(target)} target="_blank" rel="noopener noreferrer" className={actionClass()}>
      <ExternalLink className="size-4" aria-hidden />
      {t("lineManageInJsynq")}
    </a>
  )
  const count = (n: number) => formatNumber(n, language)
  const enabledText = plural(summary.enabled, language, { one: t("linesStatEnabledOne"), other: t("linesStatEnabledOther") })
  const disabledText = plural(summary.disabled, language, { one: t("linesStatDisabledOne"), other: t("linesStatDisabledOther") })
  // Missing data is never a 0: an unloaded join shows a dash with "Not available".
  const unavailable = { value: "–", hint: t("linesValueUnavailable") }
  const summaryItems: Array<{ key: string; label: string; value: string; hint: string; tone: string }> = [
    {
      key: "total",
      label: t("linesStatTotal"),
      value: count(summary.total),
      hint: summary.disabled > 0 ? `${enabledText} · ${disabledText}` : enabledText,
      tone: "text-neutral-900",
    },
    {
      key: "connected",
      label: t("linesStatConnected"),
      value: count(summary.connected),
      hint: plural(summary.enabled, language, { one: t("linesStatConnectedOfOne"), other: t("linesStatConnectedOfOther") }),
      tone: "text-neutral-900",
    },
    {
      key: "attention",
      label: t("linesStatAttention"),
      value: count(summary.attention),
      hint: t("linesStatAttentionHint"),
      tone: summary.attention > 0 ? "text-warning-darkest" : "text-neutral-900",
    },
    {
      key: "agents",
      label: t("linesStatAgents"),
      ...(summary.activeAgents === null ? unavailable : { value: count(summary.activeAgents), hint: t("linesStatOnTheseChannels") }),
      tone: "text-neutral-900",
    },
    {
      key: "automations",
      label: t("linesStatAutomations"),
      ...(summary.activeAutomations === null ? unavailable : { value: count(summary.activeAutomations), hint: t("linesStatOnTheseChannels") }),
      tone: "text-neutral-900",
    },
  ]

  return (
    <PageLayout
      title={t("linesPageTitle")}
      subtitle={t("linesPageSubtitle")}
      actions={
        <>
          <button type="button" className={actionClass({ variant: "secondary" })} disabled={refreshing} onClick={() => void refresh()}>
            <RefreshCw className={cn("size-4", refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden />
            {refreshing ? t("linesRefreshing") : t("linesRefresh")}
          </button>
          {showConnect && connectButton}
          {channel && channel !== "whatsapp" && manageLink(channel)}
        </>
      }
    >
      <div className="flex flex-col gap-6">

      {visible.length > 0 && (
        <section
          aria-label={t("linesSummaryAria")}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-neutral-50 bg-neutral-50 shadow-[var(--bots-shadow-card)] sm:grid-cols-3 xl:grid-cols-5"
        >
          {summaryItems.map((item, index) => (
            <div
              key={item.key}
              data-testid={`lines-stat-${item.key}`}
              className={cn("flex flex-col gap-1 bg-white px-4 py-3.5 sm:px-5 sm:py-4", index === summaryItems.length - 1 && "col-span-2 sm:col-span-1")}
            >
              <span className="text-body-13 text-neutral-500">{item.label}</span>
              <span className={cn("text-[22px] font-semibold leading-none tracking-tight tabular-nums", item.tone)}>{item.value}</span>
              <span className="text-body-12 text-neutral-500">{item.hint}</span>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-col gap-4">
        <ChannelTabs active={channel} lines={data.lines} />

        {refreshFailed && (
          <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-error-lighter bg-error-clean px-4 py-3 text-body-13 text-error-darkest">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{t("linesLoadError")}</span>
            <button type="button" onClick={() => void refresh()} className={retryClass}>
              {t("linesRetry")}
            </button>
          </p>
        )}

        {failedHere.map((failed) => (
          <div
            key={failed}
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-lighter bg-warning-clean/50 px-4 py-3 text-body-13 text-warning-darkest"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {t("linesChannelLoadError", { channel: t(LINE_CHANNEL_KEY[failed]) })}
            </span>
            <button type="button" onClick={() => void refresh()} className={retryClass}>
              {t("linesRetry")}
            </button>
          </div>
        ))}

        {(data.botsUnavailable || data.botsTruncated) && (
          <p className="text-body-13 text-neutral-500">{data.botsUnavailable ? t("linesBotsUnavailable") : t("linesBotsTruncated")}</p>
        )}
        {data.agentsUnavailable && <p className="text-body-13 text-neutral-500">{t("linesAgentsUnavailable")}</p>}

        {visible.length === 0 ? (
          allFailed ? (
            <EmptyState
              title={t("linesLoadError")}
              icon={<AlertTriangle className="size-6" />}
              action={
                <button type="button" className={actionClass({ variant: "secondary" })} onClick={() => void refresh()}>
                  {t("linesRetry")}
                </button>
              }
            />
          ) : (
            <EmptyState
              title={channel ? t("linesEmptyChannelTitle", { channel: t(LINE_CHANNEL_KEY[channel]) }) : t("linesEmptyTitle")}
              description={t("linesEmptyBody")}
              icon={<Link2 className="size-6" />}
              action={showConnect ? connectButton : channel ? manageLink(channel) : undefined}
            />
          )
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy={refreshing}>
            {visible.map((line) => (
              <li key={keyOf(line)} className="min-w-0">
                <LineCard
                  line={line}
                  onOpen={(l) => setSelectedKey(keyOf(l))}
                  onReconnect={(l) => void reconnect(l)}
                  reconnecting={reconnecting}
                  botsUnavailable={data.botsUnavailable}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <LineDetailsSheet
        line={selected}
        onOpenChange={(open) => !open && setSelectedKey(null)}
        onReconnect={(line) => void reconnect(line)}
        reconnecting={reconnecting}
        botsUnavailable={data.botsUnavailable}
      />

      <WhatsAppConnect open={connectOpen} onOpenChange={closeConnect} initialSession={connectSession} onSessionUpsert={() => void refresh()} />
      </div>
    </PageLayout>
  )
}
