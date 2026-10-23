"use client"

import { ChevronDown } from "lucide-react"
import { forwardRef, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ADVANCED_PATHS, type FieldIssue, issuesByPath, setAt } from "lib/attende/agents/form"
import { issueKey } from "lib/attende/agents/issueText"
import { pickLocal } from "lib/attende/agents/localize"
import type { AgentForm, AgentTemplate, FieldDescriptor } from "lib/attende/agents/types"
import { plural } from "lib/attende/format"
import { FieldRenderer } from "./FieldRenderer"
import { fieldId } from "./fields/classes"
import { FirstMessagePreview } from "./FirstMessagePreview"
import { useAttendeAgentsT } from "./useAttendeAgentsT"

type Props = {
  template: AgentTemplate
  form: AgentForm
  onChange: (next: AgentForm) => void
  /** Validation problems found on the client. */
  issues?: FieldIssue[]
  /** Free-text messages the backend sent for specific paths (`details.issues`). */
  serverErrors?: Record<string, string>
  /** Render only this step of the template (wizard). Omit to render every step as a section (edit page). */
  stepKey?: string
  /** Show each step's title as a heading. */
  showTitles?: boolean
}

/**
 * The agent form, driven entirely by the template schema from the backend. Used one step at a time by the creation
 * wizard and as one long page by the edit screen, so both always ask the same questions in the same way. Each step
 * starts with its essential questions; answers with a recommended value sit under "Customize" (collapsed, opened by
 * itself when one of them has a problem). The identity step ends with a preview of the first message.
 */
export function AgentSetupForm({ template, form, onChange, issues = [], serverErrors = {}, stepKey, showTitles = false }: Props) {
  const { t, language, appLanguage } = useAttendeAgentsT()
  const byPath = useMemo(() => issuesByPath(issues), [issues])
  const steps = stepKey ? template.steps.filter((s) => s.key === stepKey) : template.steps

  const errorFor = (path: string): string | null => {
    const issue = byPath[path]
    if (issue) return t(issueKey(issue), { limit: issue.limit ?? "" })
    return serverErrors[path] ?? null
  }

  const render = (field: FieldDescriptor) => (
    <FieldRenderer key={field.path} field={field} form={form} onChange={(path, value) => onChange(setAt(form, path, value))} error={errorFor(field.path)} language={language} appLanguage={appLanguage} t={t} />
  )

  return (
    <div className="flex flex-col gap-10">
      {steps.map((step) => {
        const core = step.fields.filter((f) => !ADVANCED_PATHS.includes(f.path))
        const advanced = step.fields.filter((f) => ADVANCED_PATHS.includes(f.path))
        const advancedHasError = advanced.some((f) => !!errorFor(f.path))
        return (
          <section key={step.key} aria-labelledby={showTitles || !stepKey ? `agent-step-${step.key}` : undefined} className="flex flex-col gap-6">
            {(showTitles || !stepKey) && (
              <h2 id={`agent-step-${step.key}`} className="text-body-18 font-semibold text-neutral-900">
                {pickLocal(step.title, language)}
              </h2>
            )}
            {core.map(render)}
            {step.fields.some((f) => f.path === "tone") && <FirstMessagePreview form={form} t={t} />}
            {advanced.length > 0 && (
              <Customize id={`agent-customize-${step.key}`} forceOpen={advancedHasError} label={t("customize")} hint={t("customizeHint")}>
                {advanced.map(render)}
              </Customize>
            )}
          </section>
        )
      })}
    </div>
  )
}

/** "Customize": a plain disclosure button (keyboard and screen reader friendly) over the optional answers. */
function Customize({ id, label, hint, forceOpen, children }: { id: string; label: string; hint: string; forceOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const expanded = open || forceOpen
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-border">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-body-14 font-semibold text-neutral-900">{label}</span>
          <span className="text-body-13 text-neutral-600">{hint}</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-neutral-500 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden />
      </button>
      <div id={id} hidden={!expanded} className="flex flex-col gap-6 px-4 pb-5">
        {children}
      </div>
    </div>
  )
}

type SummaryProps = {
  template: AgentTemplate
  issues: FieldIssue[]
  serverErrors?: Record<string, string>
}

/** "Please fix N items": one link per problem, jumping to the field. Rendered above the step's questions. */
export const IssuesSummary = forwardRef<HTMLDivElement, SummaryProps>(function IssuesSummary({ template, issues, serverErrors = {} }, ref) {
  const { t, language, appLanguage } = useAttendeAgentsT()
  const labelFor = (path: string) => {
    if (path === "workingHours") return t("labelWorkingHours")
    if (path === "language") return t("labelLanguage")
    if (path === "handoff.target") return t("handoffTargetLabel")
    const field = template.steps.flatMap((s) => s.fields).find((f) => f.path === path)
    return field ? pickLocal(field.label, language) : null
  }
  const local = issues.map((issue) => ({ path: issue.path, text: t(issueKey(issue), { limit: issue.limit ?? "" }) }))
  const fromServer = Object.entries(serverErrors)
    .filter(([path]) => !issues.some((i) => i.path === path))
    .map(([path, text]) => ({ path, text }))
  const all = [...local, ...fromServer]
  if (all.length === 0) return null
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="agent-issues-title" className="flex flex-col gap-2 rounded-2xl border border-error-light bg-error-clean p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-error/30">
      <p id="agent-issues-title" className="text-body-14 font-semibold text-error-darkest">
        {plural(all.length, appLanguage, { one: t("issuesSummaryOne"), other: t("issuesSummaryOther") })}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-body-13 text-neutral-900">
        {all.map((item) => {
          const label = labelFor(item.path)
          return (
            <li key={item.path}>
              <a href={`#${fieldId(item.path)}`} className="underline underline-offset-2 hover:text-error-darkest">
                {label ? t("issueField", { field: label, message: item.text }) : item.text}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
})
