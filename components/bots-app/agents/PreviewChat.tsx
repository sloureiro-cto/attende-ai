"use client"

import { AlertCircle, CheckCircle2, FlaskConical, Info, Loader2, Send } from "lucide-react"
import { type FormEvent, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { testAttendeAgentAction } from "actions/attende/agents"
import type { AgentActionError, TestResult } from "lib/attende/agents/types"
import { controlClass } from "./fields/classes"
import { ErrorNotice } from "./PlanNotice"
import { type AttendeAgentsT, useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"

type Turn = { id: number; message: string; result: TestResult }

const CHECK_KEY: Record<string, Parameters<AttendeAgentsT>[0]> = {
  prompt: "checkPrompt",
  lines: "checkLines",
  lines_connected: "checkLinesConnected",
  knowledge: "checkKnowledge",
  working_hours: "checkWorkingHours",
  handoff: "checkHandoff",
}

type Props = {
  agentId: string
  /** Called with every result, so the page can enable "Turn on" once a check passed. */
  onResult?: (result: TestResult) => void
  /** Injectable for tests. */
  run?: typeof testAttendeAgentAction
}

function reasonText(result: TestResult, t: AttendeAgentsT): string {
  switch (result.reason) {
    case "outside_working_hours":
      return t("tryOutside")
    case "handoff_requested":
      return result.handoff?.value ? t("tryHandoff", { value: result.handoff.value }) : t("tryHandoffBuiltin")
    case "no_line_connected":
      return t("tryNoLine")
    default:
      return result.wouldReply ? t("tryReplyOk") : t("testNotPassed")
  }
}

/**
 * A simulation, not a real chat: the backend dry run checks the agent's setup against the typed message (working hours,
 * call-a-person words, connected lines) and nothing is sent or answered by a model. The UI says so at all times.
 */
export function PreviewChat({ agentId, onResult, run = testAttendeAgentAction }: Props) {
  const { t } = useAttendeAgentsT()
  const [turns, setTurns] = useState<Turn[]>([])
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AgentActionError | null>(null)
  const [latest, setLatest] = useState<TestResult | null>(null)
  const seq = useRef(0)
  const lastSent = useRef("")

  const execute = async (text: string) => {
    lastSent.current = text
    setBusy(true)
    setError(null)
    const result = await run(agentId, text ? { message: text } : {})
    setBusy(false)
    if (!result.success) {
      // The typed message stays in the field, so a retry does not lose it.
      setError(result)
      return
    }
    if (text) setMessage((current) => (current.trim() === text ? "" : current))
    setLatest(result.data)
    onResult?.(result.data)
    setTurns((all) => [...all, { id: (seq.current += 1), message: text, result: result.data }])
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (busy || !text) return
    void execute(text)
  }

  return (
    <section aria-labelledby="agent-try-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="agent-try-heading" className="text-body-18 font-semibold text-neutral-900">
          {t("tryTitle")}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-clean px-3 py-1 text-body-12 font-semibold text-info-darkest">
          <FlaskConical className="size-3.5" aria-hidden />
          {t("trySimulation")}
        </span>
      </div>
      <p className="text-body-14 text-neutral-600">{t("diagnosticsHint")}</p>

      {/* A list of rule checks, not a chat: nothing here was written by the AI. */}
      <ul className="flex flex-col gap-2" aria-live="polite" aria-label={t("tryResultLabel")}>
        {turns.length === 0 && <li className="rounded-2xl border border-dashed border-neutral-border p-4 text-center text-body-14 text-neutral-600">{t("tryEmpty")}</li>}
        {turns.map((turn) => (
          <li key={turn.id} className={cn("flex flex-col gap-1 rounded-xl border px-3.5 py-2.5 text-body-14", turn.result.wouldReply ? "border-neutral-border bg-white" : "border-warning-lighter bg-warning-clean")}>
            <span className="flex items-center gap-1 text-body-12 font-semibold text-neutral-600">
              <FlaskConical className="size-3.5" aria-hidden />
              {t("tryResultLabel")}
            </span>
            {turn.message && <span className="break-words text-body-13 text-neutral-700">{t("tryMessageLabel", { message: turn.message })}</span>}
            <span className="text-neutral-900">{reasonText(turn.result, t)}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="agent-try-message">
          {t("tryPlaceholder")}
        </label>
        <input id="agent-try-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("tryPlaceholder")} maxLength={500} className={controlClass} />
        <button type="submit" disabled={busy || !message.trim()} aria-busy={busy || undefined} className={actionClass({ variant: "primary", size: "lg", className: "shrink-0" })}>
          {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {busy ? t("testRunning") : t("trySend")}
        </button>
      </form>

      <ErrorNotice error={error} onRetry={() => void execute(lastSent.current)} />

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-body-14 font-semibold text-neutral-900">{t("tryChecksTitle")}</h3>
          <button type="button" disabled={busy} onClick={() => void execute("")} className={actionClass({ variant: "secondary", size: "sm" })}>
            {latest ? t("testAgain") : t("runCheck")}
          </button>
        </div>
        {latest ? (
          <>
            <ul className="flex flex-col gap-2">
              {latest.checks.map((check) => (
                <li key={check.key} className="flex items-start gap-2.5 text-body-14 text-neutral-800">
                  {check.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-dark" aria-hidden />
                  ) : check.severity === "blocking" ? (
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-error-dark" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0 text-warning-darkest" aria-hidden />
                  )}
                  <span className="flex flex-col">
                    <span>
                      {CHECK_KEY[check.key] ? t(CHECK_KEY[check.key]!) : t("checkOther")}
                      {!check.ok && <span className={cn("ml-1.5 text-body-12 font-semibold", check.severity === "blocking" ? "text-error-darkest" : "text-warning-darkest")}>({check.severity === "blocking" ? t("checkBlocking") : t("checkInfo")})</span>}
                      {check.ok && <span className="sr-only"> ({t("checkOk")})</span>}
                    </span>
                    {!check.ok && check.detail && <span className="text-body-13 text-neutral-600">{check.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className={cn("rounded-xl px-3 py-2 text-body-13 font-semibold", latest.passed ? "bg-success-clean text-success-darkest" : "bg-warning-clean text-warning-darkest")}>{latest.passed ? t("testPassed") : t("testNotPassed")}</p>
          </>
        ) : (
          <p className="text-body-13 text-neutral-400">{t("checksEmpty")}</p>
        )}
      </div>
    </section>
  )
}
