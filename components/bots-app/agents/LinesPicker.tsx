"use client"

import { Check, Plus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MAX_AGENT_LINES } from "lib/attende/agents/status"
import type { AgentLine, TemplateChannel } from "lib/attende/agents/types"
import { plural } from "lib/attende/format"
import type { BotsLine } from "lib/bots-app/lines"
import { CHANNEL_KEY, CHANNEL_STATE_KEY } from "./AgentBadges"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { ChannelGlyph } from "../lines/ChannelGlyph"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"

type Props = {
  lines: BotsLine[]
  channels: TemplateChannel[]
  selected: AgentLine[]
  onChange: (next: AgentLine[]) => void
  /** Opens the connect-a-number flow (WhatsApp). When omitted, a link to /lines is shown. */
  onConnect?: () => void
  /** A channel list that failed to load. */
  loadFailed?: boolean
}

const keyOf = (line: { channel: string; sessionId?: string; id?: string }) => `${line.channel}:${line.sessionId ?? line.id}`

/** Which of the workspace's channels this agent answers on (creation wizard). Only channel types the model supports are offered. */
export function LinesPicker({ lines, channels, selected, onChange, onConnect, loadFailed = false }: Props) {
  const { t, appLanguage } = useAttendeAgentsT()
  const allowed = new Map(channels.filter((c) => c.available).map((c) => [c.key, c]))
  const offered = lines.filter((l) => allowed.has(l.channel))
  const chosen = new Set(selected.map(keyOf))
  const hasBeta = offered.some((l) => allowed.get(l.channel)?.beta)
  const atMax = selected.length >= MAX_AGENT_LINES

  const toggle = (line: BotsLine) => {
    const key = keyOf({ channel: line.channel, id: line.id })
    if (chosen.has(key)) onChange(selected.filter((s) => keyOf(s) !== key))
    else if (!atMax) onChange([...selected, { channel: line.channel, sessionId: line.id }])
  }

  const connectAction = onConnect ? (
    <button type="button" onClick={onConnect} className={actionClass({ variant: "primary", size: "lg" })}>
      <Plus className="size-4" aria-hidden />
      {t("linesConnect")}
    </button>
  ) : (
    <Link href="/lines" className={actionClass({ variant: "primary", size: "lg" })}>
      {t("linesConnect")}
    </Link>
  )

  if (loadFailed && offered.length === 0) return <EmptyState title={t("linesLoadError")} />
  if (offered.length === 0) return <EmptyState title={t("linesNoneTitle")} description={t("linesNoneHint")} action={connectAction} />

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2" aria-label={t("linesTitle")}>
        {offered.map((line) => {
          const on = chosen.has(keyOf({ channel: line.channel, id: line.id }))
          const connected = line.status === "connected"
          return (
            <li key={`${line.channel}:${line.id}`}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-disabled={!on && atMax ? true : undefined}
                onClick={() => toggle(line)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                  on ? "border-primary-dark bg-primary-clean/50 ring-2 ring-primary/20" : "border-neutral-border hover:border-primary-lighter",
                  !on && atMax && "cursor-not-allowed opacity-60"
                )}
              >
                <ChannelGlyph channel={line.channel} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body-14 font-semibold text-neutral-900">{line.label || t("lineUnnamed")}</span>
                  <span className="flex min-w-0 gap-1.5 text-body-13 text-neutral-600">
                    <span className="shrink-0">{t(CHANNEL_KEY[line.channel])}</span>
                    {line.identifier && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="truncate">{line.identifier}</span>
                      </>
                    )}
                  </span>
                  <span className={cn("text-body-12 font-medium", connected ? "text-success-darkest" : "text-warning-darkest")}>{t(CHANNEL_STATE_KEY[line.status])}</span>
                </span>
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", on ? "border-primary-dark bg-primary-dark text-white" : "border-neutral-200 text-transparent")} aria-hidden>
                  <Check className="size-4" />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5" aria-live="polite">
          <p className="text-body-13 text-neutral-600">{plural(selected.length, appLanguage, { zero: t("linesSelectedZero"), one: t("linesSelectedOne"), other: t("linesSelectedOther") })}</p>
          {atMax && <p className="text-body-13 text-neutral-600">{t("channelsMax", { limit: MAX_AGENT_LINES })}</p>}
        </div>
        {onConnect ? (
          <button type="button" onClick={onConnect} className={actionClass({ variant: "ghost", size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            {t("linesConnect")}
          </button>
        ) : null}
      </div>
      {hasBeta && <p className="rounded-xl bg-neutral-10 p-3 text-body-13 text-neutral-600">{t("linesBetaNote")}</p>}
    </div>
  )
}
