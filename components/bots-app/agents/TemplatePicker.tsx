"use client"

import { ArrowRight, Check, Handshake, Headset, Target } from "lucide-react"
import { type ComponentType, type KeyboardEvent, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { EXAMPLE_CONVERSATIONS } from "lib/attende/agents/samples"
import type { AgentTemplate, TemplateKey } from "lib/attende/agents/types"
import { type AttendeAgentsT, useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"

type Key = Parameters<AttendeAgentsT>[0]

/** Outcome first, technical role second. Internal template keys stay as they are. */
export const TEMPLATE_COPY: Record<TemplateKey, { Icon: ComponentType<{ className?: string }>; tone: string; outcome: Key; role: Key; description: Key }> = {
  sdr: { Icon: Target, tone: "bg-info-clean text-info-darkest", outcome: "templateOutcomeSdr", role: "templateRoleSdr", description: "templateDescSdr" },
  closer: { Icon: Handshake, tone: "bg-warning-clean text-warning-darkest", outcome: "templateOutcomeCloser", role: "templateRoleCloser", description: "templateDescCloser" },
  receptionist: { Icon: Headset, tone: "bg-primary-clean text-primary-dark", outcome: "templateOutcomeReceptionist", role: "templateRoleReceptionist", description: "templateDescReceptionist" },
}

type Props = {
  templates: AgentTemplate[]
  onChoose: (key: TemplateKey) => void
  /** Pre-selected card (the model chosen before, e.g. after "Choose another model"). */
  selected?: TemplateKey | null
}

/**
 * The three ready-made models as one radio group: arrow keys move the choice, Enter (or the button below) continues.
 * Each card says what the agent achieves, its technical role in small text and an example conversation clearly
 * labelled as an illustration (it does not mean hours, prices or services are configured).
 */
export function TemplatePicker({ templates, onChoose, selected: initial = null }: Props) {
  const { t, language } = useAttendeAgentsT()
  const [selected, setSelected] = useState<TemplateKey | null>(initial && templates.some((x) => x.key === initial) ? initial : null)
  const refs = useRef<Array<HTMLDivElement | null>>([])
  const chosen = templates.find((x) => x.key === selected) ?? null
  // Roving focus: the selected card (or the first one) is the only tab stop of the group.
  const tabStop = Math.max(0, templates.findIndex((x) => x.key === selected))

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown"
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp"
    if (forward || backward) {
      event.preventDefault()
      const next = (index + (forward ? 1 : -1) + templates.length) % templates.length
      setSelected(templates[next]!.key)
      refs.current[next]?.focus()
    } else if (event.key === " ") {
      event.preventDefault()
      setSelected(templates[index]!.key)
    } else if (event.key === "Enter") {
      event.preventDefault()
      onChoose(templates[index]!.key)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-3 md:gap-5" role="radiogroup" aria-label={t("pickerTitle")}>
        {templates.map((template, index) => {
          const copy = TEMPLATE_COPY[template.key]
          const turns = EXAMPLE_CONVERSATIONS[template.key][language]
          const active = selected === template.key
          return (
            <div
              key={template.key}
              ref={(el) => {
                refs.current[index] = el
              }}
              role="radio"
              aria-checked={active}
              aria-labelledby={`agent-template-${template.key}-title`}
              aria-describedby={`agent-template-${template.key}-desc`}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => setSelected(template.key)}
              onDoubleClick={() => onChoose(template.key)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "flex h-full cursor-pointer flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6",
                active ? "border-primary-dark ring-2 ring-primary/25" : "border-neutral-border hover:border-primary-lighter"
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", copy.tone)} aria-hidden>
                  <copy.Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h3 id={`agent-template-${template.key}-title`} className="text-body-18 font-semibold leading-tight text-neutral-900">
                    {t(copy.outcome)}
                  </h3>
                  <p className="text-body-13 text-neutral-600">{t(copy.role)}</p>
                </div>
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", active ? "border-primary-dark bg-primary-dark text-white" : "border-neutral-200 text-transparent")} aria-hidden>
                  <Check className="size-4" />
                </span>
              </div>

              <p id={`agent-template-${template.key}-desc`} className="text-body-14 text-neutral-700">
                {t(copy.description)}
              </p>

              <div className="mt-auto flex flex-col gap-2 rounded-xl bg-neutral-10 p-3.5" role="group" aria-label={t("exampleTitle")}>
                <span className="text-body-12 font-semibold text-neutral-600">{t("exampleTitle")}</span>
                {turns.map((turn, i) => (
                  <p
                    key={i}
                    className={cn("max-w-[90%] rounded-2xl px-3 py-2 text-body-13", turn.from === "agent" ? "self-end bg-primary-clean text-neutral-800" : "self-start bg-white text-neutral-700 shadow-sm")}
                  >
                    <span className="sr-only">{turn.from === "agent" ? t("agentLabel") : t("customerLabel")}: </span>
                    {turn.text}
                  </p>
                ))}
                <span className="text-body-12 text-neutral-600">{t("exampleNote")}</span>
              </div>

              <span className={cn("text-body-13 font-semibold", active ? "text-primary-dark" : "text-neutral-500")} aria-hidden>
                {active ? t("pickerSelected") : t("pickerSelect")}
              </span>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-1 flex flex-col gap-2 border-t border-neutral-50 bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end lg:bottom-0">
        {!chosen && (
          <p className="text-body-13 text-neutral-600" role="status">
            {t("pickerNoneSelected")}
          </p>
        )}
        <button type="button" disabled={!chosen} onClick={() => chosen && onChoose(chosen.key)} className={actionClass({ variant: "primary", size: "lg" })}>
          {chosen ? t("pickerContinue", { name: t(TEMPLATE_COPY[chosen.key].outcome) }) : t("next")}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
