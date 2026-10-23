import { validateHours } from "./hours"
import { isPriceDraft } from "./price"

const hasPriceProblem = (draft: unknown): boolean => isPriceDraft(draft) && !!draft.problem
import type { AgentForm, AgentTemplate, FieldDescriptor, TemplateKey, TemplateStep, WorkingHours } from "./types"

export type IssueCode = "required" | "max" | "min" | "itemMax" | "url" | "number" | "range" | "hours" | "itemIncomplete" | "receptionistContent" | "price"
export type FieldIssue = { path: string; code: IssueCode; limit?: number }

export const getAt = (form: AgentForm, path: string): unknown => path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), form)

/** Immutable set by dot path; creates intermediate objects. */
export function setAt(form: AgentForm, path: string, value: unknown): AgentForm {
  const [head, ...rest] = path.split(".")
  if (!head) return form
  if (rest.length === 0) return { ...form, [head]: value }
  const child = form[head]
  return { ...form, [head]: setAt(child && typeof child === "object" && !Array.isArray(child) ? (child as AgentForm) : {}, rest.join("."), value) }
}

const isBlank = (value: unknown): boolean => value === undefined || value === null || (typeof value === "string" && value.trim() === "")
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

/** https only: the contract rejects any other scheme for `callToActionUrl`. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.includes(".")
  } catch {
    return false
  }
}

export function validateField(field: FieldDescriptor, form: AgentForm): FieldIssue[] {
  const value = getAt(form, field.path)
  const issue = (code: IssueCode, limit?: number): FieldIssue[] => [{ path: field.path, code, ...(limit === undefined ? {} : { limit }) }]
  // "A specific person" needs the person (an object `{ kind: "user", userId }`); the whole team needs nothing.
  if (field.path === "handoff.target") {
    const target = value as { kind?: unknown; userId?: unknown } | null | undefined
    return target && typeof target === "object" && target.kind === "user" && !target.userId ? issue("required") : []
  }
  switch (field.kind) {
    case "boolean":
      return []
    case "text":
    case "textarea":
    case "select": {
      const v = text(value)
      if (field.required && !v) return issue("required")
      if (v && field.max && v.length > field.max) return issue("max", field.max)
      return []
    }
    case "url": {
      const v = text(value)
      if (field.required && !v) return issue("required")
      if (v && !isHttpsUrl(v)) return issue("url")
      if (v && field.max && v.length > field.max) return issue("max", field.max)
      return []
    }
    case "number": {
      if (isBlank(value)) return field.required ? issue("required") : []
      const n = Number(value)
      if (!Number.isFinite(n)) return issue("number")
      if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) return issue("range", field.min)
      return []
    }
    case "list": {
      const items = asArray(value).map(text).filter(Boolean)
      if (field.required && items.length === 0) return issue("required")
      if (field.min && items.length < field.min) return issue("min", field.min)
      if (field.max && items.length > field.max) return issue("max", field.max)
      if (field.itemMax && items.some((i) => i.length > field.itemMax!)) return issue("itemMax", field.itemMax)
      return []
    }
    case "offerings": {
      const items = asArray(value) as Array<Record<string, unknown>>
      if (field.required && items.length === 0) return issue("required")
      if (field.max && items.length > field.max) return issue("max", field.max)
      if (items.some((i) => !text(i?.name))) return issue("itemIncomplete")
      if (items.some((i) => text(i?.name).length > OFFERING_LIMITS.name || text(i?.description).length > OFFERING_LIMITS.description)) return issue("itemMax", OFFERING_LIMITS.name)
      return items.some((i) => hasPriceProblem(i?.__price) || text(i?.price).length > OFFERING_LIMITS.price) ? issue("price") : []
    }
    case "faqs":
    case "objections": {
      const items = asArray(value) as Array<Record<string, unknown>>
      const [a, b] = field.kind === "faqs" ? (["question", "answer"] as const) : (["objection", "answer"] as const)
      if (field.required && items.length === 0) return issue("required")
      if (field.max && items.length > field.max) return issue("max", field.max)
      return items.some((i) => !text(i?.[a]) || !text(i?.[b])) ? issue("itemIncomplete") : []
    }
    case "workingHours":
      return validateHours((value ?? null) as WorkingHours) ? issue("hours") : []
    default:
      return []
  }
}

export const fieldsOf = (template: AgentTemplate): FieldDescriptor[] => template.steps.flatMap((s) => s.fields)

export function validateStep(step: TemplateStep, form: AgentForm): FieldIssue[] {
  return step.fields.filter((f) => !f.informational || f.required || f.path === "handoff.target").flatMap((f) => validateField(f, form))
}

/** The receptionist needs something to answer from: FAQs, offerings or a description (backend rule). */
function crossRules(templateKey: TemplateKey, form: AgentForm): FieldIssue[] {
  if (templateKey !== "receptionist") return []
  const hasFaqs = asArray(getAt(form, "receptionist.faqs")).length > 0
  const hasOfferings = asArray(form.offerings).length > 0
  return hasFaqs || hasOfferings || text(form.businessDescription) ? [] : [{ path: "receptionist.faqs", code: "receptionistContent" }]
}

export function validateForm(template: AgentTemplate, form: AgentForm): FieldIssue[] {
  return [...template.steps.flatMap((s) => validateStep(s, form)), ...crossRules(template.key, form)]
}

export const issuesByPath = (issues: FieldIssue[]): Record<string, FieldIssue> => Object.fromEntries(issues.map((i) => [i.path, i]))

/** Template defaults plus the language the user is browsing in (so the sample answers match). */
export function initialForm(template: AgentTemplate, language: string): AgentForm {
  const base = JSON.parse(JSON.stringify(template.defaults ?? {})) as AgentForm
  return base.language ? base : { ...base, language }
}

/** Per-item limits of `offerings` (FORM_LIMITS in the backend; the descriptor only carries the item count). */
export const OFFERING_LIMITS = { name: 80, description: 240, price: 60 } as const

/** Per-item limits of the question/answer rows (FORM_LIMITS in the backend). */
export const ROW_LIMITS = { faqQuestion: 160, faqAnswer: 500, objection: 160, objectionAnswer: 400 } as const

/** Keys starting with `__` are editor state (e.g. the structured price) and never leave the browser. */
const isUiKey = (key: string) => key.startsWith("__")

/** Removes empty items and editor-only keys before sending, as the backend de-duplicates and drops them anyway. */
export function cleanForm(form: AgentForm): AgentForm {
  const clean = (value: unknown): unknown => {
    if (typeof value === "string") return value.trim()
    if (Array.isArray(value)) {
      return value
        .map(clean)
        .filter((v) => !(v === "" || (v && typeof v === "object" && !Array.isArray(v) && Object.values(v as object).every((x) => x === "" || x === undefined))))
    }
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value as object)
          .filter(([k]) => !isUiKey(k))
          .map(([k, v]) => [k, clean(v)])
      )
    return value
  }
  return normalizeHandoffTarget(clean(form) as AgentForm)
}

/**
 * `handoff.target` must be an object (`{ kind: "team" | "user", userId? }`) but the template describes it as a plain
 * select, so the wizard used to send `"team"` and the API refused the whole form. A string left by an old draft is
 * dropped (= the whole team) and an object is kept as is. With `{ kind: "user", userId }` the backend assigns the
 * handed-over conversation to that member (if still on the team and the conversation has no owner yet).
 */
export function normalizeHandoffTarget(form: AgentForm): AgentForm {
  const handoff = form.handoff
  if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) return form
  const target = (handoff as Record<string, unknown>).target
  if (target === undefined || (target && typeof target === "object")) return form
  const { target: _dropped, ...rest } = handoff as Record<string, unknown>
  return { ...form, handoff: rest } as AgentForm
}

/** Fields the UI explains instead of asking (their stored value has no effect on how the agent behaves). None today. */
export const INFORMATIONAL_ONLY_PATHS: readonly string[] = []


/**
 * Answers that have a sensible recommended value and only matter to fine-tune the agent: shown under "Customize"
 * (collapsed) so each step starts with the essential questions. Everything stays editable and is still validated.
 */
export const ADVANCED_PATHS: readonly string[] = [
  "sdr.idealCustomer",
  "closer.objections",
  "receptionist.policies",
  "receptionist.bookingInstructions",
  "receptionist.locations",
  "handoff.keywords",
  "handoff.message",
  "maxRepliesPerContactPerDay",
]
