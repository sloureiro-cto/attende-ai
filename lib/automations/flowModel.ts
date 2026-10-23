import {
  parseRootToVisualFlow,
  persistVisualTemplateRoot,
  visualFlowLooksLikeSingleRuleChain,
  visualFlowToVisualRules,
  type VisualTrigger,
} from "lib/whatsapp-lite/messagingTemplateVisualGraph"
import { isWaActionConfigured, isWaWhenConfigured } from "lib/whatsapp-lite/templateFlowLayout"
import {
  buildAction,
  buildWhenRoot,
  parseAction,
  parseRootToVisualRules,
  parseWhenRoot,
  type VisualAction,
  type VisualRule,
  type VisualWhen,
} from "lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import type { AutomationChannel } from "./types"

/**
 * The editor's model of an automation: Trigger -> filters -> (optional router with N paths + else)
 * -> common steps. Pure data, no React. It maps to the backend `root`:
 *
 *  - no router and at least one filter: the SAME classic/graph root the existing editor produces
 *    (`persistVisualTemplateRoot`), so re-saving an existing automation never changes how it runs;
 *  - a router (or no filters): a graph with `router` / `join` nodes.
 */

export const ROUTER_ELSE_ID = "else"
export const ROUTER_MAX_PATHS = 10
const ROUTER_DEFAULT_MIN_CONFIDENCE = 0.7

export type EditorStep = { id: string; action: VisualAction }

type PathBase = { id: string; name: string; steps: EditorStep[] }
export type EditorPath =
  | (PathBase & { kind: "ai"; description: string })
  | (PathBase & { kind: "condition"; conditions: VisualWhen[]; conditionsMatch: "all" | "any" })
  | (PathBase & { kind: "split"; percent: number })

export type EditorRouter = {
  paths: EditorPath[]
  elseSteps: EditorStep[]
  runAllMatching: boolean
  /** 0-1, AI paths only. */
  minConfidence: number
  classificationPrompt: string
}

export type EditorFlow = {
  trigger: VisualTrigger
  filterMatch: "all" | "any"
  filters: VisualWhen[]
  router: EditorRouter | null
  /** Steps right after the filters (used when there is no router). */
  steps: EditorStep[]
  /** Steps every path runs afterwards (only with a router). */
  afterSteps: EditorStep[]
}

let counter = 0
export function newId(prefix: string): string {
  counter += 1
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}${counter}`
}

export const newStep = (action: VisualAction): EditorStep => ({ id: newId("s"), action })

export function createEmptyFlow(): EditorFlow {
  return {
    trigger: { event: "message_received" },
    filterMatch: "all",
    filters: [],
    router: null,
    steps: [],
    afterSteps: [],
  }
}

export function createRouter(): EditorRouter {
  return {
    paths: [],
    elseSteps: [],
    runAllMatching: false,
    minConfidence: ROUTER_DEFAULT_MIN_CONFIDENCE,
    classificationPrompt: "",
  }
}

export function createPath(kind: EditorPath["kind"], name: string): EditorPath {
  const base = { id: newId("p"), name, steps: [] as EditorStep[] }
  if (kind === "ai") return { ...base, kind, description: "" }
  if (kind === "split") return { ...base, kind, percent: 50 }
  return { ...base, kind, conditions: [], conditionsMatch: "all" }
}

// --- build (editor -> backend root) ---------------------------------------------------------

type Edge = { from: string; to: string; branch?: "yes" | "no"; path?: string }

function buildTrigger(trigger: VisualTrigger): Record<string, unknown> {
  const out: Record<string, unknown> = { event: trigger.event }
  if (trigger.event === "comment_received") {
    const postIds = (trigger.commentPostIds ?? []).map((id) => id.trim()).filter(Boolean)
    out.commentPosts = trigger.commentPostScope === "selected" ? { scope: "selected", postIds } : { scope: "all" }
  }
  const textValue = (trigger.textValue ?? "").trim()
  if (textValue && (trigger.textOp === "contains" || trigger.textOp === "not_contains")) {
    out.text = { op: trigger.textOp, value: textValue, caseInsensitive: true }
  }
  return out
}

function buildSteps(steps: EditorStep[], agentAutoReplyEnabled: boolean) {
  return steps.map((s) => ({
    id: s.id,
    built: buildAction(s.action, { forceExecuteAgentSendReplyFalse: !agentAutoReplyEnabled }),
  }))
}

function buildPath(path: EditorPath): Record<string, unknown> {
  if (path.kind === "ai") {
    return { id: path.id, name: path.name.trim(), kind: "ai", ...(path.description.trim() ? { description: path.description.trim() } : {}) }
  }
  if (path.kind === "split") {
    return { id: path.id, name: path.name.trim(), kind: "split", percent: Math.round(path.percent) }
  }
  return {
    id: path.id,
    name: path.name.trim(),
    kind: "condition",
    condition: buildWhenRoot(path.conditions, path.conditionsMatch),
  }
}

/** Editor flow -> the `root` the API stores. Does not validate (use `validateEditorFlow`). */
export function flowToRoot(flow: EditorFlow, opts?: { agentAutoReplyEnabled?: boolean }): Record<string, unknown> {
  const agentAutoReplyEnabled = opts?.agentAutoReplyEnabled !== false

  // Same output as the existing editor for what it already could express.
  if (!flow.router && flow.filters.length > 0) {
    const rule: VisualRule = {
      id: "r",
      conditionsMatch: flow.filterMatch,
      conditions: flow.filters,
      actions: flow.steps.map((s) => s.action),
    }
    return persistVisualTemplateRoot([rule], flow.trigger, { agentAutoReplyEnabled })
  }

  const nodes: Array<Record<string, unknown>> = []
  const edges: Edge[] = []

  // Appends action nodes in sequence after `from`; returns the id the next element hangs off.
  const chain = (from: string, via: Partial<Edge>, steps: EditorStep[]): { last: string; via: Partial<Edge> } => {
    let prev = from
    let edgeProps: Partial<Edge> = via
    for (const { id, built } of buildSteps(steps, agentAutoReplyEnabled)) {
      if (!built) continue // an unconfigured step must not serialize as `action: null`
      nodes.push({ id, kind: "action", action: built })
      edges.push({ from: prev, to: id, ...edgeProps })
      prev = id
      edgeProps = {}
    }
    return { last: prev, via: edgeProps }
  }

  let entry = "trigger"
  let entryVia: Partial<Edge> = {}
  if (flow.filters.length > 0) {
    nodes.push({ id: "filter", kind: "condition", condition: buildWhenRoot(flow.filters, flow.filterMatch) })
    edges.push({ from: "trigger", to: "filter" })
    entry = "filter"
    entryVia = { branch: "yes" }
  }

  if (!flow.router) {
    chain(entry, entryVia, flow.steps)
  } else {
    const router = flow.router
    nodes.push({
      id: "router",
      kind: "router",
      paths: router.paths.map(buildPath),
      ...(router.runAllMatching ? { runAllMatching: true } : {}),
      minConfidence: router.minConfidence,
      ...(router.classificationPrompt.trim() ? { classificationPrompt: router.classificationPrompt.trim() } : {}),
    })
    edges.push({ from: entry, to: "router", ...entryVia })

    const hasAfter = flow.afterSteps.length > 0
    const legs: Array<{ pathId: string; steps: EditorStep[] }> = [
      ...router.paths.map((p) => ({ pathId: p.id, steps: p.steps })),
      { pathId: ROUTER_ELSE_ID, steps: router.elseSteps },
    ]
    const ends: Array<{ from: string; via: Partial<Edge> }> = []
    for (const leg of legs) {
      const res = chain("router", { path: leg.pathId }, leg.steps)
      if (hasAfter) ends.push({ from: res.last, via: res.via })
    }
    if (hasAfter) {
      nodes.push({ id: "join", kind: "join" })
      for (const end of ends) edges.push({ from: end.from, to: "join", ...end.via })
      chain("join", {}, flow.afterSteps)
    }
  }

  return { format: "graph", trigger: buildTrigger(flow.trigger), nodes, edges }
}

// --- parse (backend root -> editor) ---------------------------------------------------------

type ParsedRoot =
  | { kind: "flow"; flow: EditorFlow }
  | {
      kind: "classic"
      /** Why this automation can't be edited in the visual editor without losing something. */
      reason: "multiple_rules" | "else_or_label_paths" | "unsupported_graph"
      rulesCount: number
    }

const stepsFromActions = (actions: VisualAction[]): EditorStep[] => actions.map((a) => newStep(a))

function parseTrigger(raw: unknown): VisualTrigger | null {
  if (!raw || typeof raw !== "object") return null
  const t = raw as { event?: string; text?: { op?: string; value?: string }; commentPosts?: { scope?: string; postIds?: unknown } }
  if (
    t.event !== "message_received" &&
    t.event !== "message_sent" &&
    t.event !== "template_sent" &&
    t.event !== "comment_received"
  ) {
    return null
  }
  const trigger: VisualTrigger = { event: t.event }
  if (t.text?.op === "contains" || t.text?.op === "not_contains") {
    trigger.textOp = t.text.op
    trigger.textValue = t.text.value ?? ""
  }
  if (t.event === "comment_received") {
    const ids = Array.isArray(t.commentPosts?.postIds)
      ? (t.commentPosts?.postIds as unknown[]).filter((id): id is string => typeof id === "string" && !!id.trim())
      : []
    trigger.commentPostScope = t.commentPosts?.scope === "selected" && ids.length > 0 ? "selected" : "all"
    trigger.commentPostIds = trigger.commentPostScope === "selected" ? ids : []
  }
  return trigger
}

type RawNode = { id: string; kind: string } & Record<string, unknown>
type RawEdge = { from: string; to: string; branch?: string; path?: string }

/**
 * Reads the graphs this editor writes (filter? -> router? -> paths -> join? -> steps). Anything
 * with a different shape (extra branches, orphan nodes) returns null so it is never edited lossily.
 */
function parseEditorGraph(root: Record<string, unknown>): EditorFlow | null {
  const trigger = parseTrigger(root.trigger)
  if (!trigger || !Array.isArray(root.nodes) || !Array.isArray(root.edges)) return null
  const nodes = root.nodes as RawNode[]
  const edges = root.edges as RawEdge[]
  const byId = new Map<string, RawNode>()
  for (const n of nodes) {
    if (!n || typeof n.id !== "string" || byId.has(n.id)) return null
    byId.set(n.id, n)
  }
  const out = (id: string) => edges.filter((e) => e.from === id)
  const incoming = new Map<string, number>()
  for (const e of edges) incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1)
  const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visited.has(id)) return false
    visited.add(id)
    return true
  }

  const readSteps = (startId: string | undefined, stopAt?: string): { steps: EditorStep[]; end?: string } | null => {
    const steps: EditorStep[] = []
    let cursor = startId
    while (cursor && cursor !== stopAt) {
      const node = byId.get(cursor)
      if (!node || node.kind !== "action") break
      if (!visit(cursor)) return null
      const action = parseAction(node.action)
      if (!action) return null
      steps.push({ id: node.id, action })
      const next = out(cursor)
      if (next.length > 1 || next.some((e) => e.branch || e.path)) return null
      cursor = next[0]?.to
    }
    return { steps, end: cursor }
  }

  const triggerEdges = out("trigger")
  const triggerEdge = triggerEdges[0]
  if (triggerEdges.length !== 1 || !triggerEdge || triggerEdge.branch || triggerEdge.path) return null
  let cursor: string | undefined = triggerEdge.to

  let filters: VisualWhen[] = []
  let filterMatch: "all" | "any" = "all"
  const first = cursor ? byId.get(cursor) : undefined
  if (first?.kind === "condition") {
    if (!visit(first.id)) return null
    const parsed = parseWhenRoot(first.condition)
    if (!parsed?.conditions.length) return null
    filters = parsed.conditions
    filterMatch = parsed.conditionsMatch
    const outs = out(first.id)
    const onlyOut = outs[0]
    if (outs.length !== 1 || !onlyOut || onlyOut.branch !== "yes" || onlyOut.path) return null
    cursor = onlyOut.to
  }

  const next = cursor ? byId.get(cursor) : undefined
  let flow: EditorFlow
  if (next?.kind === "router") {
    if (!visit(next.id) || incoming.get(next.id) !== 1) return null
    const rawPaths = next.paths
    if (!Array.isArray(rawPaths)) return null
    const routerOut = out(next.id)
    if (routerOut.some((e) => !e.path || e.branch)) return null
    const targetOf = (pathId: string): string | undefined => {
      const list = routerOut.filter((e) => e.path === pathId)
      return list.length === 1 ? list[0]?.to : undefined
    }
    const knownPathIds = new Set<string>([ROUTER_ELSE_ID, ...rawPaths.map((p) => (p as { id?: string })?.id ?? "")])
    if (routerOut.some((e) => !knownPathIds.has(e.path as string))) return null
    if (new Set(routerOut.map((e) => `${e.path}`)).size !== routerOut.length) return null

    // The join (if any) is the node several legs converge on.
    const joinNode = nodes.find((n) => n.kind === "join")
    const joinId = joinNode?.id
    const legSteps = (pathId: string) => {
      const start = targetOf(pathId)
      if (!start || start === joinId) return { steps: [] as EditorStep[], end: start }
      return readSteps(start, joinId)
    }

    const paths: EditorPath[] = []
    for (const raw of rawPaths as Array<Record<string, unknown>>) {
      const id = String(raw.id ?? "")
      const name = String(raw.name ?? "")
      const leg = legSteps(id)
      if (!leg) return null
      if (raw.kind === "ai") {
        paths.push({ id, name, kind: "ai", description: typeof raw.description === "string" ? raw.description : "", steps: leg.steps })
      } else if (raw.kind === "split") {
        paths.push({ id, name, kind: "split", percent: Number(raw.percent) || 0, steps: leg.steps })
      } else if (raw.kind === "condition") {
        const parsed = parseWhenRoot(raw.condition)
        if (!parsed?.conditions.length) return null
        paths.push({ id, name, kind: "condition", conditions: parsed.conditions, conditionsMatch: parsed.conditionsMatch, steps: leg.steps })
      } else {
        return null
      }
    }
    const elseLeg = legSteps(ROUTER_ELSE_ID)
    if (!elseLeg) return null

    let afterSteps: EditorStep[] = []
    if (joinId) {
      if (!visit(joinId)) return null
      const joinOut = out(joinId)
      if (joinOut.length > 1 || joinOut.some((e) => e.branch || e.path)) return null
      const after = readSteps(joinOut[0]?.to)
      if (!after || after.end) return null
      afterSteps = after.steps
    }

    flow = {
      trigger,
      filterMatch,
      filters,
      router: {
        paths,
        elseSteps: elseLeg.steps,
        runAllMatching: next.runAllMatching === true,
        minConfidence: typeof next.minConfidence === "number" ? next.minConfidence : ROUTER_DEFAULT_MIN_CONFIDENCE,
        classificationPrompt: typeof next.classificationPrompt === "string" ? next.classificationPrompt : "",
      },
      steps: [],
      afterSteps,
    }
  } else {
    const run = readSteps(cursor)
    if (!run || run.end) return null
    flow = { trigger, filterMatch, filters, router: null, steps: run.steps, afterSteps: [] }
  }

  // Every node must have been accounted for, or the editor would silently drop some on save.
  if (visited.size !== nodes.length) return null
  return flow
}

export function parseRoot(root: unknown): ParsedRoot {
  if (!root || typeof root !== "object") return { kind: "classic", reason: "unsupported_graph", rulesCount: 0 }
  const rec = root as Record<string, unknown>

  if (rec.format === "graph") {
    const nodes = Array.isArray(rec.nodes) ? (rec.nodes as Array<{ kind?: string }>) : []
    const hasRouter = nodes.some((n) => n?.kind === "router")
    if (hasRouter) {
      const flow = parseEditorGraph(rec)
      return flow ? { kind: "flow", flow } : { kind: "classic", reason: "unsupported_graph", rulesCount: 0 }
    }
    // A graph without a router: reuse the existing reader for what it already supported.
    const visual = parseRootToVisualFlow(rec)
    if (visual && visualFlowLooksLikeSingleRuleChain(visual)) {
      const only = visualFlowToVisualRules(visual)?.[0]
      const rulesLength = visualFlowToVisualRules(visual)?.length
      if (rulesLength === 1 && only && !only.elseActions?.length && !Object.keys(only.labelActions ?? {}).length) {
        return {
          kind: "flow",
          flow: {
            trigger: visual.trigger,
            filterMatch: only.conditionsMatch ?? "all",
            filters: only.conditions,
            router: null,
            steps: stepsFromActions(only.actions),
            afterSteps: [],
          },
        }
      }
    }
    const filterless = parseEditorGraph(rec)
    return filterless ? { kind: "flow", flow: filterless } : { kind: "classic", reason: "unsupported_graph", rulesCount: 0 }
  }

  const rules = parseRootToVisualRules(rec)
  if (!rules) return { kind: "classic", reason: "unsupported_graph", rulesCount: 0 }
  if (rules.length > 1) return { kind: "classic", reason: "multiple_rules", rulesCount: rules.length }
  const r = rules[0]
  if (rules.length === 1 && r) {
    if (r.elseActions?.length || Object.keys(r.labelActions ?? {}).length) {
      return { kind: "classic", reason: "else_or_label_paths", rulesCount: 1 }
    }
    return {
      kind: "flow",
      flow: {
        trigger: { event: "message_received" },
        filterMatch: r.conditionsMatch ?? "all",
        filters: r.conditions,
        router: null,
        steps: stepsFromActions(r.actions),
        afterSteps: [],
      },
    }
  }
  return { kind: "flow", flow: createEmptyFlow() }
}

/**
 * Explicit, user-triggered migration of a classic multi-rule automation to a router in
 * "conditions" mode (rule i becomes path i, first match wins). Only offered when it is lossless:
 * no else / label paths. Never applied automatically.
 */
export function convertClassicRulesToRouter(root: unknown): EditorFlow | null {
  const rules = parseRootToVisualRules(root)
  if (!rules || rules.length < 2 || rules.length > ROUTER_MAX_PATHS) return null
  if (rules.some((r) => r.elseActions?.length || Object.keys(r.labelActions ?? {}).length)) return null
  return {
    trigger: { event: "message_received" },
    filterMatch: "all",
    filters: [],
    router: {
      paths: rules.map((r, i) => ({
        id: newId("p"),
        name: `Path ${i + 1}`,
        kind: "condition" as const,
        conditions: r.conditions,
        conditionsMatch: r.conditionsMatch ?? "all",
        steps: stepsFromActions(r.actions),
      })),
      elseSteps: [],
      runAllMatching: false,
      minConfidence: ROUTER_DEFAULT_MIN_CONFIDENCE,
      classificationPrompt: "",
    },
    steps: [],
    afterSteps: [],
  }
}

// --- validation -----------------------------------------------------------------------------

type FlowIssueCode =
  | "no_actions"
  | "step_incomplete"
  | "filter_incomplete"
  | "router_no_paths"
  | "router_too_many_paths"
  | "path_name_missing"
  | "path_name_duplicate"
  | "path_condition_missing"
  | "path_condition_incomplete"
  | "path_ai_description_missing"
  | "split_invalid"
  | "split_total_over_100"
  | "trigger_text_missing"
  | "comment_trigger_channel"

/** `nodeKey` is what the canvas highlights: trigger | filters | router | path:<id> | step:<id>. */
export type FlowIssue = { nodeKey: string; code: FlowIssueCode; params?: Record<string, string | number> }

export function allSteps(flow: EditorFlow): EditorStep[] {
  return [
    ...flow.steps,
    ...(flow.router ? [...flow.router.paths.flatMap((p) => p.steps), ...flow.router.elseSteps] : []),
    ...flow.afterSteps,
  ]
}

export function validateEditorFlow(flow: EditorFlow, channels: AutomationChannel[]): FlowIssue[] {
  const issues: FlowIssue[] = []

  if ((flow.trigger.textOp === "contains" || flow.trigger.textOp === "not_contains") && !(flow.trigger.textValue ?? "").trim()) {
    issues.push({ nodeKey: "trigger", code: "trigger_text_missing" })
  }
  if (flow.trigger.event === "comment_received" && channels.some((c) => c !== "instagram")) {
    issues.push({ nodeKey: "trigger", code: "comment_trigger_channel" })
  }
  if (flow.filters.some((w) => !isWaWhenConfigured(w))) issues.push({ nodeKey: "filters", code: "filter_incomplete" })

  if (flow.router) {
    const r = flow.router
    if (r.paths.length === 0) issues.push({ nodeKey: "router", code: "router_no_paths" })
    if (r.paths.length > ROUTER_MAX_PATHS) issues.push({ nodeKey: "router", code: "router_too_many_paths", params: { max: ROUTER_MAX_PATHS } })
    const seen = new Set<string>()
    let splitTotal = 0
    for (const p of r.paths) {
      const key = `path:${p.id}`
      const name = p.name.trim()
      if (!name) issues.push({ nodeKey: key, code: "path_name_missing" })
      else if (seen.has(name.toLowerCase())) issues.push({ nodeKey: key, code: "path_name_duplicate" })
      seen.add(name.toLowerCase())
      if (p.kind === "condition") {
        if (p.conditions.length === 0) issues.push({ nodeKey: key, code: "path_condition_missing" })
        else if (p.conditions.some((w) => !isWaWhenConfigured(w))) issues.push({ nodeKey: key, code: "path_condition_incomplete" })
      } else if (p.kind === "ai") {
        if (!p.description.trim()) issues.push({ nodeKey: key, code: "path_ai_description_missing" })
      } else {
        if (!Number.isInteger(p.percent) || p.percent < 0 || p.percent > 100) issues.push({ nodeKey: key, code: "split_invalid" })
        splitTotal += p.percent
      }
    }
    if (splitTotal > 100) issues.push({ nodeKey: "router", code: "split_total_over_100" })
  }

  const steps = allSteps(flow)
  if (steps.length === 0) issues.push({ nodeKey: "flow", code: "no_actions" })
  for (const s of steps) {
    if (!isWaActionConfigured(s.action)) issues.push({ nodeKey: `step:${s.id}`, code: "step_incomplete" })
  }
  return issues
}
