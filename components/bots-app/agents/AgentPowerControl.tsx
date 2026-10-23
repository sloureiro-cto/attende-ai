"use client"

import { Loader2, Pause, Play } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { goLiveAttendeAgentAction, pauseAttendeAgentAction } from "actions/attende/agents"
import { showToast } from "app/utils/showToast"
import { goLiveWarnings } from "lib/attende/agents/status"
import type { AgentActionError, AgentView } from "lib/attende/agents/types"
import { localeOf, plural } from "lib/attende/format"
import { CHANNEL_KEY } from "./AgentBadges"
import { ConfirmDialog } from "./ConfirmDialog"
import { ErrorNotice } from "./PlanNotice"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"

type Props = {
  agent: AgentView
  onChange: (next: AgentView) => void
  /** `button`: one action button (cards). `switch`: an on/off switch with its label (agent page). */
  appearance?: "button" | "switch"
  className?: string
  /** Text of the "turn on" button (the wizard says "Turn answering on"). */
  goLiveLabel?: string
  /** Turning on is not possible yet (e.g. the agent knows too little about the business); the parent says why. Pausing is never blocked. */
  goLiveBlocked?: boolean
}

const WARNING_KEY = { not_tested: "goLiveWarnNotTested", no_documents: "goLiveWarnNoDocs" } as const

/**
 * Turns the whole agent on or pauses it on every channel, always after a confirmation that says what will happen
 * and that taking over ONE conversation is done in the inbox instead. The visual state only changes with the
 * server's answer (no optimistic flip): while the request runs the control shows "Updating…", and on failure the
 * dialog stays open with the reason (no channel, a channel offline, plan limits) and the previous state stays.
 */
export function AgentPowerControl({ agent, onChange, appearance = "button", className, goLiveLabel, goLiveBlocked = false }: Props) {
  const { t, appLanguage } = useAttendeAgentsT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AgentActionError | null>(null)
  const live = agent.status === "live"
  const noLines = agent.lines.length === 0
  const name = String(agent.form?.assistantName || agent.name || "")
  const warnings = live ? [] : goLiveWarnings(agent)
  const count = agent.lines.length

  const openDialog = () => {
    if (busy) return
    setError(null)
    setOpen(true)
  }

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    const result = live ? await pauseAttendeAgentAction(agent.id) : await goLiveAttendeAgentAction(agent.id)
    setBusy(false)
    if (!result.success) {
      setError(result)
      return
    }
    setOpen(false)
    onChange(result.data)
    showToast("success", result.data.status === "live" ? t("wentLive") : t("wentPaused"))
  }

  const disabled = !live && (noLines || goLiveBlocked)
  const channelNames = agent.lines.map((l) => `${l.label || t("lineUnnamed")} (${t(CHANNEL_KEY[l.channel])})`)
  const trigger =
    appearance === "switch" ? (
      <button
        type="button"
        role="switch"
        aria-checked={live}
        aria-label={t("powerSwitchAria")}
        aria-describedby={`agent-power-state-${agent.id}`}
        aria-busy={busy || undefined}
        disabled={disabled}
        onClick={openDialog}
        className={cn(
          "inline-flex min-h-11 items-center gap-3 rounded-xl px-1 text-body-14 font-semibold text-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      >
        <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", live ? "bg-primary-dark" : "bg-neutral-200")} aria-hidden>
          <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] motion-reduce:transition-none", live ? "left-[22px]" : "left-0.5")} />
        </span>
        <span id={`agent-power-state-${agent.id}`} className="inline-flex items-center gap-1.5">
          {busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {busy ? t("powerBusy") : live ? t("statusLive") : t("switchOff")}
        </span>
      </button>
    ) : (
      <button type="button" disabled={disabled} aria-busy={busy || undefined} onClick={openDialog} className={actionClass({ variant: live ? "secondary" : "primary", size: "lg", className })}>
        {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : live ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        {busy ? t("powerBusy") : live ? t("actionPause") : (goLiveLabel ?? t("actionGoLive"))}
        <span className="sr-only">: {agent.name}</span>
      </button>
    )

  return (
    <>
      {trigger}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={live ? t("pauseTitle") : t("goLiveTitle")}
        description={
          live
            ? plural(count, appLanguage, { one: t("pauseBodyOne", { agent: name }), other: t("pauseBodyOther", { agent: name }) })
            : plural(count, appLanguage, { one: t("goLiveBodyOne", { agent: name }), other: t("goLiveBodyOther", { agent: name }) })
        }
        confirmLabel={busy ? t("powerBusy") : live ? t("pauseConfirm") : t("goLiveConfirm")}
        cancelLabel={t("goLiveCancel")}
        onConfirm={() => void confirm()}
        busy={busy}
      >
        {channelNames.length > 0 && <p className="text-body-13 font-medium text-neutral-900">{t("goLiveChannels", { channels: joinList(channelNames, appLanguage) })}</p>}
        <p className="text-body-13 text-neutral-700">{live ? t("pauseScope") : t("goLiveScope")}</p>
        {warnings.length > 0 && (
          <ul className="flex list-disc flex-col gap-1.5 rounded-2xl bg-warning-clean py-3.5 pl-8 pr-3.5 text-body-13 text-neutral-900">
            {warnings.map((w) => (
              <li key={w}>{t(WARNING_KEY[w])}</li>
            ))}
          </ul>
        )}
        <ErrorNotice error={error} />
      </ConfirmDialog>
    </>
  )
}

function joinList(items: string[], appLanguage: string): string {
  try {
    return new Intl.ListFormat(localeOf(appLanguage), { style: "long", type: "conjunction" }).format(items)
  } catch {
    return items.join(", ")
  }
}
