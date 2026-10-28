"use client"

import { RotateCcw, Send, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { previewAdvancedAutomationAction } from "actions/messaging-automations/advancedAutomations"
import { automationErrorText } from "components/automations/ui/automationErrorText"
import { automationsKey, useAutomationsT } from "components/automations/ui/useAutomationsT"
import Button from "components/Button/Button"
import IconButton from "components/IconButton/IconButton"
import TextInput from "components/TextInput/TextInput"
import type { BotDraft } from "lib/automations/botBuilderState"
import type { AutomationChannel, PreviewEffect, AdvancedAutomationChoice } from "lib/automations/types"

type Bubble =
  | { id: number; side: "bot"; text: string; warnings: string[] }
  | { id: number; side: "contact"; text: string }
  | { id: number; side: "system"; text: string }

const SILENT_EFFECTS = new Set(["stat", "run_ended"])

type Props = { draft: BotDraft; onClose: () => void }

/** Dry-run chat against the real engine (nothing is sent). Runs on the unsaved draft. */
export function BotPreviewPanel({ draft, onClose }: Props) {
  const { t } = useAutomationsT()
  const channel: AutomationChannel = draft.channels[0]?.channel ?? "whatsapp"
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [state, setState] = useState<Record<string, unknown> | undefined>()
  const [choices, setChoices] = useState<AdvancedAutomationChoice[]>([])
  const [replyMode, setReplyMode] = useState<"none" | "buttons" | "list" | "free">("none")
  const [finished, setFinished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState("")
  const seq = useRef(0)
  // Bumped on restart: a response from the previous conversation must not leak into the new one.
  const epoch = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [bubbles])

  const systemLabel = useCallback(
    (effect: PreviewEffect) =>
      t(automationsKey(effect.type === "handoff" && effect.to === "ai" ? "advancedAutomationEffect_handoff_ai" : `advancedAutomationEffect_${effect.type}`)),
    [t]
  )

  const run = useCallback(
    async (
      event: { type: "start" } | { type: "inbound"; text: string; optionId?: string } | { type: "timer" },
      prev: Record<string, unknown> | undefined
    ) => {
      const mine = epoch.current
      setBusy(true)
      setError(null)
      const res = await previewAdvancedAutomationAction({
        automation: { startNodeId: draft.startNodeId, nodes: draft.nodes, edges: draft.edges },
        channel,
        event,
        ...(prev ? { state: prev } : {}),
      })
      if (mine !== epoch.current) return
      setBusy(false)
      if (!res.success) {
        setError(res.issues?.[0]?.message || automationErrorText(res, t, "advancedAutomationPreviewError"))
        return
      }
      const next: Bubble[] = []
      let lastChoices: AdvancedAutomationChoice[] = []
      let lastMode: typeof replyMode = "none"
      for (const effect of res.data.effects) {
        if (SILENT_EFFECTS.has(effect.type)) continue
        if (effect.type === "send_message") {
          const e = effect as Extract<PreviewEffect, { type: "send_message" }>
          next.push({
            id: ++seq.current,
            side: "bot",
            text: e.delivery?.text ?? e.text,
            warnings: e.delivery?.warnings ?? [],
          })
          lastChoices = e.options ?? []
          lastMode = e.replyMode
        } else {
          next.push({ id: ++seq.current, side: "system", text: systemLabel(effect) })
        }
      }
      setBubbles((b) => [...b, ...next])
      setState(res.data.state)
      setFinished(res.data.finished)
      setChoices(lastChoices)
      setReplyMode(lastMode)
    },
    [channel, draft.edges, draft.nodes, draft.startNodeId, systemLabel]
  )

  const restart = useCallback(() => {
    epoch.current += 1
    setBusy(false)
    setBubbles([])
    setState(undefined)
    setChoices([])
    setReplyMode("none")
    setFinished(false)
    setText("")
    void run({ type: "start" }, undefined)
  }, [run])

  // Start once when the panel opens; later edits don't restart a conversation in progress.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void run({ type: "start" }, undefined)
  }, [run])

  const send = (value: string, optionId?: string) => {
    const trimmed = value.trim()
    if (!trimmed || busy || finished) return
    setBubbles((b) => [...b, { id: ++seq.current, side: "contact", text: trimmed }])
    setText("")
    setChoices([])
    void run({ type: "inbound", text: trimmed, ...(optionId ? { optionId } : {}) }, state)
  }

  const canType = !finished && (replyMode === "free" || (choices.length === 0 && replyMode !== "none"))

  return (
    <aside
      aria-label={t("advancedAutomationPreviewTitle")}
      className="absolute inset-y-4 right-4 z-20 flex w-[340px] flex-col overflow-hidden rounded-lg border border-neutral-border bg-white shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-neutral-50 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-body-14 font-semibold text-neutral-900">{t("advancedAutomationPreviewTitle")}</p>
          <p className="text-body-11 text-neutral-500">{t("advancedAutomationPreviewHint")}</p>
        </div>
        <IconButton type="button" size="large" variant="ghost" aria-label={t("advancedAutomationPreviewRestart")} onClick={restart} icon={<RotateCcw />} />
        <IconButton type="button" size="large" variant="ghost" aria-label={t("advancedAutomationClose")} onClick={onClose} icon={<X />} />
      </div>

      <div ref={scroller} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-neutral-10 p-3" aria-live="polite">
        {bubbles.map((b) =>
          b.side === "system" ? (
            <p key={b.id} className="self-center rounded-full bg-white px-2.5 py-1 text-body-11 text-neutral-500">
              {b.text}
            </p>
          ) : (
            <div
              key={b.id}
              className={cn("flex max-w-[85%] flex-col gap-1", b.side === "contact" ? "self-end" : "self-start")}
            >
              <p
                className={cn(
                  "whitespace-pre-wrap rounded-lg px-3 py-2 text-body-13",
                  b.side === "contact" ? "bg-primary text-white" : "bg-white text-neutral-900 shadow-sm"
                )}
              >
                {b.text}
              </p>
              {b.side === "bot" && b.warnings.length > 0 ? (
                <p className="text-body-11 text-warning-darkest">{b.warnings.join(" ")}</p>
              ) : null}
            </div>
          )
        )}
        {finished ? (
          <p className="self-center text-body-12 font-medium text-neutral-500">{t("advancedAutomationPreviewEnded")}</p>
        ) : null}
        {error ? <p className="rounded-md bg-error-clean px-3 py-2 text-body-12 text-error-darkest">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-50 p-3">
        {!finished && choices.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {choices.map((c) => (
              <Button key={c.id} type="button" size="small" variant="primary" style="outline" disabled={busy} onClick={() => send(c.label, c.id)}>
                {c.label}
              </Button>
            ))}
          </div>
        ) : null}
        {canType || (!finished && choices.length > 0) ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              send(text)
            }}
          >
            <TextInput
              size="small"
              aria-label={t("advancedAutomationPreviewReply")}
              placeholder={t("advancedAutomationPreviewReply")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              containerClassName="min-w-0 flex-1"
              hideErrorMessage
            />
            <Button
              size="small"
              type="submit"
              disabled={busy || !text.trim()}
              startIcon={<Send className="size-3.5" />}
              aria-label={t("advancedAutomationPreviewSend")}
            />
          </form>
        ) : null}
        {!finished ? (
          <Button
            size="small"
            variant="secondary"
            style="outline"
            disabled={busy}
            onClick={() => void run({ type: "timer" }, state)}
          >
            {t("advancedAutomationPreviewTimer")}
          </Button>
        ) : (
          <Button size="small" variant="secondary" style="outline" onClick={restart}>
            {t("advancedAutomationPreviewRestart")}
          </Button>
        )}
        <p className="text-body-11 text-neutral-500">{t("advancedAutomationPreviewCaveat")}</p>
      </div>
    </aside>
  )
}
