"use client"

import { AlertTriangle } from "lucide-react"
import Link from "next/link"
import { agentErrorKey, agentErrorMessage, isPlanError, isRetryable } from "lib/attende/agents/errors"
import type { AgentActionError, AgentLine } from "lib/attende/agents/types"
import { formatList } from "lib/attende/format"
import type { AttendeAgentsKey } from "lib/i18n/translations/attende/agents"
import { CHANNEL_KEY } from "./AgentBadges"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"

type Props = {
  error: AgentActionError | null
  onRetry?: () => void
  /** Replaces the message of one error key where the generic wording does not fit (e.g. validation outside a form). */
  overrides?: Partial<Record<ReturnType<typeof agentErrorKey>, AttendeAgentsKey>>
  /** Name of one of the agent's lines, for errors that list lines (an automation runs on them). */
  lineName?: (line: Pick<AgentLine, "sessionId"> & { channel: string }) => string | undefined
}

/**
 * Friendly message for any failed agent request, from the stable `details.code`. Plan problems (limit reached, trial
 * over, no Attende plan) get a "See plans" link to /billing; errors a retry can fix get "Try again". When the code is
 * unknown, the server's own message is shown under the friendly one so the real cause is not hidden.
 */
export function ErrorNotice({ error, onRetry, overrides, lineName }: Props) {
  const { t, appLanguage } = useAttendeAgentsT()
  if (!error) return null
  const plan = isPlanError(error)
  const { key, params } = agentErrorMessage(error)
  // An automation runs on some lines: say which ones (by name, never by id) and where to pause it.
  const automationLines =
    key === "errorAutomationOnLine"
      ? Array.from(
          new Set(
            (error.details?.lines ?? []).map((l) => {
              const name = lineName?.(l)?.trim()
              const channelKey = CHANNEL_KEY[l.channel as keyof typeof CHANNEL_KEY]
              const channel = channelKey ? t(channelKey) : l.channel
              return name ? `${name} (${channel})` : channel
            })
          )
        )
      : []
  const text =
    key === "errorAutomationOnLine"
      ? automationLines.length
        ? t("errorAutomationOnLine", { lines: formatList(automationLines, appLanguage) })
        : t("errorAutomationOnLineNoLines")
      : t(overrides?.[key] ?? key, params)
  const automationLink = key === "errorAutomationOnLine"
  const serverDetail = key === "errorGeneric" && error.message && error.message !== "network" ? error.message : null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-warning-lighter bg-warning-clean p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-darkest" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <p className="text-body-14 font-medium text-neutral-900">{text}</p>
        {serverDetail && <p className="break-words text-body-13 text-neutral-700">{t("errorServerDetail", { message: serverDetail })}</p>}
        {(plan || automationLink || (onRetry && isRetryable(error))) && (
          <div className="flex flex-wrap gap-2">
            {automationLink && (
              <Link href="/bots" className={actionClass({ variant: "secondary", size: "sm" })}>
                {t("openAutomations")}
              </Link>
            )}
            {plan && (
              <Link href="/billing" className={actionClass({ variant: "secondary", size: "sm" })}>
                {t("seePlans")}
              </Link>
            )}
            {onRetry && isRetryable(error) && (
              <button type="button" onClick={onRetry} className={actionClass({ variant: "secondary", size: "sm" })}>
                {t("retry")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
