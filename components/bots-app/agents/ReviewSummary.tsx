"use client"

import { AlertTriangle, Pencil } from "lucide-react"
import type { ReactNode } from "react"
import { businessContext } from "lib/attende/agents/context"
import { getAt, INFORMATIONAL_ONLY_PATHS } from "lib/attende/agents/form"
import { summarizeHours } from "lib/attende/agents/hours"
import { pickLocal } from "lib/attende/agents/localize"
import { DAY_LABELS } from "lib/attende/agents/samples"
import { handoffTargetOf } from "lib/attende/agents/sections"
import type { AgentForm, AgentLanguage, AgentLine, AgentTemplate, FieldDescriptor, WorkingHours } from "lib/attende/agents/types"
import { formatNumber, localeOf } from "lib/attende/format"
import type { BotsLine } from "lib/bots-app/lines"
import { CHANNEL_KEY, CHANNEL_STATE_KEY } from "./AgentBadges"
import { HandoffTargetText } from "./fields/HandoffTargetField"
import { type AttendeAgentsT, useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"

export type ReviewTarget = { kind: "schema"; key: string } | { kind: "lines" } | { kind: "documents" }

type Props = {
  template: AgentTemplate
  form: AgentForm
  lines: AgentLine[]
  knownLines: BotsLine[]
  /** Names of the documents picked (sent after creation). */
  documents: string[]
  /** "Edit" on a section: the wizard opens that step and comes back here. */
  onEdit: (target: ReviewTarget) => void
}

type Key = Parameters<AttendeAgentsT>[0]
const LABEL: Record<string, Key> = { workingHours: "labelWorkingHours", language: "labelLanguage", "handoff.target": "handoffTargetLabel" }
const asStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "") : [])
const asRows = (value: unknown): Array<Record<string, unknown>> => (Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [])
const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

/**
 * The review step: every answer as it will be saved (the actual products and prices, questions, rules), one section
 * per step with its own "Edit", the chosen channels with their connection state, and what is still missing before
 * the agent can be turned on, each with the action that fixes it.
 */
export function ReviewSummary({ template, form, lines, knownLines, documents, onEdit }: Props) {
  const { t, language, appLanguage } = useAttendeAgentsT()
  const empty = t("summaryEmpty")

  const channelRows = lines.map((l) => {
    const known = knownLines.find((k) => k.id === l.sessionId && k.channel === l.channel)
    return { key: `${l.channel}:${l.sessionId}`, name: known?.label || t("lineUnnamed"), channel: t(CHANNEL_KEY[l.channel]), state: known ? t(CHANNEL_STATE_KEY[known.status]) : t("lineRemoved"), connected: known?.status === "connected" }
  })

  const businessStep = template.steps.find((s) => s.fields.some((f) => f.path === "businessDescription" || f.path === "businessName"))
  const pending: Array<{ text: string; action: string; target: ReviewTarget }> = []
  if (lines.length === 0) pending.push({ text: t("pendingNoChannel"), action: t("pendingChooseChannels"), target: { kind: "lines" } })
  for (const row of channelRows.filter((r) => !r.connected)) pending.push({ text: t("pendingChannelOffline", { name: row.name }), action: t("pendingChooseChannels"), target: { kind: "lines" } })
  if (!businessContext(form).description && documents.length === 0) {
    if (businessStep) pending.push({ text: t("pendingContext"), action: t("pendingCompleteDescription"), target: { kind: "schema", key: businessStep.key } })
  }

  return (
    <div className="flex flex-col gap-5">
      {pending.length > 0 && (
        <section aria-labelledby="agent-review-pending" className="flex flex-col gap-3 rounded-2xl border border-warning-lighter bg-warning-clean p-4">
          <h3 id="agent-review-pending" className="flex items-center gap-2 text-body-14 font-semibold text-neutral-900">
            <AlertTriangle className="size-4 text-warning-darkest" aria-hidden />
            {t("reviewPendingTitle")}
          </h3>
          <ul className="flex flex-col gap-3">
            {pending.map((item) => (
              <li key={item.text} className="flex flex-col items-start gap-2 text-body-14 text-neutral-900 sm:flex-row sm:items-center sm:justify-between">
                <span>{item.text}</span>
                <button type="button" onClick={() => onEdit(item.target)} className={actionClass({ variant: "secondary", size: "sm", className: "shrink-0" })}>
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {template.steps.map((step) => {
        const title = pickLocal(step.title, language)
        return (
          <Section key={step.key} title={title} editLabel={t("reviewEditNamed", { section: title })} editText={t("actionEdit")} onEdit={() => onEdit({ kind: "schema", key: step.key })}>
            {step.fields
              .filter((f) => !INFORMATIONAL_ONLY_PATHS.includes(f.path))
              .map((field) => (
                <Row key={field.path} label={LABEL[field.path] ? t(LABEL[field.path]!) : pickLocal(field.label, language)}>
                  <FieldValue field={field} form={form} t={t} language={language} appLanguage={appLanguage} empty={empty} />
                </Row>
              ))}
          </Section>
        )
      })}

      <Section title={t("reviewSectionChannels")} editLabel={t("reviewEditNamed", { section: t("reviewSectionChannels") })} editText={t("actionEdit")} onEdit={() => onEdit({ kind: "lines" })}>
        <Row label={t("summaryLines")}>
          {channelRows.length === 0 ? (
            empty
          ) : (
            <ul className="flex flex-col gap-1">
              {channelRows.map((r) => (
                <li key={r.key}>{t("channelWithState", { name: r.name, channel: r.channel, state: r.state })}</li>
              ))}
            </ul>
          )}
        </Row>
      </Section>

      <Section title={t("reviewSectionDocs")} editLabel={t("reviewEditNamed", { section: t("reviewSectionDocs") })} editText={t("actionEdit")} onEdit={() => onEdit({ kind: "documents" })}>
        <Row label={t("summaryDocs")}>
          {documents.length === 0 ? (
            t("summaryNone")
          ) : (
            <div className="flex flex-col gap-1">
              <span>{joinList(documents, appLanguage)}</span>
              <span className="text-body-13 text-neutral-600">{t("reviewDocsWillSend")}</span>
            </div>
          )}
        </Row>
      </Section>
    </div>
  )
}

function Section({ title, editLabel, editText, onEdit, children }: { title: string; editLabel: string; editText: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl border border-neutral-border bg-white" aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-50 px-4 py-2.5">
        <h3 className="text-body-14 font-semibold text-neutral-900">{title}</h3>
        <button type="button" onClick={onEdit} aria-label={editLabel} className={actionClass({ variant: "ghost", size: "sm" })}>
          <Pencil className="size-3.5" aria-hidden />
          {editText}
        </button>
      </div>
      <dl className="divide-y divide-neutral-50">{children}</dl>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-body-13 font-medium text-neutral-600">{label}</dt>
      <dd className="min-w-0 whitespace-pre-line break-words text-body-14 text-neutral-900">{children}</dd>
    </div>
  )
}

/** The saved value of one field, written out (lists as lists, prices as the text the agent receives). */
function FieldValue({ field, form, t, language, appLanguage, empty }: { field: FieldDescriptor; form: AgentForm; t: AttendeAgentsT; language: AgentLanguage; appLanguage: string; empty: string }) {
  const value = getAt(form, field.path)
  if (field.path === "handoff.target") return <HandoffTargetText target={handoffTargetOf(form)} t={t} />
  switch (field.kind) {
    case "boolean":
      return <>{field.path === "disclosure" ? (value === false ? t("reviewDisclosureOff") : t("reviewDisclosureOn")) : value === true ? t("summaryYes") : t("summaryNo")}</>
    case "select": {
      const option = field.options?.find((o) => o.value === value)
      return <>{option ? pickLocal(option.label, language) : str(value) || empty}</>
    }
    case "number":
      return <>{typeof value === "number" && Number.isFinite(value) ? formatNumber(value, appLanguage) : t("summaryDefault")}</>
    case "list": {
      const items = asStrings(value)
      const builtin = field.path === "handoff.triggers" ? <li>{t("reviewBuiltinHandoff")}</li> : null
      if (items.length === 0 && !builtin) return <>{empty}</>
      return (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {builtin}
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    }
    case "offerings": {
      const rows = asRows(value).filter((r) => str(r.name))
      if (rows.length === 0) return <>{empty}</>
      return (
        <ul className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <li key={i} className="flex flex-col">
              <span className="font-medium">
                {str(row.name)} · {str(row.price) || t("reviewPriceNone")}
              </span>
              {str(row.description) && <span className="text-body-13 text-neutral-600">{str(row.description)}</span>}
            </li>
          ))}
        </ul>
      )
    }
    case "faqs":
    case "objections": {
      const [a, b] = field.kind === "faqs" ? (["question", "answer"] as const) : (["objection", "answer"] as const)
      const rows = asRows(value).filter((r) => str(r[a]))
      if (rows.length === 0) return <>{empty}</>
      return (
        <ul className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <li key={i} className="flex flex-col">
              <span className="font-medium">{str(row[a])}</span>
              <span className="text-body-13 text-neutral-700">{str(row[b])}</span>
            </li>
          ))}
        </ul>
      )
    }
    case "workingHours": {
      const hours = (value ?? null) as WorkingHours
      const summary = summarizeHours(hours, DAY_LABELS[language], t("hoursPresetAlways"))
      return <>{hours ? t("hoursWithZone", { hours: summary, zone: hours.timezone }) : summary}</>
    }
    default:
      return <>{str(value) || empty}</>
  }
}

/** "a, b and c" / "a, b e c", as the language writes a list. */
function joinList(items: string[], appLanguage: string): string {
  try {
    return new Intl.ListFormat(localeOf(appLanguage), { style: "long", type: "conjunction" }).format(items)
  } catch {
    return items.join(", ")
  }
}
