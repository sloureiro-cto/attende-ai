"use client"

import { ExternalLink, RefreshCw } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "components/ui/sheet"
import { type BotsLine, canReconnectHere, reconnectsInJsynq } from "lib/bots-app/lines"
import { ChannelGlyph } from "./ChannelGlyph"
import {
  jsynqLinesUrl,
  LINE_BOT_STATUS_KEY,
  LINE_CHANNEL_KEY,
  LINE_DELIVERY_KEY,
  LINE_IMPACT_KEY,
  LINE_STATE_KEY,
  LINE_TRANSPORT_KEY,
  lineAgentStateKey,
} from "./lineMeta"
import { LineStatusChip } from "./LineStatusChip"
import { BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"
import { useBotsAppT } from "../useBotsAppT"

type Props = {
  line: BotsLine | null
  onOpenChange: (open: boolean) => void
  /** Offered for QR WhatsApp lines that dropped: restarts the pairing here. */
  onReconnect?: (line: BotsLine) => void
  reconnecting?: boolean
  /** The automation list could not be loaded: say so instead of "no automation". */
  botsUnavailable?: boolean
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-body-12 font-medium text-neutral-500">{label}</dt>
      <dd className="text-body-14 text-neutral-800">{children}</dd>
    </div>
  )
}

const itemLinkClass =
  "flex items-center justify-between gap-3 rounded-lg border border-neutral-50 px-3 py-2.5 text-body-14 font-medium text-neutral-800 no-underline transition-colors hover:border-neutral-100 hover:bg-neutral-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"

/** Everything about one channel: its connection, what runs on it (AI agents, automations) and how options are delivered. */
export function LineDetailsSheet({ line, onOpenChange, onReconnect, reconnecting = false, botsUnavailable = false }: Props) {
  const { t } = useBotsAppT()
  const reconnectHere = !!onReconnect && !!line && canReconnectHere(line)
  const reconnectOutside = !!line && reconnectsInJsynq(line)

  return (
    <Sheet open={!!line} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto bg-white p-0 sm:max-w-md" hideCloseButton={false}>
        {line && (
          <>
            <SheetHeader className="gap-3 border-b border-neutral-50 p-5 text-left sm:p-6">
              <div className="flex items-center gap-3.5 pr-6">
                <ChannelGlyph channel={line.channel} />
                <div className="flex min-w-0 flex-col gap-1">
                  <SheetTitle className="truncate text-body-18 font-semibold text-neutral-900">{line.label}</SheetTitle>
                  <SheetDescription className="text-body-13 text-neutral-500">
                    {line.identifier ? `${t(LINE_CHANNEL_KEY[line.channel])} · ${line.identifier}` : t(LINE_CHANNEL_KEY[line.channel])}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 p-5 sm:p-6">
              <section aria-labelledby="line-connection" className="flex flex-col gap-2 rounded-xl border border-neutral-50 bg-neutral-10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 id="line-connection" className="text-body-13 font-semibold text-neutral-900">
                    {t("lineDrawerConnection")}
                  </h4>
                  <LineStatusChip status={line.status} label={t(LINE_STATE_KEY[line.status])} />
                </div>
                <p className="text-body-13 leading-relaxed text-neutral-700">{t(LINE_IMPACT_KEY[line.status])}</p>
                {line.status === "pending_setup" && <p className="text-body-13 leading-relaxed text-neutral-700">{t("lineDrawerSetupHint")}</p>}
              </section>

              <dl className="grid grid-cols-1 gap-4">
                <Row label={t("lineDrawerTransport")}>{t(LINE_TRANSPORT_KEY[line.transport])}</Row>
                <Row label={t("lineDrawerProviderStatus")}>
                  <code className="rounded bg-neutral-10 px-1.5 py-0.5 text-body-12 text-neutral-600">{line.rawStatus}</code>
                </Row>
              </dl>

              <section aria-labelledby="line-agents" className="flex flex-col gap-3">
                <h4 id="line-agents" className="text-body-13 font-semibold text-neutral-900">
                  {t("lineDrawerAgents")}
                </h4>
                {!line.agents ? (
                  <p className="text-body-13 text-neutral-500">{t("lineDrawerAgentsUnavailable")}</p>
                ) : line.agents.length === 0 ? (
                  <p className="text-body-13 text-neutral-500">{t("lineDrawerNoAgents")}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {line.agents.map((agent) => (
                      <li key={agent.id}>
                        <Link
                          href={`${BOTS_ROUTES.agents}/${encodeURIComponent(agent.id)}`}
                          className={itemLinkClass}
                          aria-label={t("lineDrawerOpenAgentAria", { name: agent.name })}
                        >
                          <span className="truncate">{agent.name}</span>
                          <span className={cn("shrink-0 text-body-12 font-semibold", agent.active ? "text-primary-darkest" : "text-neutral-600")}>
                            {t(lineAgentStateKey(agent))}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="line-bots" className="flex flex-col gap-3">
                <h4 id="line-bots" className="text-body-13 font-semibold text-neutral-900">
                  {t("lineDrawerBots")}
                </h4>
                {botsUnavailable ? (
                  <p className="text-body-13 text-neutral-500">{t("lineDrawerBotsUnavailable")}</p>
                ) : line.bots.length === 0 ? (
                  <p className="text-body-13 text-neutral-500">{t("lineDrawerNoBots")}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {line.bots.map((bot) => (
                      <li key={bot.id}>
                        <Link
                          href={`${BOTS_ROUTES.bots}/${encodeURIComponent(bot.id)}`}
                          className={itemLinkClass}
                          aria-label={t("lineDrawerOpenBotAria", { name: bot.name })}
                        >
                          <span className="truncate">{bot.name}</span>
                          <span className="shrink-0 text-body-12 font-semibold text-neutral-600">{t(LINE_BOT_STATUS_KEY[bot.status])}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="line-delivery" className="flex flex-col gap-2 rounded-xl border border-neutral-50 bg-neutral-10 p-4">
                <h4 id="line-delivery" className="text-body-13 font-semibold text-neutral-900">
                  {t("lineDrawerDelivery")}
                </h4>
                <p className="text-body-13 leading-relaxed text-neutral-600">{t(LINE_DELIVERY_KEY[line.choiceDelivery])}</p>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2.5 border-t border-neutral-50 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:p-6">
              <a href={jsynqLinesUrl(line.channel)} target="_blank" rel="noopener noreferrer" className={actionClass({ variant: "secondary" })}>
                <ExternalLink className="size-4" aria-hidden />
                {reconnectOutside ? t("lineReconnectInJsynq") : t("lineManageInJsynq")}
              </a>
              {reconnectHere && (
                <button type="button" className={actionClass()} disabled={reconnecting} onClick={() => onReconnect?.(line)}>
                  <RefreshCw className={reconnecting ? "size-4 animate-spin motion-reduce:animate-none" : "size-4"} aria-hidden />
                  {t("lineReconnect")}
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
