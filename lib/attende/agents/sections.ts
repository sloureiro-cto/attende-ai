import { getAt, setAt } from "./form"
import { draftFromText, isPriceDraft, type PriceDraft } from "./price"
import type { AgentForm, AgentLanguage, AgentTemplate, FieldDescriptor, TemplateKey, WorkingHours } from "./types"

/**
 * The agent page's Setup tab: the same answers as the wizard, grouped in compact sections that open one at a time.
 * The API saves the whole form (PATCH /:id/setup), so a section is saved by writing only ITS paths over the latest
 * saved form: other sections are never touched.
 */
export type SectionKey = "business" | "goal" | "identity" | "hours" | "handoff" | "advanced"
export const SECTION_KEYS: readonly SectionKey[] = ["business", "goal", "identity", "hours", "handoff", "advanced"]

const SECTION_OF: Record<string, SectionKey> = {
  businessName: "business",
  businessDescription: "business",
  offerings: "business",
  assistantName: "identity",
  language: "identity",
  tone: "identity",
  disclosure: "identity",
  workingHours: "hours",
  "handoff.triggers": "handoff",
  "handoff.message": "handoff",
  "handoff.target": "handoff",
  "handoff.keywords": "advanced",
  maxRepliesPerContactPerDay: "advanced",
}

/** Template-specific answers (`sdr.*`, `closer.*`, `receptionist.*`) are the goal section; anything unknown goes to Advanced. */
export function sectionOf(path: string): SectionKey {
  if (SECTION_OF[path]) return SECTION_OF[path]!
  if (/^(sdr|closer|receptionist)\./.test(path)) return "goal"
  return "advanced"
}

/** The template's fields of one section, in the template's order. */
export const sectionFields = (template: AgentTemplate, key: SectionKey): FieldDescriptor[] => template.steps.flatMap((s) => s.fields).filter((f) => sectionOf(f.path) === key)

/** Writes the section's paths from `source` over `target` (the latest saved form). Nothing else changes. */
export function applySection(target: AgentForm, source: AgentForm, paths: readonly string[]): AgentForm {
  return paths.reduce((form, path) => setAt(form, path, getAt(source, path)), target)
}

/** Editor-only keys (`__price`) do not count as a change. */
const comparable = (value: unknown): string =>
  JSON.stringify(value, (key, v) => (key.startsWith("__") ? undefined : v === "" ? undefined : v)) ?? "undefined"

/** Whether the section's answers differ between two forms (unsaved changes, or a change made elsewhere). */
export const sectionChanged = (a: AgentForm, b: AgentForm, paths: readonly string[]): boolean => paths.some((p) => comparable(getAt(a, p)) !== comparable(getAt(b, p)))

/**
 * Another save happened since this section was opened (the API has no version field; `updatedAt` is the only
 * signal) AND it changed this section's answers. Changes to other sections are not a conflict: they are kept.
 */
export function sectionConflict(base: { form: AgentForm; updatedAt: string }, latest: { form: AgentForm; updatedAt: string }, paths: readonly string[]): boolean {
  return base.updatedAt !== latest.updatedAt && sectionChanged(base.form, latest.form, paths)
}

// ---- Summaries (data only; the component writes the words) ----

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

export type OfferingView = { name: string; description: string; draft: PriceDraft; text: string }

/** Each product with its price read back into parts (fixed, starting at, on request, free text or none). */
export function offeringViews(form: AgentForm, agentLanguage: AgentLanguage, appLanguage: string): OfferingView[] {
  return asArray(form.offerings).flatMap((row) => {
    const r = (row ?? {}) as Record<string, unknown>
    const name = str(r.name)
    if (!name && !str(r.price)) return []
    const draft = isPriceDraft(r.__price) ? r.__price : draftFromText(str(r.price), agentLanguage, appLanguage)
    return [{ name, description: str(r.description), draft, text: str(r.price) }]
  })
}

export type HandoffTarget = { kind: "team" } | { kind: "user"; userId: string }

/** `handoff.target` as saved: an object `{ kind, userId? }`; anything else (absent, legacy string) means the whole team. */
export function handoffTargetOf(form: AgentForm): HandoffTarget {
  const target = getAt(form, "handoff.target")
  if (target && typeof target === "object" && (target as { kind?: unknown }).kind === "user" && typeof (target as { userId?: unknown }).userId === "string") {
    return { kind: "user", userId: (target as { userId: string }).userId }
  }
  return { kind: "team" }
}

export type SectionSummary =
  | { key: "business"; businessName: string; offerings: number; hasDescription: boolean }
  | { key: "goal"; templateKey: TemplateKey; goal: string | null; questions: number; offers: number; objections: number; faqs: number; policies: number; link: boolean }
  | { key: "identity"; assistantName: string; language: string; tone: string; disclosure: boolean }
  | { key: "hours"; hours: WorkingHours }
  | { key: "handoff"; custom: number; target: HandoffTarget; message: boolean }
  | { key: "advanced"; keywords: string[]; maxReplies: number | null }

export function summarizeSection(key: SectionKey, templateKey: TemplateKey, form: AgentForm): SectionSummary {
  switch (key) {
    case "business":
      return { key, businessName: str(form.businessName), offerings: asArray(form.offerings).filter((o) => str((o as Record<string, unknown>)?.name)).length, hasDescription: !!str(form.businessDescription) }
    case "goal": {
      const goal = str(getAt(form, `${templateKey}.goal`)) || null
      return {
        key,
        templateKey,
        goal,
        questions: asArray(getAt(form, "sdr.qualificationQuestions")).length,
        offers: asArray(getAt(form, "closer.offers")).length,
        objections: asArray(getAt(form, "closer.objections")).length,
        faqs: asArray(getAt(form, "receptionist.faqs")).length,
        policies: asArray(getAt(form, "receptionist.policies")).length,
        link: !!str(getAt(form, "closer.callToActionUrl")),
      }
    }
    case "identity":
      return { key, assistantName: str(form.assistantName), language: str(form.language) || "pt", tone: str(form.tone) || "friendly", disclosure: form.disclosure !== false }
    case "hours":
      return { key, hours: (getAt(form, "workingHours") ?? null) as WorkingHours }
    case "handoff":
      return { key, custom: asArray(getAt(form, "handoff.triggers")).filter((x) => str(x)).length, target: handoffTargetOf(form), message: !!str(getAt(form, "handoff.message")) }
    case "advanced": {
      const max = getAt(form, "maxRepliesPerContactPerDay")
      return { key, keywords: asArray(getAt(form, "handoff.keywords")).map(str).filter(Boolean), maxReplies: typeof max === "number" && Number.isFinite(max) ? max : null }
    }
  }
}

/** The API's default when `maxRepliesPerContactPerDay` is not set (FORM_LIMITS in the backend). */
export const DEFAULT_MAX_REPLIES = 40
