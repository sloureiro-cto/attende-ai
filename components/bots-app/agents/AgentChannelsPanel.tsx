"use client"

import { Link2Off, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { useId, useState } from "react"
import { updateAttendeAgentSetupAction } from "actions/attende/agents"
import { showToast } from "app/utils/showToast"
import { lineKey, MAX_AGENT_LINES } from "lib/attende/agents/status"
import type { AgentActionError, AgentLine, AgentLineView, AgentTemplate, AgentView } from "lib/attende/agents/types"
import type { BotsLine } from "lib/bots-app/lines"
import { CHANNEL_KEY, CHANNEL_STATE_KEY, lineName, LineText } from "./AgentBadges"
import { ConfirmDialog } from "./ConfirmDialog"
import { controlClass } from "./fields/classes"
import { ErrorNotice } from "./PlanNotice"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { ChannelGlyph } from "../lines/ChannelGlyph"
import { actionClass } from "../ui/actionStyles"

type Props = {
  agent: AgentView
  /** The workspace's channels (null when they could not be loaded). */
  lines: BotsLine[]
  linesFailed?: boolean
  /** Template of the agent: only its available channel types can be attached. Null when templates failed. */
  template: AgentTemplate | null
  onChange: (next: AgentView) => void
}

type Pending = { kind: "attach" | "detach"; key: string } | null

const toLine = ({ channel, sessionId }: AgentLine): AgentLine => ({ channel, sessionId })

/**
 * The agent's channels on its page: attach one, detach one. Each change is a PATCH /:id/setup with the saved form and
 * the new channel list (the API creates/removes the per-channel connection and keeps the agent's on/paused state for
 * new channels). Nothing changes on screen until the server confirms: the row being changed shows "Saving…", and a
 * failure leaves the list as it was with the reason.
 */
export function AgentChannelsPanel({ agent, lines, linesFailed = false, template, onChange }: Props) {
  const { t } = useAttendeAgentsT()
  const selectId = useId()
  const [choice, setChoice] = useState("")
  const [pending, setPending] = useState<Pending>(null)
  const [error, setError] = useState<AgentActionError | null>(null)
  const [toDetach, setToDetach] = useState<AgentLineView | null>(null)
  /** Attaching to an agent that is on starts answering there at once: said before, in a confirmation. */
  const [confirmAttach, setConfirmAttach] = useState(false)

  const attachedKeys = new Set(agent.lines.map(lineKey))
  const allowed = template ? new Set(template.channels.filter((c) => c.available).map((c) => c.key)) : null
  const candidates = lines.filter((l) => !attachedKeys.has(lineKey({ channel: l.channel, sessionId: l.id })) && (!allowed || allowed.has(l.channel)))
  const atMax = agent.lines.length >= MAX_AGENT_LINES
  const busy = pending !== null

  const save = async (next: AgentLine[], kind: "attach" | "detach", key: string) => {
    setPending({ kind, key })
    setError(null)
    const result = await updateAttendeAgentSetupAction(agent.id, { form: agent.form, lines: next })
    setPending(null)
    if (!result.success) {
      setError(result)
      return false
    }
    onChange(result.data)
    showToast("success", kind === "attach" ? t("channelsAttached") : t("channelsDetached"))
    return true
  }

  const chosenLine = candidates.find((l) => lineKey({ channel: l.channel, sessionId: l.id }) === choice)
  const attach = async () => {
    const line = chosenLine
    if (!line || busy) return
    const added: AgentLine = { channel: line.channel, sessionId: line.id }
    if (await save([...agent.lines.map(toLine), added], "attach", choice)) {
      setChoice("")
      setConfirmAttach(false)
    }
  }

  const detach = async () => {
    if (!toDetach || busy) return
    const key = lineKey(toDetach)
    const ok = await save(
      agent.lines.filter((l) => lineKey(l) !== key).map(toLine),
      "detach",
      key
    )
    if (ok) setToDetach(null)
  }

  return (
    <section aria-labelledby="agent-channels-heading" aria-busy={busy || undefined} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="agent-channels-heading" className="text-body-16 font-semibold text-neutral-900">
          {t("linesServed")}
        </h2>
        <p className="text-body-13 text-neutral-600">{t("channelsHint")}</p>
      </div>

      {agent.lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-border p-4 text-body-14 text-neutral-500">{t("noLines")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-50 rounded-2xl border border-neutral-border" aria-label={t("linesServed")}>
          {agent.lines.map((line) => {
            const key = lineKey(line)
            const removing = pending?.kind === "detach" && pending.key === key
            return (
              <li key={key} className="flex flex-wrap items-center gap-3 p-3" aria-busy={removing || undefined}>
                <ChannelGlyph channel={line.channel} className="size-9 rounded-lg" />
                <LineText line={line} t={t} showAgentState />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError(null)
                    setToDetach(line)
                  }}
                  aria-label={t("channelsDetachNamed", { name: lineName(line, t) })}
                  className={actionClass({ variant: "ghost", size: "sm", className: "ml-auto" })}
                >
                  {removing ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Link2Off className="size-4" aria-hidden />}
                  {removing ? t("saving") : t("channelsDetach")}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {atMax ? (
        <p className="text-body-13 text-neutral-500">{t("channelsMax", { limit: MAX_AGENT_LINES })}</p>
      ) : linesFailed && candidates.length === 0 ? (
        <p className="text-body-13 text-neutral-500">{t("linesLoadError")}</p>
      ) : lines.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-body-13 text-neutral-500">{t("linesNoneTitle")}</p>
          <Link href="/lines" className={actionClass({ variant: "secondary", size: "md" })}>
            {t("linesConnect")}
          </Link>
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-body-13 text-neutral-500">{t("channelsAllAttached")}</p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (agent.status === "live") {
              setError(null)
              setConfirmAttach(true)
            } else void attach()
          }}
        >
          <label htmlFor={selectId} className="text-body-13 font-medium text-neutral-700">
            {t("channelsAddLabel")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select id={selectId} value={choice} disabled={busy} onChange={(e) => setChoice(e.target.value)} className={controlClass}>
              <option value="">{t("channelsAddPlaceholder")}</option>
              {candidates.map((line) => {
                const key = lineKey({ channel: line.channel, sessionId: line.id })
                return (
                  <option key={key} value={key}>
                    {t("channelsOption", { name: line.label || line.identifier || t("lineUnnamed"), channel: t(CHANNEL_KEY[line.channel]), state: t(CHANNEL_STATE_KEY[line.status]) })}
                  </option>
                )
              })}
            </select>
            <button type="submit" disabled={!choice || busy} className={actionClass({ variant: "primary", size: "lg", className: "shrink-0" })}>
              {pending?.kind === "attach" ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              {pending?.kind === "attach" ? t("saving") : t("channelsAdd")}
            </button>
          </div>
          <p className="text-body-12 text-neutral-500">{agent.status === "live" ? t("channelsNewWhenLive") : t("channelsNewWhenPaused")}</p>
        </form>
      )}

      {!toDetach && !confirmAttach && <ErrorNotice error={error} overrides={{ errorValidation: "channelsErrorValidation" }} />}

      <ConfirmDialog
        open={confirmAttach}
        onOpenChange={(open) => !open && setConfirmAttach(false)}
        title={t("attachLiveTitle")}
        description={t("attachLiveBody", { name: chosenLine ? chosenLine.label || chosenLine.identifier || t("lineUnnamed") : "" })}
        confirmLabel={pending?.kind === "attach" ? t("saving") : t("attachLiveConfirm")}
        cancelLabel={t("cancel")}
        onConfirm={() => void attach()}
        busy={pending?.kind === "attach"}
      >
        {confirmAttach && <ErrorNotice error={error} overrides={{ errorValidation: "channelsErrorValidation" }} />}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!toDetach}
        onOpenChange={(open) => !open && setToDetach(null)}
        title={t("channelsDetachTitle")}
        description={t("channelsDetachBody", { name: toDetach ? lineName(toDetach, t) : "" })}
        confirmLabel={pending?.kind === "detach" ? t("saving") : t("channelsDetach")}
        cancelLabel={t("cancel")}
        onConfirm={() => void detach()}
        busy={pending?.kind === "detach"}
        tone="danger"
      >
        {agent.lines.length === 1 && <p className="rounded-xl bg-warning-clean p-3 text-body-13 text-neutral-900">{t("channelsDetachLast")}</p>}
        {toDetach && <ErrorNotice error={error} overrides={{ errorValidation: "channelsErrorValidation" }} />}
      </ConfirmDialog>
    </section>
  )
}
