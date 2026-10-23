import {
  buildAction,
  buildRootFromVisualRules,
  buildWhenRoot,
  parseAction,
  parseRootToVisualRules,
  parseWhenRoot,
  type VisualAction,
  type VisualRule,
  type VisualWhen,
} from "./whatsappTemplateRuleBuilder"

export type VisualTriggerEvent = "message_received" | "message_sent" | "template_sent" | "comment_received"

export type VisualTrigger = {
  event: VisualTriggerEvent
  textOp?: "contains" | "not_contains"
  textValue?: string
  /** Comment trigger already means "a comment arrived". This only limits posts. */
  commentPostScope?: "all" | "selected"
  commentPostIds?: string[]
}

export type VisualGraphNode =
  | {
      id: string
      kind: "condition"
      conditions: VisualWhen[]
      conditionsMatch?: "all" | "any"
    }
  | { id: string; kind: "action"; action: VisualAction }
  | { id: string; kind: "join" }

export type VisualGraphEdge = {
  from: "trigger" | string
  to: string
  branch?: "yes" | "no"
}

export type VisualTemplateFlow = {
  trigger: VisualTrigger
  nodes: VisualGraphNode[]
  edges: VisualGraphEdge[]
}

function newNodeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function rulesToVisualFlow(
  rules: VisualRule[],
  trigger: VisualTrigger = { event: "message_received" }
): VisualTemplateFlow {
  const nodes: VisualGraphNode[] = []
  const edges: VisualGraphEdge[] = []
  let prevNoFrom: "trigger" | string = "trigger"
  let otherwiseSealed = false

  rules.forEach((rule, ri) => {
    if (otherwiseSealed) return
    if (rule.conditions.length === 0) {
      let prev: "trigger" | string = prevNoFrom
      rule.actions.forEach((action, ai) => {
        const id = `a-${rule.id || ri}-${ai}`
        nodes.push({ id, kind: "action", action })
        if (prev === "trigger") edges.push({ from: "trigger", to: id })
        else if (prev === prevNoFrom) edges.push({ from: prev, to: id, branch: "no" })
        else edges.push({ from: prev, to: id })
        prev = id
      })
      return
    }
    const condId = `c-${rule.id || ri}`
    nodes.push({
      id: condId,
      kind: "condition",
      conditions: rule.conditions,
      conditionsMatch: rule.conditionsMatch,
    })
    if (prevNoFrom === "trigger") {
      edges.push({ from: "trigger", to: condId })
    } else {
      edges.push({ from: prevNoFrom, to: condId, branch: "no" })
    }
    let prev: string = condId
    rule.actions.forEach((action, ai) => {
      const id = `a-${rule.id || ri}-${ai}`
      nodes.push({ id, kind: "action", action })
      if (prev === condId) {
        edges.push({ from: condId, to: id, branch: "yes" })
      } else {
        edges.push({ from: prev, to: id })
      }
      prev = id
    })
    const otherwise = rule.elseActions ?? []
    if (otherwise.length > 0) {
      let elsePrev = condId
      otherwise.forEach((action, ai) => {
        const id = `a-else-${rule.id || ri}-${ai}`
        nodes.push({ id, kind: "action", action })
        if (elsePrev === condId) edges.push({ from: condId, to: id, branch: "no" })
        else edges.push({ from: elsePrev, to: id })
        elsePrev = id
      })
      otherwiseSealed = true
      return
    }
    prevNoFrom = condId
  })

  return { trigger, nodes, edges }
}

function hasDirectedCycle(flow: VisualTemplateFlow): boolean {
  const ids = new Set(flow.nodes.map((n) => n.id))
  const outgoing = new Map<string, string[]>()
  for (const id of ids) outgoing.set(id, [])
  for (const e of flow.edges) {
    if (e.from === "trigger" || !ids.has(e.from) || !ids.has(e.to)) continue
    outgoing.get(e.from)!.push(e.to)
  }
  const visiting = new Set<string>()
  const done = new Set<string>()
  const dfs = (id: string): boolean => {
    if (done.has(id)) return false
    if (visiting.has(id)) return true
    visiting.add(id)
    for (const n of outgoing.get(id) ?? []) {
      if (dfs(n)) return true
    }
    visiting.delete(id)
    done.add(id)
    return false
  }
  for (const id of ids) {
    if (dfs(id)) return true
  }
  return false
}

export function visualFlowLooksLikeSingleRuleChain(flow: VisualTemplateFlow): boolean {
  if (flow.nodes.some((n) => n.kind === "join")) return false
  if (hasDirectedCycle(flow)) return false
  const conditions = flow.nodes.filter((n) => n.kind === "condition")
  const actions = flow.nodes.filter((n) => n.kind === "action")
  if (actions.length < 1) return false
  if (conditions.length === 0) {
    const triggerEdges = flow.edges.filter((e) => e.from === "trigger")
    if (triggerEdges.length !== 1) return false
    const actionIds = new Set(actions.map((a) => a.id))
    let cursor = triggerEdges[0]!.to
    const seen = new Set<string>()
    while (actionIds.has(cursor)) {
      if (seen.has(cursor)) return false
      seen.add(cursor)
      const outs = flow.edges.filter((e) => e.from === cursor)
      if (outs.length === 0) break
      if (outs.length !== 1) return false
      cursor = outs[0]!.to
    }
    return seen.size === actionIds.size
  }
  if (conditions.length !== 1) return false
  const cond = conditions[0]!
  const triggerEdges = flow.edges.filter((e) => e.from === "trigger")
  if (triggerEdges.length !== 1 || triggerEdges[0]?.to !== cond.id) return false
  const fromCond = flow.edges.filter((e) => e.from === cond.id)
  if (fromCond.some((e) => e.branch === "no")) return false
  const yes = fromCond.filter((e) => e.branch === "yes")
  if (yes.length !== 1) return false
  const actionIds = new Set(actions.map((a) => a.id))
  let cursor = yes[0]!.to
  const seen = new Set<string>()
  while (actionIds.has(cursor)) {
    if (seen.has(cursor)) return false
    seen.add(cursor)
    const outs = flow.edges.filter((e) => e.from === cursor)
    if (outs.length === 0) break
    if (outs.length !== 1) return false
    cursor = outs[0]!.to
  }
  return seen.size === actionIds.size
}

export function visualFlowLooksLikeLinearInboundRules(flow: VisualTemplateFlow): boolean {
  if (flow.trigger.event !== "message_received") return false
  if ((flow.trigger.textValue ?? "").trim()) return false
  return visualFlowLooksLikeSingleRuleChain(flow)
}

export function visualFlowToVisualRules(flow: VisualTemplateFlow): VisualRule[] | null {
  if (!visualFlowLooksLikeSingleRuleChain(flow)) return null
  const conditions = flow.nodes.filter((n) => n.kind === "condition")
  if (conditions.length === 0) {
    const start = flow.edges.find((e) => e.from === "trigger")?.to
    const actions: VisualAction[] = []
    let cursor: string | undefined = start
    const byId = new Map(flow.nodes.map((n) => [n.id, n]))
    while (cursor) {
      const node = byId.get(cursor)
      if (!node || node.kind !== "action") break
      actions.push(node.action)
      cursor = flow.edges.find((e) => e.from === cursor)?.to
    }
    if (!actions.length) return null
    return [{ id: flow.nodes.find((n) => n.kind === "action")?.id ?? "r", conditions: [], actions }]
  }
  const cond = conditions[0]
  if (!cond || cond.kind !== "condition") return null
  const yes = flow.edges.find((e) => e.from === cond.id && e.branch === "yes")
  if (!yes) return null
  const actions: VisualAction[] = []
  let cursor: string | undefined = yes.to
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  while (cursor) {
    const node = byId.get(cursor)
    if (!node || node.kind !== "action") break
    actions.push(node.action)
    cursor = flow.edges.find((e) => e.from === cursor)?.to
  }
  if (!actions.length) return null
  return [
    {
      id: cond.id,
      conditions: cond.conditions,
      conditionsMatch: cond.conditionsMatch,
      actions,
    },
  ]
}

export function parseRootToVisualFlow(root: unknown): VisualTemplateFlow | null {
  if (!root || typeof root !== "object") return null
  const rec = root as Record<string, unknown>
  if (rec.format === "graph") {
    const triggerRaw = rec.trigger as
      | {
          event?: string
          text?: { op?: string; value?: string }
          commentPosts?: { scope?: string; postIds?: unknown }
        }
      | undefined
    const event = triggerRaw?.event
    if (
      event !== "message_received" &&
      event !== "message_sent" &&
      event !== "template_sent" &&
      event !== "comment_received"
    ) {
      return null
    }
    const trigger: VisualTrigger = { event }
    if (triggerRaw?.text?.op === "contains" || triggerRaw?.text?.op === "not_contains") {
      trigger.textOp = triggerRaw.text.op
      trigger.textValue = triggerRaw.text.value ?? ""
    }
    if (event === "comment_received") {
      const ids = Array.isArray(triggerRaw?.commentPosts?.postIds)
        ? triggerRaw.commentPosts.postIds.filter((id): id is string => typeof id === "string" && !!id.trim())
        : []
      trigger.commentPostScope = triggerRaw?.commentPosts?.scope === "selected" && ids.length > 0 ? "selected" : "all"
      trigger.commentPostIds = trigger.commentPostScope === "selected" ? ids : []
    }
    const nodesRaw = Array.isArray(rec.nodes) ? rec.nodes : []
    const nodes: VisualGraphNode[] = []
    for (const raw of nodesRaw) {
      if (!raw || typeof raw !== "object") return null
      const n = raw as Record<string, unknown>
      const id = typeof n.id === "string" ? n.id : ""
      if (!id) return null
      if (n.kind === "join") {
        nodes.push({ id, kind: "join" })
        continue
      }
      if (n.kind === "action") {
        const action = parseAction(n.action)
        if (!action) return null
        nodes.push({ id, kind: "action", action })
        continue
      }
      if (n.kind === "condition") {
        const parsed = parseWhenRoot(n.condition)
        if (!parsed?.conditions.length) return null
        nodes.push({
          id,
          kind: "condition",
          conditions: parsed.conditions,
          conditionsMatch: parsed.conditionsMatch,
        })
        continue
      }
      return null
    }
    const edges: VisualGraphEdge[] = []
    const edgesRaw = Array.isArray(rec.edges) ? rec.edges : []
    for (const raw of edgesRaw) {
      if (!raw || typeof raw !== "object") return null
      const e = raw as Record<string, unknown>
      if (typeof e.to !== "string") return null
      if (e.from !== "trigger" && typeof e.from !== "string") return null
      const branch = e.branch === "yes" || e.branch === "no" ? e.branch : undefined
      edges.push({ from: e.from as "trigger" | string, to: e.to, ...(branch ? { branch } : {}) })
    }
    return { trigger, nodes, edges }
  }
  const rules = parseRootToVisualRules(root)
  if (!rules || rules.length === 0) return null
  return rulesToVisualFlow(rules)
}

export function buildRootFromVisualFlow(
  flow: VisualTemplateFlow,
  opts?: { agentAutoReplyEnabled?: boolean }
): Record<string, unknown> {
  const linearInbound = visualFlowLooksLikeLinearInboundRules(flow) ? visualFlowToVisualRules(flow) : null
  if (linearInbound) {
    return buildRootFromVisualRules(linearInbound, opts)
  }
  const force = opts?.agentAutoReplyEnabled === false
  const nodes = flow.nodes.map((n) => {
    if (n.kind === "join") return { id: n.id, kind: "join" }
    if (n.kind === "action") {
      const action = buildAction(n.action, { forceExecuteAgentSendReplyFalse: force })
      return { id: n.id, kind: "action", action }
    }
    return {
      id: n.id,
      kind: "condition",
      condition: buildWhenRoot(n.conditions, n.conditionsMatch ?? "all"),
    }
  })
  const trigger: Record<string, unknown> = { event: flow.trigger.event }
  if (flow.trigger.event === "comment_received") {
    const postIds = (flow.trigger.commentPostIds ?? []).map((id) => id.trim()).filter(Boolean)
    trigger.commentPosts =
      flow.trigger.commentPostScope === "selected"
        ? { scope: "selected", postIds }
        : { scope: "all" }
  }
  const textValue = (flow.trigger.textValue ?? "").trim()
  if (textValue && (flow.trigger.textOp === "contains" || flow.trigger.textOp === "not_contains")) {
    trigger.text = { op: flow.trigger.textOp, value: textValue, caseInsensitive: true }
  }
  return {
    format: "graph",
    trigger,
    nodes,
    edges: flow.edges,
  }
}

/** Move header/graph trigger text filters onto WHEN conditions so they only live on the canvas. */
export function applyVisualTriggerTextToRules(
  rules: VisualRule[],
  trigger: VisualTrigger
): { rules: VisualRule[]; trigger: VisualTrigger } {
  const eventOnly: VisualTrigger = {
    event: trigger.event,
    ...(trigger.commentPostScope ? { commentPostScope: trigger.commentPostScope } : {}),
    ...(trigger.commentPostIds?.length ? { commentPostIds: trigger.commentPostIds } : {}),
  }
  const op = trigger.textOp
  const value = (trigger.textValue ?? "").trim()
  if ((op !== "contains" && op !== "not_contains") || !value) {
    return { rules, trigger: eventOnly }
  }
  const already = rules.some((rule) =>
    rule.conditions.some((c) => c.type === op && (c.containsValue ?? "").trim().toLowerCase() === value.toLowerCase())
  )
  if (already || rules.length === 0) {
    return { rules, trigger: eventOnly }
  }
  const [first, ...rest] = rules
  const nextFirst: VisualRule = {
    ...first!,
    conditions: [{ type: op, containsValue: value, containsCaseInsensitive: true }, ...first!.conditions],
  }
  return { rules: [nextFirst, ...rest], trigger: eventOnly }
}

/**
 * The comment event already means "a comment arrived". Fold the old
 * instagram_comment condition into the trigger's post filter so the canvas
 * does not ask for that condition again. Text filters become normal contains rules.
 */
export function absorbCommentConditionsIntoTrigger(
  rules: VisualRule[],
  trigger: VisualTrigger
): { rules: VisualRule[]; trigger: VisualTrigger } {
  if (trigger.event !== "comment_received") return { rules, trigger }
  let sawAll = trigger.commentPostScope === "all"
  let sawSelected = trigger.commentPostScope === "selected" && (trigger.commentPostIds ?? []).some((id) => id.trim())
  const ids = new Set((trigger.commentPostIds ?? []).map((id) => id.trim()).filter(Boolean))
  const nextRules = rules.map((rule) => {
    const kept: VisualWhen[] = []
    for (const cond of rule.conditions) {
      if (cond.type !== "instagram_comment") {
        kept.push(cond)
        continue
      }
      if (cond.commentPostScope === "selected" && (cond.commentPostIds ?? []).some((id) => id.trim())) {
        sawSelected = true
        for (const id of cond.commentPostIds ?? []) {
          if (id.trim()) ids.add(id.trim())
        }
      } else {
        sawAll = true
      }
      const text = (cond.commentTextValue ?? "").trim()
      if ((cond.commentTextMatch === "contains" || cond.commentTextMatch === "not_contains") && text) {
        kept.push({
          type: cond.commentTextMatch,
          containsValue: text,
          containsCaseInsensitive: cond.commentTextCaseInsensitive !== false,
        })
      }
    }
    return { ...rule, conditions: kept }
  })
  const commentPostScope = sawAll || !sawSelected ? "all" : "selected"
  return {
    rules: nextRules,
    trigger: {
      ...trigger,
      commentPostScope,
      commentPostIds: commentPostScope === "selected" ? [...ids] : [],
    },
  }
}

export function persistVisualTemplateRoot(
  rules: VisualRule[],
  trigger: VisualTrigger,
  opts?: { agentAutoReplyEnabled?: boolean }
): Record<string, unknown> {
  const absorbed = absorbCommentConditionsIntoTrigger(rules, trigger)
  const normalized = applyVisualTriggerTextToRules(absorbed.rules, absorbed.trigger)
  if (normalized.trigger.event === "message_received") {
    return buildRootFromVisualRules(normalized.rules, opts)
  }
  return buildRootFromVisualFlow(rulesToVisualFlow(normalized.rules, normalized.trigger), opts)
}

export const DEFAULT_VISUAL_TRIGGER: VisualTrigger = { event: "message_received" }

export function createEmptyVisualFlow(): VisualTemplateFlow {
  return rulesToVisualFlow([
    {
      id: newNodeId("r"),
      conditions: [{ type: "first_inbound" }],
      actions: [{ type: "execute_agent", sendReply: true }],
    },
  ])
}
