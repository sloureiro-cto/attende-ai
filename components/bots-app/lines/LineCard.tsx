"use client"

import { ChevronRight, ExternalLink, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatRelative, plural } from "lib/attende/format"
import { activeBotsOf, type BotsLine, type BotsLineAgent, canReconnectHere, reconnectsInJsynq } from "lib/bots-app/lines"
import { ChannelGlyph } from "./ChannelGlyph"
import { jsynqLinesUrl, LINE_IMPACT_KEY, LINE_STATE_KEY, LINE_TRANSPORT_KEY, lineAgentStateKey } from "./lineMeta"
import { LineStatusChip } from "./LineStatusChip"
import { actionClass } from "../ui/actionStyles"
import { useBotsAppT } from "../useBotsAppT"

type Props = {
  line: BotsLine
  onOpen: (line: BotsLine) => void
  /** Restarts the QR pairing of a WhatsApp QR line (same flow as the details sheet). */
  onReconnect?: (line: BotsLine) => void
  reconnecting?: boolean
  /** The automation list could not be loaded: say so instead of "none". */
  botsUnavailable?: boolean
  className?: string
}

/** Live agents first, so the card names the one actually answering. */
const byActive = (a: BotsLineAgent, b: BotsLineAgent) => Number(b.active) - Number(a.active)

/**
 * One channel. Two separate facts: the connection (chip + what it means for messages) and what runs on it (AI agent,
 * automations). The whole card opens the details; Reconnect sits above the stretched link so it stays its own action.
 */
export function LineCard({ line, onOpen, onReconnect, reconnecting = false, botsUnavailable = false, className }: Props) {
  const { t, language } = useBotsAppT()
  const running = activeBotsOf(line).length
  const botsLabel = botsUnavailable
    ? t("linesValueUnavailable")
    : running > 0
      ? plural(running, language, { one: t("lineBotsOne"), other: t("lineBotsMany") })
      : line.bots.length > 0
        ? t("lineBotsOnlyInactive")
        : t("lineBotsNone")

  const agents = line.agents ? [...line.agents].sort(byActive) : null
  const firstAgent = agents?.[0]
  const agentsLabel = !agents
    ? t("linesValueUnavailable")
    : !firstAgent
      ? t("lineAgentsNone")
      : agents.length > 1
        ? t("lineAgentsMore", { name: firstAgent.name, count: agents.length - 1 })
        : firstAgent.name

  const when = line.lastEventAt ? formatRelative(line.lastEventAt, language) : ""
  const lastEvent = !when ? t("lineNoActivity") : line.lastEventKind === "disconnected" ? t("lineLastDisconnected", { when }) : t("lineLastUpdated", { when })
  const reconnectHere = !!onReconnect && canReconnectHere(line)
  const reconnectOutside = reconnectsInJsynq(line)

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-4 rounded-[14px] border border-neutral-50 bg-white p-4 shadow-[var(--bots-shadow-card)] transition-[border-color,box-shadow] duration-200 sm:p-5",
        "hover:border-neutral-100 hover:shadow-[var(--bots-shadow-lift)] focus-within:border-primary-dark",
        className
      )}
      data-testid={`line-${line.channel}-${line.id}`}
    >
      <div className="flex items-start gap-3">
        <ChannelGlyph channel={line.channel} className={cn("size-10", line.status === "disabled" && "opacity-60")} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="truncate text-body-16 font-semibold text-neutral-900">
            {/* Stretched over the card: one tab stop, the card's name is the accessible label. */}
            <button
              type="button"
              onClick={() => onOpen(line)}
              aria-label={t("lineDetailsAria", { name: line.label })}
              className="text-left after:absolute after:inset-0 after:rounded-[14px] after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
            >
              {line.label}
            </button>
          </h3>
          <p className="truncate text-body-13 text-neutral-500">
            {line.identifier ? `${line.identifier} · ${t(LINE_TRANSPORT_KEY[line.transport])}` : t(LINE_TRANSPORT_KEY[line.transport])}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl bg-neutral-10 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body-12 font-medium text-neutral-500">{t("lineCardConnection")}</span>
          <LineStatusChip status={line.status} label={t(LINE_STATE_KEY[line.status])} />
        </div>
        <p className="text-body-12 leading-snug text-neutral-700">{t(LINE_IMPACT_KEY[line.status])}</p>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5 text-body-13">
        <dt className="text-neutral-500">{t("lineCardAgent")}</dt>
        <dd className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className={cn("truncate", firstAgent ? "font-medium text-neutral-900" : "text-neutral-600")}>{agentsLabel}</span>
          {firstAgent && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-body-12 font-semibold",
                firstAgent.active ? "bg-primary-clean text-primary-darkest" : "bg-neutral-50 text-neutral-700"
              )}
            >
              {t(lineAgentStateKey(firstAgent))}
            </span>
          )}
        </dd>
        <dt className="text-neutral-500">{t("lineCardAutomations")}</dt>
        <dd className={cn("truncate text-right", running > 0 ? "font-medium text-neutral-900" : "text-neutral-600")}>{botsLabel}</dd>
      </dl>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-neutral-50 pt-3.5">
        <span className="min-w-0 truncate text-body-12 text-neutral-500">{lastEvent}</span>
        <div className="flex items-center gap-2">
          {reconnectHere && (
            <button
              type="button"
              className={actionClass({ size: "sm", className: "relative z-10" })}
              disabled={reconnecting}
              aria-label={t("lineReconnectAria", { name: line.label })}
              onClick={() => onReconnect?.(line)}
            >
              <RefreshCw className={cn("size-3.5", reconnecting && "animate-spin motion-reduce:animate-none")} aria-hidden />
              {t("lineReconnect")}
            </button>
          )}
          {!reconnectHere && reconnectOutside && (
            <a
              href={jsynqLinesUrl(line.channel)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("lineReconnectInJsynqAria", { name: line.label })}
              className={actionClass({ variant: "secondary", size: "sm", className: "relative z-10" })}
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {t("lineReconnectInJsynq")}
            </a>
          )}
          <span className="flex items-center gap-0.5 text-body-13 font-semibold text-neutral-600 transition-colors group-hover:text-neutral-900" aria-hidden>
            {t("lineDetails")}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </span>
        </div>
      </div>
    </article>
  )
}
