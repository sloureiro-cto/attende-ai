import { createBotNode, newBotId, nodeOutputs, pruneDanglingEdges, SALES_BOT_LIMITS, sanitizeNodePreset } from "./botGraph"
import type {
  AutomationChannelBinding,
  AdvancedAutomationDetail,
  AdvancedAutomationEdge,
  AdvancedAutomationNode,
  AdvancedAutomationNodeKind,
  AdvancedAutomationStatus,
  AdvancedAutomationTrigger,
  SaveAdvancedAutomationInput,
} from "./types"

/** Everything the builder edits. `id` is absent until the first save. */
export type BotDraft = {
  id?: string
  name: string
  status: AdvancedAutomationStatus
  channels: AutomationChannelBinding[]
  trigger: AdvancedAutomationTrigger
  stopOnHumanReply: boolean
  /** "" while nothing is connected to the start pill. */
  startNodeId: string
  nodes: AdvancedAutomationNode[]
  edges: AdvancedAutomationEdge[]
}

type BotBuilderState = {
  draft: BotDraft
  selectedId: string | null
  dirty: boolean
}

export type BotBuilderAction =
  | { type: "meta"; patch: Partial<Pick<BotDraft, "name" | "status" | "channels" | "trigger" | "stopOnHumanReply">> }
  | { type: "add"; kind: AdvancedAutomationNodeKind; x: number; y: number; preset?: Record<string, unknown> }
  | { type: "patch"; id: string; patch: Record<string, unknown> }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "remove"; id: string }
  | { type: "duplicate"; id: string }
  | { type: "connect"; from: string; output: string; to: string }
  | { type: "disconnect"; edgeId: string }
  | { type: "setStart"; id: string }
  | { type: "select"; id: string | null }
  | { type: "layout"; positions: Record<string, { x: number; y: number }> }
  | { type: "saved"; sent: BotDraft; id: string; status: BotDraft["status"] }

export const START_NODE_ID = "__start__"

export function emptyDraft(over: Partial<BotDraft> = {}): BotDraft {
  return {
    name: "",
    status: "draft",
    channels: [],
    trigger: { kind: "new_conversation", dedupeDays: 7 },
    stopOnHumanReply: true,
    startNodeId: "",
    nodes: [],
    edges: [],
    ...over,
  }
}

export function draftFromDetail(d: AdvancedAutomationDetail): BotDraft {
  return {
    id: d.id,
    name: d.name,
    status: d.status,
    channels: d.channels,
    trigger: d.trigger,
    stopOnHumanReply: d.stopOnHumanReply,
    startNodeId: d.startNodeId,
    nodes: d.nodes,
    edges: d.edges,
  }
}

export function initialBuilderState(draft: BotDraft): BotBuilderState {
  return { draft, selectedId: null, dirty: false }
}

export function draftToInput(draft: BotDraft): SaveAdvancedAutomationInput {
  return {
    name: draft.name.trim(),
    status: draft.status,
    channels: draft.channels,
    trigger: draft.trigger,
    stopOnHumanReply: draft.stopOnHumanReply,
    startNodeId: draft.startNodeId,
    nodes: draft.nodes,
    edges: draft.edges,
  }
}

function touch(state: BotBuilderState, draft: BotDraft, selectedId = state.selectedId): BotBuilderState {
  return { draft, selectedId, dirty: true }
}

function withPrunedEdges(draft: BotDraft): BotDraft {
  const edges = pruneDanglingEdges(draft.nodes, draft.edges)
  const startNodeId = draft.nodes.some((n) => n.id === draft.startNodeId) ? draft.startNodeId : ""
  return edges.length === draft.edges.length && startNodeId === draft.startNodeId
    ? draft
    : { ...draft, edges, startNodeId }
}

export function botBuilderReducer(state: BotBuilderState, action: BotBuilderAction): BotBuilderState {
  const { draft } = state
  switch (action.type) {
    case "meta":
      return touch(state, { ...draft, ...action.patch })

    case "add": {
      if (draft.nodes.length >= SALES_BOT_LIMITS.nodes) return state
      const node = { ...createBotNode(action.kind, action.x, action.y), ...sanitizeNodePreset(action.kind, action.preset) } as AdvancedAutomationNode
      const first = draft.nodes.length === 0
      return touch(
        state,
        {
          ...draft,
          nodes: [...draft.nodes, node],
          startNodeId: first && !draft.startNodeId ? node.id : draft.startNodeId,
        },
        node.id
      )
    }

    case "patch": {
      let changed = false
      const nodes = draft.nodes.map((n) => {
        if (n.id !== action.id) return n
        changed = true
        return { ...n, ...action.patch } as AdvancedAutomationNode
      })
      if (!changed) return state
      return touch(state, withPrunedEdges({ ...draft, nodes }))
    }

    case "move": {
      const nodes = draft.nodes.map((n) => (n.id === action.id ? { ...n, x: action.x, y: action.y } : n))
      return touch(state, { ...draft, nodes })
    }

    case "remove": {
      if (!draft.nodes.some((n) => n.id === action.id)) return state
      const nodes = draft.nodes.filter((n) => n.id !== action.id)
      const edges = draft.edges.filter((e) => e.from !== action.id && e.to !== action.id)
      return touch(
        state,
        { ...draft, nodes, edges, startNodeId: draft.startNodeId === action.id ? "" : draft.startNodeId },
        state.selectedId === action.id ? null : state.selectedId
      )
    }

    case "duplicate": {
      const src = draft.nodes.find((n) => n.id === action.id)
      if (!src || draft.nodes.length >= SALES_BOT_LIMITS.nodes) return state
      const copy = {
        ...structuredCloneNode(src),
        id: newBotId(src.kind.slice(0, 6)),
        x: src.x + 40,
        y: src.y + 60,
      } as AdvancedAutomationNode
      return touch(state, { ...draft, nodes: [...draft.nodes, copy] }, copy.id)
    }

    case "connect": {
      const from = draft.nodes.find((n) => n.id === action.from)
      if (!from || !draft.nodes.some((n) => n.id === action.to)) return state
      if (!nodeOutputs(from).includes(action.output)) return state
      // One target per exit: connecting again replaces the previous link.
      const edges = draft.edges.filter((e) => !(e.from === action.from && e.output === action.output))
      edges.push({ id: newBotId("e"), from: action.from, output: action.output, to: action.to })
      return touch(state, { ...draft, edges })
    }

    case "disconnect":
      return touch(state, { ...draft, edges: draft.edges.filter((e) => e.id !== action.edgeId) })

    case "setStart":
      if (action.id && !draft.nodes.some((n) => n.id === action.id)) return state
      return touch(state, { ...draft, startNodeId: action.id })

    case "select":
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id }

    case "layout": {
      const nodes = draft.nodes.map((n) => {
        const p = action.positions[n.id]
        return p ? { ...n, x: p.x, y: p.y } : n
      })
      return touch(state, { ...draft, nodes })
    }

    case "saved": {
      // Edits made while the request was in flight stay (and stay "unsaved"): only the server's id/status merge in.
      const untouched = state.draft === action.sent
      return {
        draft: { ...state.draft, id: action.id, status: action.status },
        selectedId: state.selectedId,
        dirty: !untouched,
      }
    }
  }
}

function structuredCloneNode(n: AdvancedAutomationNode): AdvancedAutomationNode {
  return JSON.parse(JSON.stringify(n)) as AdvancedAutomationNode
}

// --- layout ----------------------------------------------------------------------------------

const COL_W = 340
const ROW_GAP = 36
const ORIGIN_X = 320
const ORIGIN_Y = 80

/** Estimated card height (matches the node card: header + body + one row per exit). */
function estimateNodeHeight(node: AdvancedAutomationNode): number {
  return 96 + nodeOutputs(node).length * 32
}

/**
 * Left-to-right layered layout from the start step: depth = shortest path, order inside a layer
 * follows discovery order. Steps nobody reaches go in a final column.
 */
export function autoLayoutPositions(
  startNodeId: string,
  nodes: AdvancedAutomationNode[],
  edges: AdvancedAutomationEdge[]
): Record<string, { x: number; y: number }> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const depth = new Map<string, number>()
  const order: string[] = []
  const out = new Map<string, string[]>()
  for (const e of edges) out.set(e.from, [...(out.get(e.from) ?? []), e.to])

  if (byId.has(startNodeId)) {
    depth.set(startNodeId, 0)
    const queue = [startNodeId]
    while (queue.length) {
      const id = queue.shift()!
      order.push(id)
      for (const to of out.get(id) ?? []) {
        if (!depth.has(to) && byId.has(to)) {
          depth.set(to, depth.get(id)! + 1)
          queue.push(to)
        }
      }
    }
  }
  const maxDepth = Math.max(-1, ...depth.values())
  for (const n of nodes) {
    if (!depth.has(n.id)) {
      depth.set(n.id, maxDepth + 1)
      order.push(n.id)
    }
  }

  const layerY = new Map<number, number>()
  const positions: Record<string, { x: number; y: number }> = {}
  for (const id of order) {
    const node = byId.get(id)!
    const d = depth.get(id)!
    const y = layerY.get(d) ?? ORIGIN_Y
    positions[id] = { x: ORIGIN_X + d * COL_W, y }
    layerY.set(d, y + estimateNodeHeight(node) + ROW_GAP)
  }
  return positions
}

/** Start pill position: left of the start step, vertically centered on its header. */
export function startPillPosition(nodes: AdvancedAutomationNode[], startNodeId: string): { x: number; y: number } {
  const target = nodes.find((n) => n.id === startNodeId) ?? nodes[0]
  return target ? { x: target.x - 200, y: target.y + 8 } : { x: 80, y: ORIGIN_Y }
}
