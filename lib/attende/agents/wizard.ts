import { type FieldIssue, validateForm, validateStep } from "./form"
import type { AgentActionError, AgentForm, AgentLine, AgentTemplate } from "./types"

export type WizardStep = { kind: "schema"; key: string } | { kind: "lines" } | { kind: "documents" } | { kind: "review" } | { kind: "try" }

/** Setup questions come from the backend schema; the rest of the flow is fixed. The template pick happens before step 0. */
export function buildFlow(template: AgentTemplate): WizardStep[] {
  return [...template.steps.map((s): WizardStep => ({ kind: "schema", key: s.key })), { kind: "lines" }, { kind: "documents" }, { kind: "review" }, { kind: "try" }]
}

export const stepId = (step: WizardStep): string => (step.kind === "schema" ? `schema:${step.key}` : step.kind)

/** Cross-field rules (receptionist needs content) belong to the step that asks for the field, or to the last question step. */
export function issuesForStep(step: WizardStep, template: AgentTemplate, form: AgentForm): FieldIssue[] {
  if (step.kind !== "schema") return []
  const schemaStep = template.steps.find((s) => s.key === step.key)
  if (!schemaStep) return []
  const own = validateStep(schemaStep, form)
  const ownPaths = new Set(own.map((i) => i.path))
  const lastKey = template.steps[template.steps.length - 1]?.key
  const cross = validateForm(template, form).filter((i) => {
    if (i.code !== "receptionistContent" || ownPaths.has(i.path)) return false
    const owner = template.steps.find((s) => s.fields.some((f) => f.path === i.path))?.key ?? lastKey
    return owner === step.key
  })
  return [...own, ...cross]
}

/** First wizard step whose fields include `path` (to send the user back to the question the server rejected). */
export function stepIndexForPath(flow: WizardStep[], template: AgentTemplate, path: string): number {
  const clean = path.replace(/^form\./, "")
  return flow.findIndex((step) => {
    if (step.kind !== "schema") return false
    const schemaStep = template.steps.find((s) => s.key === step.key)
    return !!schemaStep?.fields.some((f) => f.path === clean || clean.startsWith(`${f.path}.`) || clean.startsWith(`${f.path}[`))
  })
}

/** First step (before review) that still has a problem, or -1. Used before "Create agent" so nothing invalid is sent. */
export function firstInvalidStep(flow: WizardStep[], template: AgentTemplate, form: AgentForm): number {
  return flow.findIndex((step) => issuesForStep(step, template, form).length > 0)
}

/**
 * Where to send the user after a failed create. Validation goes to the question that failed (or the first schema
 * step when the path is unknown), line problems go to the lines step, everything else stays where it is (`null`).
 */
export function stepForServerError(flow: WizardStep[], template: AgentTemplate, error: Pick<AgentActionError, "code" | "details">): number | null {
  if (error.code === "ATTENDE_AGENT_LINE_NOT_FOUND" || error.code === "ATTENDE_AGENT_LINE_NOT_CONNECTED") {
    const index = flow.findIndex((s) => s.kind === "lines")
    return index >= 0 ? index : null
  }
  if (error.code !== "ATTENDE_AGENT_VALIDATION") return null
  const paths = (error.details?.issues ?? []).map((i) => i.path)
  if (paths.some((p) => /^lines(\.|\[|$)/.test(p))) return flow.findIndex((s) => s.kind === "lines")
  const indexes = paths.map((p) => stepIndexForPath(flow, template, p)).filter((i) => i >= 0)
  if (indexes.length > 0) return Math.min(...indexes)
  return flow.findIndex((s) => s.kind === "schema")
}

/** Everything before "try" is editable; "try" exists only after the agent has been created. */
export const isEditableStep = (step: WizardStep | undefined): boolean => !!step && step.kind !== "try"

/** Keeps a restored step index inside the flow, and never lands on "try" without an agent. */
export function clampStep(flow: WizardStep[], step: number, created: boolean): number {
  const tryIndex = flow.findIndex((s) => s.kind === "try")
  if (created) return tryIndex
  const max = Math.max(0, tryIndex - 1)
  return Math.min(Math.max(0, Number.isFinite(step) ? Math.trunc(step) : 0), max)
}

/** The steps the progress bar counts (the "try" step is the finish line, shown as the last one). */
export const visibleProgress = (flow: WizardStep[], index: number) => ({ current: Math.min(index + 1, flow.length), total: flow.length })

export const linesKey = (lines: AgentLine[]): string =>
  lines
    .map((l) => `${l.channel}:${l.sessionId}`)
    .sort()
    .join(",")
