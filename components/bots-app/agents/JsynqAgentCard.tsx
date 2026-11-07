"use client"

import { ExternalLink, Info } from "lucide-react"
import { useState } from "react"
import { setJsynqAgentLineAction } from "actions/attende/agents"
import { showToast } from "app/utils/showToast"
import type { AgentActionError, JsynqAgentView } from "lib/attende/agents/types"
import { AttentionPill, CHANNEL_KEY, isBrokenLine, lineConnectionText, lineName, StatusPill } from "./AgentBadges"
import { ErrorNotice } from "./PlanNotice"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { BOTS_BRAND } from "../brand"
import { ToggleRow } from "../lines/ToggleRow"
import { actionClass } from "../ui/actionStyles"
import { PremiumCard } from "../ui/PremiumCard"

/** The agent's page in the JSYNQ app. */
export const jsynqAgentHref = (agent: Pick<JsynqAgentView, "editPath">) =>
  `${BOTS_BRAND.jsynqUrl.replace(/\/$/, "")}${agent.editPath}`

type Props = { agent: JsynqAgentView; onChange: (next: JsynqAgentView) => void }

/**
 * An agent that exists only in JSYNQ: its name, model and role, and one on/off switch per channel (its JSYNQ binding
 * is paused or resumed; an active automation on the line refuses it with the usual explanation). Everything else is
 * edited in JSYNQ: the card says so and links there. The switch only flips with the server's answer.
 */
export function JsynqAgentCard({ agent, onChange }: Props) {
  const { t, appLanguage } = useAttendeAgentsT()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<AgentActionError | null>(null)

  const toggle = async (bindingId: string, active: boolean) => {
    if (busy) return
    setBusy(bindingId)
    setError(null)
    const result = await setJsynqAgentLineAction(agent.id, bindingId, active)
    setBusy(null)
    if (!result.success) {
      setError(result)
      return
    }
    onChange(result.data)
    showToast("success", t("jsynqLineUpdated"))
  }

  return (
    <PremiumCard className="flex w-full flex-col gap-5 p-5 sm:p-6" data-testid="jsynq-agent-card">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-neutral-border bg-white px-2.5 py-1 text-body-12 font-medium text-neutral-600">
            {t("jsynqBadge")}
          </span>
          <StatusPill agent={{ status: agent.status, lines: agent.lines, form: {} }} t={t} appLanguage={appLanguage} />
          <AttentionPill agent={agent} t={t} appLanguage={appLanguage} />
        </div>
        <h2 className="break-words text-body-18 font-semibold text-neutral-900">{agent.name}</h2>
        {(agent.role || agent.model) && (
          <p className="flex flex-wrap gap-x-2 text-body-13 text-neutral-600">
            {agent.role && <span className="capitalize">{agent.role}</span>}
            {agent.role && agent.model && <span aria-hidden>·</span>}
            {agent.model && <span>{t("jsynqModel", { model: agent.model })}</span>}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-body-12 font-semibold uppercase tracking-wide text-neutral-500">{t("linesServed")}</h3>
        {agent.lines.length === 0 ? (
          <p className="text-body-13 text-neutral-500">{t("jsynqNoChannels")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {agent.lines.map((line) => {
              const channel = t(CHANNEL_KEY[line.channel])
              const on = line.active === true
              return (
                <ToggleRow
                  key={line.bindingId}
                  title={lineName(line, t)}
                  description={`${
                    on ? t("jsynqLineOn", { channel }) : t("jsynqLineOff", { channel })
                  } · ${lineConnectionText(line, t)}`}
                  checked={on}
                  disabled={busy !== null || (!on && line.exists === false)}
                  onCheckedChange={(next) => toggle(line.bindingId, next)}
                  className={isBrokenLine(line) ? "border-warning-lighter" : undefined}
                />
              )
            })}
          </div>
        )}
        <ErrorNotice error={error} lineName={(l) => agent.lines.find((x) => x.sessionId === l.sessionId)?.label} />
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <p className="flex items-start gap-2 text-body-13 text-neutral-600">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("jsynqNotEditable")}
        </p>
        <a
          href={jsynqAgentHref(agent)}
          target="_blank"
          rel="noopener noreferrer"
          className={actionClass({ variant: "secondary", size: "lg" })}
        >
          <ExternalLink className="size-4" aria-hidden />
          {t("jsynqEdit")}
          <span className="sr-only">: {agent.name}</span>
        </a>
      </div>
    </PremiumCard>
  )
}
