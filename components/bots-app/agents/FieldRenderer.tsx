"use client"

import { CheckCircle2 } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { getAt, INFORMATIONAL_ONLY_PATHS, ROW_LIMITS } from "lib/attende/agents/form"
import { agentLanguageOf, pickLocal } from "lib/attende/agents/localize"
import { HANDOFF_SUGGESTIONS, KEYWORD_SUGGESTIONS } from "lib/attende/agents/samples"
import { handoffTargetOf } from "lib/attende/agents/sections"
import type { AgentForm, AgentLanguage, FieldDescriptor, WorkingHours } from "lib/attende/agents/types"
import { ChipListField } from "./fields/ChipListField"
import { chipClass, controlClass, fieldId } from "./fields/classes"
import { Field } from "./fields/Field"
import { HandoffTargetField } from "./fields/HandoffTargetField"
import { OfferingsField } from "./fields/OfferingsField"
import { type RowColumn, RowsField } from "./fields/RowsField"
import { WorkingHoursField } from "./fields/WorkingHoursField"
import type { AttendeAgentsT } from "./useAttendeAgentsT"

type Props = {
  field: FieldDescriptor
  form: AgentForm
  onChange: (path: string, value: unknown) => void
  /** Already localized error text for this field, if any. */
  error?: string | null
  /** The screen's language (labels from the template). */
  language: AgentLanguage
  /** The screen's language name, for numbers typed and shown (prices). */
  appLanguage?: string
  t: AttendeAgentsT
  /** Agent page: lists (products) as compact rows that open one at a time. */
  compact?: boolean
}

type Key = Parameters<AttendeAgentsT>[0]

/**
 * One sentence per question saying what the answer changes in the agent's behavior. It replaces the template's own
 * help text, which promised more than the agent does ("only says what is in the documents", "never invents links").
 */
const EFFECT: Record<string, Key> = {
  businessName: "effectBusinessName",
  businessDescription: "effectBusinessDescription",
  offerings: "effectOfferings",
  "sdr.goal": "effectSdrGoal",
  "sdr.qualificationQuestions": "effectSdrQuestions",
  "sdr.idealCustomer": "effectSdrIdeal",
  "closer.goal": "effectCloserGoal",
  "closer.offers": "effectCloserOffers",
  "closer.objections": "effectCloserObjections",
  "closer.callToActionUrl": "effectCloserUrl",
  "receptionist.faqs": "effectFaqs",
  "receptionist.policies": "effectPolicies",
  "receptionist.bookingInstructions": "effectBooking",
  "receptionist.locations": "effectLocations",
  assistantName: "effectAssistantName",
  language: "effectLanguage",
  tone: "effectTone",
  disclosure: "effectDisclosure",
  workingHours: "effectWorkingHours",
  "handoff.triggers": "effectHandoffTriggers",
  "handoff.keywords": "effectHandoffKeywords",
  "handoff.message": "effectHandoffMessage",
  maxRepliesPerContactPerDay: "effectMaxReplies",
}

/** Labels that must say whose setting it is (the AI's hours, the agent's language). */
const LABEL: Record<string, Key> = { workingHours: "labelWorkingHours", language: "labelLanguage" }

/** The cases in which the backend always hands over (handoffBuiltins in the prompt), shown so nobody adds them twice. */
const BUILTIN_HANDOFF: Key[] = ["handoffBuiltinAsks", "handoffBuiltinUpset", "handoffBuiltinPayments", "handoffBuiltinUnknown"]

const asStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [])
const asRows = (value: unknown): Array<Record<string, string | undefined>> => (Array.isArray(value) ? (value as Array<Record<string, string | undefined>>) : [])

/** Renders one field of the template schema. The backend schema drives the form; this adds the wording and editors. */
export function FieldRenderer({ field, form, onChange, error, language, appLanguage = "english", t, compact = false }: Props) {
  const value = getAt(form, field.path)
  const label = LABEL[field.path] ? t(LABEL[field.path]!) : pickLocal(field.label, language)
  const help = EFFECT[field.path] ? t(EFFECT[field.path]!) : field.help ? pickLocal(field.help, language) : undefined
  const placeholder = field.placeholder ? pickLocal(field.placeholder, language) : undefined
  const agentLanguage = agentLanguageOf(form)
  const id = fieldId(field.path)
  const invalid = !!error
  const describedBy = [help ? `${id}-help` : null, invalid ? `${id}-error` : null].filter(Boolean).join(" ") || undefined
  const wrap = (children: ReactNode, asGroup = false) => (
    <Field path={field.path} label={label} help={help} error={error} required={field.required} optionalText={t("optional")} laterText={field.path === "businessDescription" ? t("neededBeforeActivation") : undefined} asGroup={asGroup}>
      {children}
    </Field>
  )

  if (INFORMATIONAL_ONLY_PATHS.includes(field.path)) return null

  // Who receives a handover: the whole team or one member (a real choice, stored as `{ kind, userId? }`).
  if (field.path === "handoff.target") return <HandoffTargetField path={field.path} value={handoffTargetOf(form)} onChange={(next) => onChange(field.path, next)} t={t} error={error} />

  switch (field.kind) {
    case "text":
    case "url":
    case "number":
      return wrap(
        <input
          id={id}
          type={field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"}
          inputMode={field.kind === "number" ? "numeric" : undefined}
          value={value === undefined || value === null ? "" : String(value)}
          maxLength={field.kind === "number" ? undefined : field.max}
          min={field.kind === "number" ? field.min : undefined}
          max={field.kind === "number" ? field.max : undefined}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(field.path, field.kind === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          className={controlClass}
        />
      )
    case "textarea":
      return wrap(
        <textarea
          id={id}
          rows={4}
          value={typeof value === "string" ? value : ""}
          maxLength={field.max}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(field.path, e.target.value)}
          className={cn(controlClass, "min-h-28 resize-y")}
        />
      )
    case "select": {
      const options = field.options ?? []
      const current = typeof value === "string" ? value : ""
      return wrap(
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label} aria-describedby={describedBy}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={current === option.value}
              onClick={() => onChange(field.path, option.value)}
              className={cn(chipClass, "min-h-11 px-4 text-body-14", current === option.value ? "border-primary bg-primary-clean font-semibold text-primary-darkest" : "border-neutral-border bg-white text-neutral-700 hover:border-primary-lighter")}
            >
              {pickLocal(option.label, language)}
            </button>
          ))}
          {/* No calendar integration: say how "book" really works. */}
          {((field.path === "sdr.goal" && current === "book_meeting") || (field.path === "closer.goal" && current === "schedule_call")) && <p className="basis-full text-body-13 text-neutral-700">{t("goalScheduleNote")}</p>}
        </div>,
        true
      )
    }
    case "boolean":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-neutral-border bg-white p-3.5">
            <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(field.path, e.target.checked)} className="mt-0.5 size-5 shrink-0 rounded border-neutral-100 accent-[rgb(var(--color-primary,69_173_126))]" aria-describedby={describedBy} />
            <span className="flex flex-col gap-0.5">
              <span className="text-body-14 font-semibold text-neutral-900">{label}</span>
              {help && (
                <span id={`${id}-help`} className="text-body-13 text-neutral-600">
                  {help}
                </span>
              )}
            </span>
          </label>
          {error && (
            <p id={`${id}-error`} role="alert" className="text-body-13 font-medium text-error-dark">
              {error}
            </p>
          )}
        </div>
      )
    case "list": {
      const isHandoffTriggers = field.path === "handoff.triggers"
      const isKeywords = field.path === "handoff.keywords"
      // Suggestions become the agent's own rules, so they are in the agent's language, not the screen's.
      const suggestions = isHandoffTriggers ? HANDOFF_SUGGESTIONS[agentLanguage] : isKeywords ? KEYWORD_SUGGESTIONS[agentLanguage] : []
      const chips = (
        <ChipListField
          path={field.path}
          value={asStrings(value)}
          onChange={(next) => onChange(field.path, next)}
          placeholder={placeholder ?? t("itemPlaceholder")}
          itemMax={field.itemMax}
          max={field.max}
          invalid={invalid}
          addLabel={t("addItem")}
          removeLabel={(item) => t("removeNamed", { name: item })}
          suggestions={suggestions}
          suggestionsLabel={suggestions.length > 0 ? t("suggestions") : undefined}
          wide={(field.itemMax ?? 0) > 60}
          orderable={
            field.path === "sdr.qualificationQuestions"
              ? { up: (item) => t("moveUpNamed", { name: item }), down: (item) => t("moveDownNamed", { name: item }), edit: (item) => t("editNamed", { name: item }), save: t("itemSave") }
              : undefined
          }
        />
      )
      if (!isHandoffTriggers) return wrap(chips)
      return (
        <div className="flex flex-col gap-4">
          <section aria-labelledby="agent-handoff-builtin" className="flex flex-col gap-2 rounded-xl border border-neutral-border bg-white p-4">
            <h3 id="agent-handoff-builtin" className="text-body-14 font-semibold text-neutral-900">
              {t("handoffBuiltinTitle")}
            </h3>
            <p className="text-body-13 text-neutral-600">{t("handoffBuiltinHint")}</p>
            <ul className="flex flex-col gap-1.5">
              {BUILTIN_HANDOFF.map((key) => (
                <li key={key} className="flex items-start gap-2 text-body-14 text-neutral-800">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary-dark" aria-hidden />
                  {t(key)}
                </li>
              ))}
            </ul>
            <p className="text-body-13 text-neutral-600">{t("handoffCommercialNote")}</p>
          </section>
          {wrap(chips)}
        </div>
      )
    }
    case "offerings":
      return wrap(<OfferingsField path={field.path} rows={asRows(value)} onChange={(next) => onChange(field.path, next)} agentLanguage={agentLanguage} appLanguage={appLanguage} t={t} max={field.max} invalid={invalid} compact={compact} />, true)
    case "faqs":
      return wrap(rowsFor(field, value, onChange, invalid, t, faqColumns(t), "addFaq"), true)
    case "objections":
      return wrap(rowsFor(field, value, onChange, invalid, t, objectionColumns(t), "addObjection"), true)
    case "workingHours":
      return wrap(<WorkingHoursField path={field.path} value={(value ?? null) as WorkingHours} onChange={(next) => onChange(field.path, next)} language={language} t={t} invalid={invalid} />, true)
    default:
      return null
  }
}

function rowsFor(field: FieldDescriptor, value: unknown, onChange: Props["onChange"], invalid: boolean, t: AttendeAgentsT, columns: RowColumn[], addKey: "addFaq" | "addObjection") {
  return <RowsField path={field.path} rows={asRows(value)} columns={columns} onChange={(next) => onChange(field.path, next)} addLabel={t(addKey)} removeLabel={t("removeItem")} rowLabel={(index) => t("rowItem", { number: index + 1 })} max={field.max} invalid={invalid} />
}

// Limits match the API (FORM_LIMITS); longer text used to pass here and fail on "Create agent".
const faqColumns = (t: AttendeAgentsT): RowColumn[] => [
  { key: "question", label: t("faqQuestion"), wide: true, max: ROW_LIMITS.faqQuestion },
  { key: "answer", label: t("faqAnswer"), multiline: true, max: ROW_LIMITS.faqAnswer },
]
const objectionColumns = (t: AttendeAgentsT): RowColumn[] => [
  { key: "objection", label: t("objectionLabel"), wide: true, max: ROW_LIMITS.objection },
  { key: "answer", label: t("objectionAnswer"), multiline: true, max: ROW_LIMITS.objectionAnswer },
]
