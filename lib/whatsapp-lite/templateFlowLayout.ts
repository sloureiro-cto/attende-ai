import type { Edge, Node } from "reactflow"
import { MarkerType } from "reactflow"
import type { MessagingTemplateFlowChannel } from "./messagingTemplateFlowActionLabels"
import { templateFlowActionLabelKey } from "./messagingTemplateFlowActionLabels"
import type { VisualTriggerEvent } from "./messagingTemplateVisualGraph"
import type { VisualAction, VisualRule, VisualWhen } from "./whatsappTemplateRuleBuilder"
import { extraActionLanes, yesLaneTitle, type ExtraActionLane } from "./templateRuleBranches"

const STEP_X = 300
const BASE_Y = 100
/** Arestas no mesmo tom que o editor de workflows (`WorkflowCanvas`). */
const EDGE = "#dfe1e7"

export function isWaActionConfigured(act: VisualAction): boolean {
  if (act.type === "execute_agent") return !!(act.agentId ?? "").trim()
  if (act.type === "move_linked_card" || act.type === "clone_linked_card") return !!(act.columnId ?? "").trim()
  if (act.type === "send_text") {
    const content = act.outboundContent
    if (content?.source === "workspace") return !!(content.templateId ?? "").trim()
    if (content?.source === "meta") {
      return !!(content.templateId ?? "").trim() || !!(content.templateName ?? "").trim()
    }
    return !!(act.text ?? content?.text ?? "").trim()
  }
  if (act.type === "schedule_followup") {
    if (act.followupUseAgentGenerated === true) return true
    const contents = act.followupMessageContents ?? []
    if (
      contents.some((c) => {
        if (c.source === "workspace") return !!(c.templateId ?? "").trim()
        if (c.source === "meta") return !!(c.templateId ?? "").trim() || !!(c.templateName ?? "").trim()
        return !!(c.text ?? "").trim()
      })
    ) {
      return true
    }
    return (act.followupMessages ?? []).some((m) => !!(m ?? "").trim())
  }
  if (act.type === "add_label") return !!(act.labelText ?? "").trim()
  if (act.type === "set_lead_source") return !!(act.leadSourceText ?? "").trim()
  if (act.type === "transition_state") return !!(act.transitionState ?? "").trim()
  if (act.type === "disable_auto_reply") return true
  if (act.type === "enable_conversation_agent") return !!(act.agentId ?? "").trim()
  if (act.type === "distribute_lead") {
    const p = act.leadDist
    const crm = p?.crmMode ?? "keep_linked"
    const assign = p?.assignMode ?? "none"
    if (crm !== "keep_linked" || assign !== "none") return true
    return false
  }
  if (act.type === "assign_conversation") {
    if ((act.assignUserId ?? "").trim()) return true
    return (act.leadDist?.assignMode ?? "none") !== "none"
  }
  if (act.type === "route_to_crm") return !!(act.moveProjectId ?? "").trim()
  if (act.type === "reply_to_comment") return !!(act.text ?? "").trim()
  if (act.type === "create_lead") return !!(act.moveProjectId ?? "").trim() && !!(act.boardId ?? "").trim()
  if (act.type === "create_contact" || act.type === "stop_flow") return true
  return false
}

export function isWaWhenConfigured(w: VisualWhen): boolean {
  switch (w.type) {
    case "first_inbound":
    case "within_business_hours":
    case "outside_business_hours":
    case "chat_type":
      return true
    case "contains":
    case "not_contains":
      return !!(w.containsValue ?? "").trim()
    case "regex":
      return !!(w.regexPattern ?? "").trim()
    case "llm_match":
    case "llm_conversation_match":
      return !!(w.llmMatch ?? "").trim()
    case "linked_card_in":
      return (w.linkedCardAnyOf ?? []).some((row) => !!(row.projectId ?? "").trim())
    case "new_lead":
      return (w.newLeadScope ?? "workspace") === "workspace" || !!(w.newLeadProjectId ?? "").trim()
    case "instagram_comment":
      if (w.commentPostScope === "selected" && !(w.commentPostIds ?? []).some((id) => id.trim())) return false
      if (w.commentTextMatch === "contains" || w.commentTextMatch === "not_contains")
        return !!(w.commentTextValue ?? "").trim()
      return true
    default:
      return true
  }
}

function actionTypeLabel(
  type: VisualAction["type"],
  t: FlowTranslate,
  channel: MessagingTemplateFlowChannel = "whatsapp"
): string {
  return t(templateFlowActionLabelKey(channel, type))
}

export function summarizeTriggerEvent(
  event: VisualTriggerEvent,
  t: (k: import("lib/i18n/translations/workspaceSettings").WorkspaceSettingsTranslationKey) => string
): string {
  if (event === "message_sent") return t("whatsappLiteTemplateFlowTriggerSent")
  if (event === "template_sent") return t("whatsappLiteTemplateFlowTriggerTemplateSent")
  if (event === "comment_received") return t("whatsappLiteTemplateFlowTriggerComment")
  return t("whatsappLiteTemplateFlowTriggerInbound")
}

export function summarizeWhen(
  w: VisualWhen,
  t: (k: import("lib/i18n/translations/workspaceSettings").WorkspaceSettingsTranslationKey) => string
): string {
  switch (w.type) {
    case "first_inbound":
      return t("whatsappLiteRuleTemplatesWhenFirstInbound")
    case "contains":
      return w.containsValue?.trim()
        ? `"${w.containsValue.trim().slice(0, 40)}${(w.containsValue?.length ?? 0) > 40 ? "…" : ""}"`
        : t("whatsappLiteRuleTemplatesWhenContains")
    case "not_contains":
      return w.containsValue?.trim()
        ? `≠ "${w.containsValue.trim().slice(0, 36)}${(w.containsValue?.length ?? 0) > 36 ? "…" : ""}"`
        : t("whatsappLiteRuleTemplatesWhenNotContains")
    case "regex":
      return w.regexPattern?.trim()
        ? `/${w.regexPattern.trim().slice(0, 28)}/`
        : t("whatsappLiteRuleTemplatesWhenRegex")
    case "llm_match":
      return w.llmMatch?.trim() ? `LLM → ${w.llmMatch.trim()}` : t("whatsappLiteRuleTemplatesWhenLlm")
    case "llm_conversation_match":
      return w.llmMatch?.trim() ? `LLM conv. → ${w.llmMatch.trim()}` : t("whatsappLiteRuleTemplatesWhenLlmConversation")
    case "event_date_days_ahead": {
      const op = w.eventDateOp ?? "gt"
      const days = Number.isFinite(w.eventDateDays) ? w.eventDateDays : 30
      return `${t("whatsappLiteRuleTemplatesWhenEventDateDaysAhead")}: ${op} ${days}`
    }
    case "within_business_hours":
      return t("whatsappLiteRuleTemplatesWhenWithinBusinessHours")
    case "outside_business_hours":
      return t("whatsappLiteRuleTemplatesWhenOutsideBusinessHours")
    case "chat_type": {
      if (w.chatTypeValue === "group") return t("whatsappLiteRuleTemplatesWhenChatTypeGroup")
      if (w.chatTypeValue === "any") return t("whatsappLiteRuleTemplatesWhenChatTypeAny")
      return t("whatsappLiteRuleTemplatesWhenChatTypeDirect")
    }
    case "linked_card_in": {
      const n = (w.linkedCardAnyOf ?? []).filter((r) => !!(r.projectId ?? "").trim()).length
      return n > 0
        ? `${t("whatsappLiteRuleTemplatesWhenLinkedCard")} (${n})`
        : t("whatsappLiteRuleTemplatesWhenLinkedCard")
    }
    case "new_lead":
      return (w.newLeadScope ?? "workspace") === "project"
        ? t("whatsappLiteRuleTemplatesWhenNewLeadFunnel")
        : t("whatsappLiteRuleTemplatesWhenNewLead")
    case "instagram_comment": {
      const scope =
        w.commentPostScope === "selected"
          ? t("instagramLiteRuleTemplatesWhenCommentSelected")
          : t("instagramLiteRuleTemplatesWhenCommentAll")
      const text = (w.commentTextValue ?? "").trim()
      if (w.commentTextMatch === "contains" && text) {
        return `${scope} · "${text.slice(0, 28)}${text.length > 28 ? "…" : ""}"`
      }
      if (w.commentTextMatch === "not_contains" && text) {
        return `${scope} · ≠ "${text.slice(0, 24)}${text.length > 24 ? "…" : ""}"`
      }
      return scope
    }
    default:
      return t("whatsappLiteRuleTemplatesWhenLabel")
  }
}

export function summarizeAction(
  a: VisualAction,
  t: (k: import("lib/i18n/translations/workspaceSettings").WorkspaceSettingsTranslationKey) => string,
  agentName?: string,
  columnTitle?: string,
  channel: MessagingTemplateFlowChannel = "whatsapp"
): string {
  if (a.type === "execute_agent") {
    const name = agentName?.trim() || a.agentId?.slice(-6) || "…"
    return `${t("whatsappLiteRuleTemplatesActionExecuteAgent")}: ${name}`
  }
  if (a.type === "move_linked_card" || a.type === "clone_linked_card") {
    const label =
      a.type === "clone_linked_card"
        ? t("whatsappLiteRuleTemplatesActionCloneCard")
        : t("whatsappLiteRuleTemplatesActionMoveCard")
    return columnTitle?.trim() ? `${label} → ${columnTitle}` : label
  }
  if (a.type === "schedule_followup") {
    const delay = a.followupDelayMinutes ?? 30
    const max = a.followupMax ?? 3
    const hours = a.followupSubsequentDelayHours ?? 24
    return `${t("whatsappLiteRuleTemplatesActionScheduleFollowup")} · ${delay} min · ${max}× · ${hours}h`
  }
  if (a.type === "distribute_lead") return t("whatsappLiteRuleTemplatesActionDistributeLead")
  if (a.type === "assign_conversation") {
    if ((a.assignUserId ?? "").trim())
      return `${t("whatsappLiteRuleTemplatesActionAssignConversation")}: ${a.assignUserId}`
    return t("whatsappLiteRuleTemplatesActionAssignConversation")
  }
  if (a.type === "route_to_crm") {
    return columnTitle?.trim()
      ? `${t("whatsappLiteRuleTemplatesActionRouteToCrm")} → ${columnTitle}`
      : t("whatsappLiteRuleTemplatesActionRouteToCrm")
  }
  if (a.type === "reply_to_comment") {
    const tx = (a.text ?? "").trim()
    const label = t("instagramLiteRuleTemplatesActionReplyToComment")
    return tx ? `${label}: ${tx.slice(0, 36)}${tx.length > 36 ? "…" : ""}` : label
  }
  if (a.type === "create_lead") return t("whatsappLiteRuleTemplatesActionCreateLead")
  if (a.type === "create_contact") return t("whatsappLiteRuleTemplatesActionCreateContact")
  if (a.type === "stop_flow") return t("whatsappLiteRuleTemplatesActionStopFlow")
  if (a.type === "disable_auto_reply") return t("whatsappLiteRuleTemplatesActionDisableAutoReply")
  if (a.type === "enable_conversation_agent") {
    const name = agentName?.trim() || a.agentId?.slice(-6) || "…"
    return `${t("whatsappLiteRuleTemplatesActionEnableConversationAgent")}: ${name}`
  }
  const tx = (a.text ?? "").trim()
  const sendLabel = t(templateFlowActionLabelKey(channel, "send_text"))
  return tx ? `${sendLabel}: ${tx.slice(0, 36)}${tx.length > 36 ? "…" : ""}` : sendLabel
}

export type FlowTranslate = (
  key: import("lib/i18n/translations/workspaceSettings").WorkspaceSettingsTranslationKey,
  replacements?: Record<string, string | number>
) => string

export type TemplateFlowSelection =
  | { kind: "trigger" }
  | { kind: "condition"; index: number }
  | { kind: "action"; index: number; lane?: "yes" | "else" }
  | { kind: "label-action"; index: number; label: string }
  | null

function dashedEdge(
  id: string,
  source: string,
  target: string,
  type?: Edge["type"],
  label?: string,
  sourceHandle?: string
): Edge {
  return {
    id,
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
    ...(type ? { type } : {}),
    ...(label
      ? {
          label,
          labelStyle: { fill: "#667085", fontSize: 11, fontWeight: 600 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
        }
      : {}),
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE, width: 14, height: 10 },
    style: { stroke: EDGE, strokeWidth: 1.5, strokeDasharray: "6 5" },
  }
}

export function triggerEventsForChannel(channel: MessagingTemplateFlowChannel): VisualTriggerEvent[] {
  if (channel === "instagram") return ["message_received", "message_sent", "comment_received"]
  if (channel === "whatsapp") return ["message_received", "message_sent", "template_sent"]
  return ["message_received", "message_sent"]
}

const BRANCH_Y = 200
const OUTCOME_ROW = 168

/** Later rules start one step right of the previous rule's last condition and one row down. */
export function visualBranchOffset(rules: VisualRule[], ruleIndex: number): { x: number; y: number } {
  let priorConditions = 0
  let y = 0
  for (let i = 0; i < ruleIndex; i++) {
    const rule = rules[i]
    priorConditions += rule?.conditions.length ?? 0
    const lanes = rule ? extraActionLanes(rule).length : 0
    y += BRANCH_Y + lanes * OUTCOME_ROW
  }
  return { x: STEP_X * priorConditions, y }
}

/** Lays every rule out as an else-branch under the previous condition, like a forked flow. */
export function buildBranchedNodesAndEdges(
  rules: VisualRule[],
  t: FlowTranslate,
  opts: {
    selected: TemplateFlowSelection
    activeRuleIndex: number
    agentName: (id: string) => string | undefined
    columnTitle: (columnId: string) => string | undefined
    channel?: MessagingTemplateFlowChannel
    triggerEvent?: VisualTriggerEvent
  }
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  rules.forEach((rule, ruleIndex) => {
    const piece = buildNodesAndEdgesFromRule(rule, t, {
      ...opts,
      selected: opts.selected && ruleIndex === opts.activeRuleIndex ? opts.selected : null,
    })
    const { x: dx, y: dy } = visualBranchOffset(rules, ruleIndex)
    for (const node of piece.nodes) {
      if (ruleIndex > 0 && node.type === "waWhen") continue
      nodes.push({
        ...node,
        position: { x: node.position.x + dx, y: node.position.y + dy },
      })
    }
    for (const edge of piece.edges) {
      if (ruleIndex > 0 && edge.source.startsWith("trigger-")) continue
      edges.push(edge)
    }
    if (ruleIndex === 0) return
    const prev = rules[ruleIndex - 1]!
    // A filled Otherwise path finishes this automation, so the next rule is not the fall-through.
    if ((prev.elseActions?.length ?? 0) > 0) return
    const source =
      prev.conditions.length > 0 ? `condition-${prev.id}-${prev.conditions.length - 1}` : `trigger-${rules[0]!.id}`
    const target =
      rule.conditions.length > 0
        ? `condition-${rule.id}-0`
        : rule.actions.length > 0
        ? `action-${rule.id}-0`
        : `end-${rule.id}`
    edges.push(dashedEdge(`e-branch-${prev.id}-${rule.id}`, source, target, "smoothstep"))
  })
  return { nodes, edges }
}

export function buildNodesAndEdgesFromRule(
  rule: VisualRule,
  t: FlowTranslate,
  opts: {
    selected: TemplateFlowSelection
    agentName: (id: string) => string | undefined
    columnTitle: (columnId: string) => string | undefined
    channel?: MessagingTemplateFlowChannel
    triggerEvent?: VisualTriggerEvent
  }
): { nodes: Node[]; edges: Edge[] } {
  const channel = opts.channel ?? "whatsapp"
  const triggerEvent = opts.triggerEvent ?? "message_received"
  const nodes: Node[] = []
  const edges: Edge[] = []

  const triggerId = `trigger-${rule.id}`
  nodes.push({
    id: triggerId,
    type: "waWhen",
    position: { x: 32, y: BASE_Y },
    draggable: false,
    selectable: true,
    data: {
      headerLabel: t("whatsappLiteTemplateFlowNodeTriggerHeader"),
      title: t("whatsappLiteTemplateFlowTriggerEvent"),
      subtitle: summarizeTriggerEvent(triggerEvent, t),
      selected: opts.selected?.kind === "trigger",
    },
  })

  let prevId: string = triggerId
  let col = 1
  const matchTitle = yesLaneTitle(rule)

  rule.conditions.forEach((cond, ci) => {
    const insertId = `insert-${rule.id}-${ci}`
    nodes.push({
      id: insertId,
      type: "waInsert",
      position: { x: 32 + STEP_X * col - STEP_X / 2 - 14, y: BASE_Y + 42 },
      draggable: false,
      selectable: false,
      data: { index: ci },
    })
    const id = `condition-${rule.id}-${ci}`
    nodes.push({
      id,
      type: "waCondition",
      position: { x: 32 + STEP_X * col, y: BASE_Y },
      draggable: true,
      selectable: true,
      data: {
        index: ci,
        headerLabel: t("whatsappLiteTemplateFlowNodeConditionHeader", { n: String(ci + 1) }),
        title: `${t("whatsappLiteRuleTemplatesConditionLabel")} ${ci + 1}`,
        subtitle: summarizeWhen(cond, t),
        selected: opts.selected?.kind === "condition" && opts.selected.index === ci,
      },
    })
    edges.push(dashedEdge(`e-${prevId}-${id}`, prevId, id))
    prevId = id
    col += 1
  })

  const forkId = prevId
  const branchOriginX = 32 + STEP_X * col

  rule.actions.forEach((act, i) => {
    const id = `action-${rule.id}-${i}`
    nodes.push({
      id,
      type: "waAction",
      position: { x: 32 + STEP_X * (col + i), y: BASE_Y },
      draggable: true,
      selectable: true,
      data: {
        index: i,
        actionType: act.type,
        isConfigured: isWaActionConfigured(act),
        headerLabel: i === 0 && matchTitle ? matchTitle : t("whatsappLiteTemplateFlowNodeActionHeader", { n: String(i + 1) }),
        title: actionTypeLabel(act.type, t, channel),
        subtitle: summarizeAction(
          act,
          t,
          act.type === "execute_agent" || act.type === "enable_conversation_agent"
            ? opts.agentName(act.agentId ?? "")
            : undefined,
          act.type === "move_linked_card" ||
          act.type === "clone_linked_card" ||
          act.type === "route_to_crm"
            ? opts.columnTitle(act.columnId ?? "")
            : undefined,
          channel
        ),
        selected: opts.selected?.kind === "action" && opts.selected.lane !== "else" && opts.selected.index === i,
      },
    })
    edges.push(
      dashedEdge(
        `e-${prevId}-${id}`,
        prevId,
        id,
        undefined,
        i === 0 ? matchTitle : undefined,
        i === 0 && prevId === forkId ? "yes" : undefined
      )
    )
    prevId = id
  })

  const endId = `end-${rule.id}`
  nodes.push({
    id: endId,
    type: "waEnd",
    position: {
      x: branchOriginX + STEP_X * rule.actions.length + 16,
      y: BASE_Y,
    },
    draggable: false,
    selectable: false,
    data: { title: t("whatsappLiteTemplateFlowEndTitle") },
  })
  edges.push(dashedEdge(`e-${prevId}-${endId}`, prevId, endId))

  appendOutcomeLanes({ nodes, edges, rule, forkId, originX: branchOriginX, t, opts, channel })

  return { nodes, edges }
}

function appendOutcomeLanes(args: {
  nodes: Node[]
  edges: Edge[]
  rule: VisualRule
  forkId: string
  originX: number
  t: FlowTranslate
  channel: MessagingTemplateFlowChannel
  opts: {
    selected: TemplateFlowSelection
    agentName: (id: string) => string | undefined
    columnTitle: (columnId: string) => string | undefined
  }
}) {
  const { nodes, edges, rule, forkId, originX, t, opts, channel } = args
  const lanes = extraActionLanes(rule)
  lanes.forEach((lane, laneIndex) => {
    const y = BASE_Y + OUTCOME_ROW * (laneIndex + 1)
    const title = outcomeLaneTitle(lane, t)
    let cursor = forkId
    lane.actions.forEach((act, i) => {
      const id = outcomeActionId(rule.id, lane, laneIndex, i)
      nodes.push({
        id,
        type: "waAction",
        position: { x: originX + STEP_X * i, y },
        draggable: true,
        selectable: true,
        data: {
          index: i,
          laneKind: lane.kind,
          laneIndex,
          label: lane.kind === "label" ? lane.label : undefined,
          actionType: act.type,
          isConfigured: isWaActionConfigured(act),
          headerLabel: i === 0 ? title : t("whatsappLiteTemplateFlowNodeActionHeader", { n: String(i + 1) }),
          title: actionTypeLabel(act.type, t, channel),
          subtitle: summarizeAction(
            act,
            t,
            act.type === "execute_agent" || act.type === "enable_conversation_agent"
              ? opts.agentName(act.agentId ?? "")
              : undefined,
            act.type === "move_linked_card" || act.type === "clone_linked_card" || act.type === "route_to_crm"
              ? opts.columnTitle(act.columnId ?? "")
              : undefined,
            channel
          ),
          selected: outcomeActionSelected(opts.selected, lane, i),
        },
      })
      edges.push(
        dashedEdge(
          `e-${cursor}-${id}`,
          cursor,
          id,
          "smoothstep",
          cursor === forkId ? title : undefined,
          cursor === forkId ? "branch" : undefined
        )
      )
      cursor = id
    })
    const endId = lane.kind === "else" ? `end-else-${rule.id}` : `end-label-${rule.id}-${laneIndex}`
    nodes.push({
      id: endId,
      type: "waEnd",
      position: {
        x: originX + STEP_X * lane.actions.length + (lane.actions.length > 0 ? 16 : 0),
        y,
      },
      draggable: false,
      selectable: false,
      data: {
        title,
        compact: true,
        branchLabel: title,
        laneKind: lane.kind,
        laneIndex,
        label: lane.kind === "label" ? lane.label : undefined,
      },
    })
    edges.push(
      dashedEdge(
        `e-${cursor}-${endId}`,
        cursor,
        endId,
        "smoothstep",
        lane.actions.length === 0 ? title : undefined,
        cursor === forkId ? "branch" : undefined
      )
    )
  })
}

function outcomeLaneTitle(lane: ExtraActionLane, t: FlowTranslate): string {
  if (lane.kind === "label") return lane.label
  return t("whatsappLiteTemplateFlowOtherwise")
}

function outcomeActionId(ruleId: string, lane: ExtraActionLane, laneIndex: number, index: number): string {
  if (lane.kind === "else") return `else-action-${ruleId}-${index}`
  return `label-action-${ruleId}-${laneIndex}-${index}`
}

function outcomeActionSelected(selected: TemplateFlowSelection, lane: ExtraActionLane, index: number): boolean {
  if (lane.kind === "else") return selected?.kind === "action" && selected.lane === "else" && selected.index === index
  return selected?.kind === "label-action" && selected.label === lane.label && selected.index === index
}

export function parseTriggerNodeId(nodeId: string, ruleId: string): boolean {
  return nodeId === `trigger-${ruleId}`
}

/** Extrai índice da condição a partir do id do nó `condition-{ruleId}-{i}`. */
export function parseConditionNodeIndex(nodeId: string, ruleId: string): number | null {
  const prefix = `condition-${ruleId}-`
  if (!nodeId.startsWith(prefix)) return null
  const n = Number.parseInt(nodeId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

export function parseInsertNodeIndex(nodeId: string, ruleId: string): number | null {
  const prefix = `insert-${ruleId}-`
  if (!nodeId.startsWith(prefix)) return null
  const n = Number.parseInt(nodeId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

/** Extrai índice da acção a partir do id do nó `action-{ruleId}-{i}`. */
export function parseActionNodeIndex(nodeId: string, ruleId: string): number | null {
  const prefix = `action-${ruleId}-`
  if (!nodeId.startsWith(prefix)) return null
  const n = Number.parseInt(nodeId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

export function parseElseActionIndex(nodeId: string, ruleId: string): number | null {
  const prefix = `else-action-${ruleId}-`
  if (!nodeId.startsWith(prefix)) return null
  const n = Number.parseInt(nodeId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

export function parseLabelActionNode(nodeId: string, ruleId: string): { laneIndex: number; index: number } | null {
  const prefix = `label-action-${ruleId}-`
  if (!nodeId.startsWith(prefix)) return null
  const rest = nodeId.slice(prefix.length)
  const dash = rest.indexOf("-")
  if (dash < 0) return null
  const laneIndex = Number.parseInt(rest.slice(0, dash), 10)
  const index = Number.parseInt(rest.slice(dash + 1), 10)
  if (!Number.isFinite(laneIndex) || !Number.isFinite(index)) return null
  return { laneIndex, index }
}

export function ruleOwnsFlowNode(nodeId: string, ruleId: string): boolean {
  return (
    parseTriggerNodeId(nodeId, ruleId) ||
    parseConditionNodeIndex(nodeId, ruleId) != null ||
    parseActionNodeIndex(nodeId, ruleId) != null ||
    parseElseActionIndex(nodeId, ruleId) != null ||
    parseLabelActionNode(nodeId, ruleId) != null ||
    parseInsertNodeIndex(nodeId, ruleId) != null ||
    nodeId === `end-${ruleId}` ||
    nodeId === `end-else-${ruleId}` ||
    nodeId.startsWith(`end-label-${ruleId}-`)
  )
}
