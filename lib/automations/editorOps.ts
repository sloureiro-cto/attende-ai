import { templateFlowActionTypesForChannel } from "lib/whatsapp-lite/messagingTemplateFlowActionLabels"
import type { VisualAction, VisualActionType } from "lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import {
  allSteps,
  createPath,
  createRouter,
  type EditorFlow,
  type EditorPath,
  type EditorRouter,
  type EditorStep,
  type FlowIssue,
  newStep,
  ROUTER_MAX_PATHS,
} from "./flowModel"
import type { AutomationChannel, AutomationChannelBinding } from "./types"

/** Pure, immutable edits of an `EditorFlow`. The editor component only calls these. */

/** Every action type at least one of the selected channels can offer (WhatsApp's set when none is selected yet). */
export function actionTypesForChannels(channels: AutomationChannel[]): VisualActionType[] {
  const lists = (channels.length ? channels : (["whatsapp"] as AutomationChannel[])).map((c) => templateFlowActionTypesForChannel(c))
  const seen = new Set<VisualActionType>()
  for (const list of lists) for (const type of list) seen.add(type)
  return Array.from(seen)
}

export type Selection =
  | { kind: "trigger" }
  | { kind: "filters" }
  | { kind: "router" }
  | { kind: "path"; id: string }
  | { kind: "else" }
  | { kind: "step"; id: string }

export type Lane = { kind: "main" } | { kind: "path"; id: string } | { kind: "else" } | { kind: "after" }

const sameLane = (a: Lane, b: Lane) => a.kind === b.kind && (a.kind !== "path" || (b.kind === "path" && a.id === b.id))

function mapLane(flow: EditorFlow, lane: Lane, fn: (steps: EditorStep[]) => EditorStep[]): EditorFlow {
  if (lane.kind === "main") return { ...flow, steps: fn(flow.steps) }
  if (lane.kind === "after") return { ...flow, afterSteps: fn(flow.afterSteps) }
  if (!flow.router) return flow
  if (lane.kind === "else") return { ...flow, router: { ...flow.router, elseSteps: fn(flow.router.elseSteps) } }
  return {
    ...flow,
    router: { ...flow.router, paths: flow.router.paths.map((p) => (p.id === lane.id ? { ...p, steps: fn(p.steps) } : p)) },
  }
}

function lanesOf(flow: EditorFlow): Lane[] {
  const lanes: Lane[] = [{ kind: "main" }]
  if (flow.router) {
    for (const p of flow.router.paths) lanes.push({ kind: "path", id: p.id })
    lanes.push({ kind: "else" }, { kind: "after" })
  }
  return lanes
}

function stepsOfLane(flow: EditorFlow, lane: Lane): EditorStep[] {
  if (lane.kind === "main") return flow.steps
  if (lane.kind === "after") return flow.afterSteps
  if (!flow.router) return []
  if (lane.kind === "else") return flow.router.elseSteps
  return flow.router.paths.find((p) => p.id === lane.id)?.steps ?? []
}

export function findStepLane(flow: EditorFlow, stepId: string): Lane | null {
  return lanesOf(flow).find((lane) => stepsOfLane(flow, lane).some((s) => s.id === stepId)) ?? null
}

export function findStep(flow: EditorFlow, stepId: string): EditorStep | null {
  return allSteps(flow).find((s) => s.id === stepId) ?? null
}

export function addStep(flow: EditorFlow, lane: Lane, action: VisualAction, index?: number): { flow: EditorFlow; step: EditorStep } {
  const step = newStep(action)
  const next = mapLane(flow, lane, (steps) => {
    const at = index === undefined ? steps.length : Math.max(0, Math.min(index, steps.length))
    return [...steps.slice(0, at), step, ...steps.slice(at)]
  })
  return { flow: next, step }
}

export function updateStepAction(flow: EditorFlow, stepId: string, action: VisualAction): EditorFlow {
  const lane = findStepLane(flow, stepId)
  if (!lane) return flow
  return mapLane(flow, lane, (steps) => steps.map((s) => (s.id === stepId ? { ...s, action } : s)))
}

export function removeStep(flow: EditorFlow, stepId: string): EditorFlow {
  const lane = findStepLane(flow, stepId)
  if (!lane) return flow
  return mapLane(flow, lane, (steps) => steps.filter((s) => s.id !== stepId))
}

export function moveStep(flow: EditorFlow, stepId: string, direction: -1 | 1): EditorFlow {
  const lane = findStepLane(flow, stepId)
  if (!lane) return flow
  return mapLane(flow, lane, (steps) => {
    const from = steps.findIndex((s) => s.id === stepId)
    const to = from + direction
    if (from < 0 || to < 0 || to >= steps.length) return steps
    const copy = steps.slice()
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item as EditorStep)
    return copy
  })
}

// --- router ---------------------------------------------------------------------------------

/** Turns a plain flow into a router flow. Existing steps keep running for every path (after the router). */
export function enableRouter(flow: EditorFlow): EditorFlow {
  if (flow.router) return flow
  return { ...flow, router: createRouter(), afterSteps: [...flow.steps, ...flow.afterSteps], steps: [] }
}

/** Back to a plain flow; shared steps become the main steps, path/else steps are dropped. */
export function disableRouter(flow: EditorFlow): EditorFlow {
  if (!flow.router) return flow
  return { ...flow, router: null, steps: flow.afterSteps, afterSteps: [] }
}

export function routerDropsSteps(router: EditorRouter): number {
  return router.paths.reduce((n, p) => n + p.steps.length, router.elseSteps.length)
}

export function addPath(flow: EditorFlow, kind: EditorPath["kind"], name: string): { flow: EditorFlow; path: EditorPath | null } {
  const base = flow.router ? flow : enableRouter(flow)
  const router = base.router as EditorRouter
  if (router.paths.length >= ROUTER_MAX_PATHS) return { flow, path: null }
  const path = createPath(kind, name)
  return { flow: { ...base, router: { ...router, paths: [...router.paths, path] } }, path }
}

export function removePath(flow: EditorFlow, pathId: string): EditorFlow {
  if (!flow.router) return flow
  return { ...flow, router: { ...flow.router, paths: flow.router.paths.filter((p) => p.id !== pathId) } }
}

export function movePath(flow: EditorFlow, pathId: string, direction: -1 | 1): EditorFlow {
  if (!flow.router) return flow
  const paths = flow.router.paths.slice()
  const from = paths.findIndex((p) => p.id === pathId)
  const to = from + direction
  if (from < 0 || to < 0 || to >= paths.length) return flow
  const [item] = paths.splice(from, 1)
  paths.splice(to, 0, item as EditorPath)
  return { ...flow, router: { ...flow.router, paths } }
}

/** Reorders by dragging: `pathId` lands where `targetId` is. */
export function reorderPath(flow: EditorFlow, pathId: string, targetId: string): EditorFlow {
  if (!flow.router || pathId === targetId) return flow
  const paths = flow.router.paths.slice()
  const from = paths.findIndex((p) => p.id === pathId)
  const to = paths.findIndex((p) => p.id === targetId)
  if (from < 0 || to < 0) return flow
  const [item] = paths.splice(from, 1)
  paths.splice(to, 0, item as EditorPath)
  return { ...flow, router: { ...flow.router, paths } }
}

/** Keeps a valid selection after an edit (removed step/path/router falls back to the closest owner). */
export function reconcileSelection(flow: EditorFlow, selection: Selection | null): Selection | null {
  if (!selection) return null
  if (selection.kind === "step") return findStep(flow, selection.id) ? selection : null
  if (selection.kind === "path") return flow.router?.paths.some((p) => p.id === selection.id) ? selection : flow.router ? { kind: "router" } : null
  if (selection.kind === "router" || selection.kind === "else") return flow.router ? selection : null
  return selection
}

/** The path (if any) a step belongs to, for the inspector title. */
export function pathOfStep(flow: EditorFlow, stepId: string): { index: number; path: EditorPath } | null {
  const paths = flow.router?.paths ?? []
  const index = paths.findIndex((p) => p.steps.some((s) => s.id === stepId))
  const path = paths[index]
  return path ? { index, path } : null
}

// --- channels -------------------------------------------------------------------------------

export type ChannelSelection = Partial<Record<AutomationChannel, string[]>>

export function selectionFromBindings(bindings: AutomationChannelBinding[]): ChannelSelection {
  const out: ChannelSelection = {}
  for (const b of bindings) out[b.channel] = [...b.enabledSessionIds]
  return out
}

export function bindingsFromSelection(selection: ChannelSelection): AutomationChannelBinding[] {
  return (Object.keys(selection) as AutomationChannel[]).map((channel) => ({
    channel,
    enabledSessionIds: selection[channel] ?? [],
  }))
}

export function selectedChannels(selection: ChannelSelection): AutomationChannel[] {
  return Object.keys(selection) as AutomationChannel[]
}

/** Action steps that some selected channel can't run (they are skipped there; the rest of the path continues). */
export type UnsupportedStep = { stepId: string; type: VisualActionType; channels: AutomationChannel[] }

export function unsupportedSteps(flow: EditorFlow, channels: AutomationChannel[]): UnsupportedStep[] {
  const supported = new Map<AutomationChannel, Set<VisualActionType>>(
    channels.map((c) => [c, new Set(templateFlowActionTypesForChannel(c))])
  )
  const out: UnsupportedStep[] = []
  for (const step of allSteps(flow)) {
    const missing = channels.filter((c) => !supported.get(c)?.has(step.action.type))
    if (missing.length > 0) out.push({ stepId: step.id, type: step.action.type, channels: missing })
  }
  return out
}

export function channelsRunningStep(unsupported: UnsupportedStep[], stepId: string, channels: AutomationChannel[]): AutomationChannel[] {
  const missing = unsupported.find((u) => u.stepId === stepId)?.channels ?? []
  return channels.filter((c) => !missing.includes(c))
}

export { sameLane }

/** The canvas selection that shows a given validation issue. */
export function selectionForIssue(issue: FlowIssue, flow: EditorFlow): Selection {
  const key = issue.nodeKey
  if (key === "trigger") return { kind: "trigger" }
  if (key === "filters") return { kind: "filters" }
  if (key === "router") return { kind: "router" }
  if (key.startsWith("path:")) return { kind: "path", id: key.slice(5) }
  if (key.startsWith("step:")) return { kind: "step", id: key.slice(5) }
  return flow.router ? { kind: "router" } : { kind: "trigger" }
}
