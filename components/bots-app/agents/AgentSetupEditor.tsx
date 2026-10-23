"use client"

import { CheckCircle2, Loader2, Pencil } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { getAttendeAgentAction, updateAttendeAgentSetupAction } from "actions/attende/agents"
import { cleanForm, type FieldIssue, issuesByPath, setAt, validateField, validateForm } from "lib/attende/agents/form"
import { summarizeHours } from "lib/attende/agents/hours"
import { issueKey, serverIssuesToMap } from "lib/attende/agents/issueText"
import { pickLocal } from "lib/attende/agents/localize"
import { DAY_LABELS } from "lib/attende/agents/samples"
import { applySection, DEFAULT_MAX_REPLIES, SECTION_KEYS, sectionChanged, sectionConflict, sectionFields, type SectionKey, sectionOf, type SectionSummary, summarizeSection } from "lib/attende/agents/sections"
import type { AgentActionError, AgentForm, AgentTemplate, AgentView } from "lib/attende/agents/types"
import { plural } from "lib/attende/format"
import { ConfirmDialog } from "./ConfirmDialog"
import { FieldRenderer } from "./FieldRenderer"
import { HandoffTargetText } from "./fields/HandoffTargetField"
import { FirstMessagePreview } from "./FirstMessagePreview"
import { ErrorNotice } from "./PlanNotice"
import { type AttendeAgentsT, useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"

type Props = {
  agent: AgentView
  template: AgentTemplate
  onSaved: (next: AgentView) => void
}

type Key = Parameters<AttendeAgentsT>[0]
const GOAL_TITLE: Record<AgentTemplate["key"], Key> = { sdr: "sectionGoalSdr", closer: "sectionGoalCloser", receptionist: "sectionGoalReceptionist" }
const TITLE: Record<Exclude<SectionKey, "goal">, Key> = { business: "sectionBusiness", identity: "sectionIdentity", hours: "sectionHours", handoff: "sectionHandoff", advanced: "sectionAdvanced" }
const LANGUAGE_KEY: Record<string, Key> = { pt: "languagePt", en: "languageEn", es: "languageEs" }

type Open = { key: SectionKey; draft: AgentForm; base: { form: AgentForm; updatedAt: string } }

/**
 * Edit an existing agent: compact sections with a summary of the saved answers and "Edit". One section opens at a
 * time, with its own Save/Cancel. The API saves the whole form, so Save re-reads the agent, writes only this
 * section's answers over the latest saved form and sends that (other sections are never lost). The API has no
 * version field: `updatedAt` detects that someone else changed THIS section meanwhile, and the user reloads it.
 * Channels are not sent (PATCH without `lines` keeps them): they are managed on the Overview tab.
 */
export function AgentSetupEditor({ agent, template, onSaved }: Props) {
  const { t, language, appLanguage } = useAttendeAgentsT()
  const [open, setOpen] = useState<Open | null>(null)
  const [issues, setIssues] = useState<FieldIssue[]>([])
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [otherInvalid, setOtherInvalid] = useState<SectionKey[]>([])
  const [error, setError] = useState<AgentActionError | null>(null)
  const [conflict, setConflict] = useState<AgentView | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ key: SectionKey; live: boolean } | null>(null)
  const [pending, setPending] = useState<SectionKey | "close" | null>(null)

  const sections = useMemo(() => SECTION_KEYS.filter((k) => sectionFields(template, k).length > 0), [template])
  const titleOf = (key: SectionKey) => t(key === "goal" ? GOAL_TITLE[template.key] : TITLE[key])
  const pathsOf = (key: SectionKey) => sectionFields(template, key).map((f) => f.path)
  const dirty = !!open && sectionChanged(open.draft, open.base.form, pathsOf(open.key))

  // Leaving the page (reload, close, typed URL) with unsaved answers asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const reset = () => {
    setIssues([])
    setServerErrors({})
    setOtherInvalid([])
    setError(null)
    setConflict(null)
  }

  const start = (key: SectionKey) => {
    reset()
    setSaved(null)
    setOpen({ key, draft: agent.form, base: { form: agent.form, updatedAt: agent.updatedAt } })
    requestAnimationFrame(() => document.getElementById(`agent-section-${key}-body`)?.querySelector<HTMLElement>("input, textarea, select, button[role=radio]")?.focus())
  }
  const close = () => {
    reset()
    setOpen(null)
  }
  const request = (target: SectionKey | "close") => {
    if (dirty) setPending(target)
    else if (target === "close") close()
    else start(target)
  }

  const save = async () => {
    if (!open || saving) return
    const paths = pathsOf(open.key)
    const fields = sectionFields(template, open.key)
    const own = fields.flatMap((f) => validateField(f, open.draft))
    // Cross-field rules (e.g. the receptionist needs some content) are checked on the form that will be sent.
    const merged = applySection(agent.form, open.draft, paths)
    const all = validateForm(template, merged)
    const mine = [...own, ...all.filter((i) => paths.includes(i.path) && !own.some((o) => o.path === i.path))]
    const elsewhere = [...new Set(all.filter((i) => !paths.includes(i.path)).map((i) => sectionOf(i.path)))]
    setIssues(mine)
    setOtherInvalid(elsewhere)
    if (mine.length > 0 || elsewhere.length > 0) return

    setSaving(true)
    setError(null)
    setServerErrors({})
    setConflict(null)
    const latest = await getAttendeAgentAction(agent.id)
    if (!latest.success) {
      setSaving(false)
      setError(latest)
      return
    }
    if (sectionConflict(open.base, latest.data, paths)) {
      setSaving(false)
      setConflict(latest.data)
      return
    }
    const result = await updateAttendeAgentSetupAction(agent.id, { form: cleanForm(applySection(latest.data.form, open.draft, paths)) })
    setSaving(false)
    if (!result.success) {
      // The answers stay in the open section, so nothing typed is lost.
      setError(result)
      setServerErrors(Object.fromEntries(Object.entries(serverIssuesToMap(result.details?.issues)).map(([path, message]) => [path.replace(/^form\./, ""), message])))
      return
    }
    onSaved(result.data)
    setSaved({ key: open.key, live: result.data.status === "live" })
    close()
  }

  const reload = () => {
    if (!open || !conflict) return
    onSaved(conflict)
    setOpen({ ...open, draft: conflict.form, base: { form: conflict.form, updatedAt: conflict.updatedAt } })
    setConflict(null)
  }

  const byPath = issuesByPath(issues)
  const errorFor = (path: string): string | null => {
    const issue = byPath[path]
    if (issue) return t(issueKey(issue), { limit: issue.limit ?? "" })
    return serverErrors[path] ?? null
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {sections.map((key) => {
        const isOpen = open?.key === key
        const title = titleOf(key)
        return (
          <section key={key} aria-labelledby={`agent-section-${key}-title`} className={cn("rounded-2xl border bg-white", isOpen ? "border-primary-dark" : "border-neutral-border")}>
            <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 id={`agent-section-${key}-title`} className="text-body-16 font-semibold text-neutral-900">
                  {title}
                </h2>
                <p className="break-words text-body-14 text-neutral-700">
                  <SummaryText summary={summarizeSection(key, template.key, agent.form)} template={template} t={t} language={language} appLanguage={appLanguage} />
                </p>
                {saved?.key === key && (
                  <p role="status" className="flex items-center gap-1.5 text-body-13 font-medium text-success-darkest">
                    <CheckCircle2 className="size-4" aria-hidden />
                    {saved.live ? t("sectionSavedLive") : t("sectionSavedPaused")}
                  </p>
                )}
              </div>
              {!isOpen && (
                <button
                  type="button"
                  onClick={() => request(key)}
                  aria-expanded={false}
                  aria-controls={`agent-section-${key}-body`}
                  aria-label={t("reviewEditNamed", { section: title })}
                  className={actionClass({ variant: "secondary", size: "md" })}
                >
                  <Pencil className="size-4" aria-hidden />
                  {t("actionEdit")}
                </button>
              )}
            </div>

            {isOpen && open && (
              <div id={`agent-section-${key}-body`} className="flex flex-col gap-6 border-t border-neutral-50 px-4 pt-5 sm:px-5 [&_input]:scroll-mb-36 [&_select]:scroll-mb-36 [&_textarea]:scroll-mb-36">
                {sectionFields(template, key).map((field) => (
                  <FieldRenderer
                    key={field.path}
                    field={field}
                    form={open.draft}
                    onChange={(path, value) => {
                      const draft = setAt(open.draft, path, value)
                      setOpen({ ...open, draft })
                      setSaved(null)
                      if (issues.length > 0) setIssues(sectionFields(template, key).flatMap((f) => validateField(f, draft)))
                    }}
                    error={errorFor(field.path)}
                    language={language}
                    appLanguage={appLanguage}
                    t={t}
                    compact
                  />
                ))}
                {key === "identity" && <FirstMessagePreview form={open.draft} t={t} />}

                {otherInvalid.length > 0 && (
                  <p role="alert" className="rounded-xl border border-warning-lighter bg-warning-clean p-3 text-body-14 text-neutral-900">
                    {t("sectionOtherInvalid", { sections: otherInvalid.map(titleOf).join(", ") })}
                  </p>
                )}
                {conflict && (
                  <div role="alert" className="flex flex-col items-start gap-2 rounded-xl border border-warning-lighter bg-warning-clean p-3 text-body-14 text-neutral-900">
                    <p>{t("sectionConflict")}</p>
                    <button type="button" onClick={reload} className={actionClass({ variant: "secondary", size: "sm" })}>
                      {t("sectionReload")}
                    </button>
                  </div>
                )}
                <ErrorNotice error={error} onRetry={() => void save()} />

                <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 rounded-b-2xl border-t border-neutral-50 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:bottom-0">
                  {/* One compact row on phones too: the bar must not hide the field being edited. */}
                  {dirty && (
                    <p className="w-full text-body-13 font-medium text-neutral-700 sm:mr-auto sm:w-auto" role="status">
                      {t("sectionUnsaved")}
                    </p>
                  )}
                  <button type="button" onClick={() => request("close")} disabled={saving} className={actionClass({ variant: "secondary", size: "lg", className: "flex-1 sm:flex-none" })}>
                    {t("sectionCancel")}
                  </button>
                  <button type="button" onClick={() => void save()} disabled={saving || !dirty} aria-busy={saving || undefined} className={actionClass({ variant: "primary", size: "lg", className: "flex-1 sm:flex-none" })}>
                    {saving && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                    {saving ? t("saving") : t("sectionSave")}
                  </button>
                </div>
              </div>
            )}
          </section>
        )
      })}
      <p className="px-1 text-body-13 text-neutral-600">{t("setupChannelsNote")}</p>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(value) => !value && setPending(null)}
        title={t("discardTitle")}
        description={t("discardBody", { section: open ? titleOf(open.key) : "" })}
        confirmLabel={t("discardConfirm")}
        cancelLabel={t("keepEditing")}
        onConfirm={() => {
          const target = pending
          setPending(null)
          if (target === "close") close()
          else if (target) start(target)
        }}
        tone="danger"
      />
    </div>
  )
}

/** The saved answers of a section in one line, so the setup can be understood without opening anything. */
function SummaryText({ summary, template, t, language, appLanguage }: { summary: SectionSummary; template: AgentTemplate; t: AttendeAgentsT; language: Parameters<typeof pickLocal>[1]; appLanguage: string }) {
  const optionLabel = (path: string, value: string | null) => {
    const option = template.steps.flatMap((s) => s.fields).find((f) => f.path === path)?.options?.find((o) => o.value === value)
    return option ? pickLocal(option.label, language) : value ?? ""
  }
  const count = (n: number, zero: Key, one: Key, other: Key) => plural(n, appLanguage, { zero: t(zero), one: t(one), other: t(other) })
  switch (summary.key) {
    case "business":
      return (
        <>
          {t("sumParts", { first: summary.businessName || t("summaryEmpty"), second: count(summary.offerings, "productsZero", "productsOne", "productsOther") })}
          {!summary.hasDescription && <span className="block text-body-13 text-warning-darkest">{t("sumNoDescription")}</span>}
        </>
      )
    case "goal": {
      const goal = optionLabel(`${summary.templateKey}.goal`, summary.goal)
      const detail =
        summary.templateKey === "sdr"
          ? count(summary.questions, "questionsZero", "questionsOne", "questionsOther")
          : summary.templateKey === "closer"
            ? count(summary.offers, "offersZero", "offersOne", "offersOther")
            : count(summary.faqs, "faqsZero", "faqsOne", "faqsOther")
      return <>{goal ? t("sumParts", { first: goal, second: detail }) : detail}</>
    }
    case "identity":
      return (
        <>
          {t("sumIdentity", {
            name: summary.assistantName || t("sumUnnamed"),
            language: LANGUAGE_KEY[summary.language] ? t(LANGUAGE_KEY[summary.language]!) : summary.language,
            tone: optionLabel("tone", summary.tone),
          })}
        </>
      )
    case "hours": {
      const text = summarizeHours(summary.hours, DAY_LABELS[language], t("hoursPresetAlways"))
      return <>{summary.hours ? t("hoursWithZone", { hours: text, zone: summary.hours.timezone }) : text}</>
    }
    case "handoff":
      return (
        <>
          {count(summary.custom, "customZero", "customOne", "customOther")}
          <span className="block">{summary.target.kind === "user" ? <HandoffTargetText target={summary.target} t={t} /> : t("sumTargetTeam")}</span>
        </>
      )
    case "advanced":
      return (
        <>
          {t("sumParts", {
            first: count(summary.keywords.length, "keywordsZero", "keywordsOne", "keywordsOther"),
            second: summary.maxReplies === null ? t("maxRepliesDefaultValue", { count: DEFAULT_MAX_REPLIES }) : t("maxRepliesValue", { count: summary.maxReplies }),
          })}
        </>
      )
  }
}
