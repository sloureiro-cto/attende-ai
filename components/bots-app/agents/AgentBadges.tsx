"use client"

import { AlertTriangle, CircleDashed, CirclePause, CirclePlay, PencilLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { activeLines, type AgentDisplayStatus, brokenLines, displayStatus } from "lib/attende/agents/status"
import type { AgentLineView, AgentTemplate, AgentView, TemplateKey } from "lib/attende/agents/types"
import { plural } from "lib/attende/format"
import type { BotsLineStatus } from "lib/bots-app/lines"
import type { AttendeAgentsT } from "./useAttendeAgentsT"
import { ChannelGlyph } from "../lines/ChannelGlyph"

/** Tone + icon per state: color is never the only signal (each pill has an icon and a word). */
const STATUS: Record<AgentDisplayStatus, { tone: string; Icon: typeof CirclePlay }> = {
  live: { tone: "bg-success-clean text-success-darkest ring-success-lighter", Icon: CirclePlay },
  paused: { tone: "bg-neutral-10 text-neutral-700 ring-neutral-100", Icon: CirclePause },
  no_channels: { tone: "bg-info-clean text-info-darkest ring-info-lighter", Icon: CircleDashed },
  incomplete: { tone: "bg-warning-clean text-warning-darkest ring-warning-lighter", Icon: PencilLine },
}

export const TEMPLATE_KEY: Record<TemplateKey, "templateSdr" | "templateCloser" | "templateReceptionist"> = {
  sdr: "templateSdr",
  closer: "templateCloser",
  receptionist: "templateReceptionist",
}

export const CHANNEL_KEY = { whatsapp: "channelWhatsapp", instagram: "channelInstagram", sms: "channelSms" } as const

/** Connection state of a workspace channel (from the channels list), in words. */
export const CHANNEL_STATE_KEY: Record<
  BotsLineStatus,
  "channelStateConnected" | "channelStateQrPending" | "channelStateReconnecting" | "channelStateDisconnected" | "channelStateError" | "channelStatePendingSetup" | "channelStateDisabled"
> = {
  connected: "channelStateConnected",
  reconnecting: "channelStateReconnecting",
  qr_pending: "channelStateQrPending",
  disconnected: "channelStateDisconnected",
  error: "channelStateError",
  pending_setup: "channelStatePendingSetup",
  disabled: "channelStateDisabled",
}

type StatusAgent = Pick<AgentView, "status" | "lines" | "form">

/** On, but no attached channel can answer right now (every active channel is gone or disconnected). "On" is no promise then. */
export const liveButBlocked = (agent: StatusAgent, template?: AgentTemplate | null): boolean =>
  displayStatus(agent, template) === "live" && activeLines(agent).filter((l) => !isBrokenLine(l)).length === 0

/** "On in 2 channels", "Paused", "No channels", "Setup incomplete". */
export function statusLabel(agent: StatusAgent, t: AttendeAgentsT, appLanguage: string, template?: AgentTemplate | null): string {
  const status = displayStatus(agent, template)
  if (status === "live") {
    if (liveButBlocked(agent, template)) return t("statusLiveBlocked")
    const count = activeLines(agent).filter((l) => !isBrokenLine(l)).length
    return plural(count, appLanguage, { one: t("statusLiveOne"), other: t("statusLiveOther") })
  }
  if (status === "paused") return t("statusPaused")
  if (status === "no_channels") return t("statusNoChannels")
  return t("statusIncomplete")
}

/** One sentence that says what the state means for customers. */
export function statusHint(agent: StatusAgent, t: AttendeAgentsT, appLanguage: string, template?: AgentTemplate | null): string {
  const status = displayStatus(agent, template)
  if (status === "live") return liveButBlocked(agent, template) ? t("hintLiveBlocked") : t("hintLive")
  if (status === "paused") return plural(agent.lines.length, appLanguage, { one: t("hintPausedOne"), other: t("hintPausedOther") })
  if (status === "no_channels") return t("hintNoChannels")
  return t("hintIncomplete")
}

export function StatusPill({ agent, t, appLanguage, template }: { agent: StatusAgent; t: AttendeAgentsT; appLanguage: string; template?: AgentTemplate | null }) {
  const status = displayStatus(agent, template)
  const { tone, Icon } = liveButBlocked(agent, template) ? { tone: STATUS.incomplete.tone, Icon: AlertTriangle } : STATUS[status]
  return (
    <span data-status={status} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-body-12 font-semibold ring-1 ring-inset", tone)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {statusLabel(agent, t, appLanguage, template)}
    </span>
  )
}

/** Separate from the state: an agent can be on and still have a channel that dropped. */
export function AttentionPill({ agent, t, appLanguage }: { agent: Pick<AgentView, "lines">; t: AttendeAgentsT; appLanguage: string }) {
  const count = brokenLines(agent).length
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-clean px-2.5 py-1 text-body-12 font-semibold text-warning-darkest ring-1 ring-inset ring-warning-lighter">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      {plural(count, appLanguage, { one: t("attentionOne"), other: t("attentionOther") })}
    </span>
  )
}

export function TemplateBadge({ templateKey, t }: { templateKey: TemplateKey; t: AttendeAgentsT }) {
  return <span className="inline-flex items-center rounded-full border border-neutral-border bg-white px-2.5 py-1 text-body-12 font-medium text-neutral-600">{t(TEMPLATE_KEY[templateKey] ?? "templateSdr")}</span>
}

/** Connection of an attached channel, in words. The API only says whether it exists and is connected. */
export function lineConnectionText(line: AgentLineView, t: AttendeAgentsT): string {
  if (line.exists === false) return t("lineRemoved")
  return line.connected === false ? t("channelStateDisconnected") : t("channelStateConnected")
}

export const isBrokenLine = (line: AgentLineView): boolean => line.exists === false || line.connected === false

/** Name of an attached channel: its label from the API (user content, never translated) or a neutral fallback. */
export const lineName = (line: AgentLineView, t: AttendeAgentsT): string => line.label?.trim() || t("lineUnnamed")

/** Channels an agent is attached to: icon, name, channel type, connection and whether the agent answers there. */
export function LinesList({ lines, t, showAgentState = false }: { lines: AgentLineView[]; t: AttendeAgentsT; showAgentState?: boolean }) {
  if (lines.length === 0) return <p className="text-body-13 text-neutral-500">{t("noLines")}</p>
  return (
    <ul className="flex flex-col gap-2.5" aria-label={t("linesServed")}>
      {lines.map((line) => (
        <li key={`${line.channel}:${line.sessionId}`} className="flex items-center gap-2.5">
          <ChannelGlyph channel={line.channel} className="size-8 rounded-lg" />
          <LineText line={line} t={t} showAgentState={showAgentState} />
        </li>
      ))}
    </ul>
  )
}

export function LineText({ line, t, showAgentState }: { line: AgentLineView; t: AttendeAgentsT; showAgentState: boolean }) {
  const broken = isBrokenLine(line)
  return (
    <span className="flex min-w-0 flex-1 basis-40 flex-col">
      <span className="truncate text-body-14 font-medium text-neutral-800">{lineName(line, t)}</span>
      <span className="flex flex-wrap items-center gap-x-1.5 text-body-12 text-neutral-500">
        <span>{t(CHANNEL_KEY[line.channel])}</span>
        <span aria-hidden>·</span>
        <span className={cn(broken && "inline-flex items-center gap-1 font-semibold text-warning-darkest")}>
          {broken && <AlertTriangle className="size-3" aria-hidden />}
          {lineConnectionText(line, t)}
        </span>
        {showAgentState && (
          <>
            <span aria-hidden>·</span>
            {/* Agent on + channel connected = answers here. On but the channel is down = it cannot answer. */}
            <span className={cn(line.active && !broken && "font-semibold text-success-darkest", line.active && broken && "font-semibold text-warning-darkest")}>
              {line.active ? (broken ? t("lineAgentBlocked") : t("lineAgentOn")) : t("lineAgentPaused")}
            </span>
          </>
        )}
      </span>
    </span>
  )
}
