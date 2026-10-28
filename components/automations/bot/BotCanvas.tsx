"use client"

import { ChartNoAxesColumn, LayoutGrid, Maximize, Minus, Plus } from "lucide-react"
import { type Dispatch, type DragEvent, useCallback, useEffect, useMemo, useRef } from "react"
import {
  Background,
  type Connection,
  type Edge,
  type EdgeChange,
  MarkerType,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useStore,
} from "reactflow"
import { cn } from "@/lib/utils"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import IconButton from "components/IconButton/IconButton"
import { type BotBuilderAction, type BotDraft, START_NODE_ID, startPillPosition } from "lib/automations/botBuilderState"
import { nodeIssues, nodeOutputs } from "lib/automations/botGraph"
import type { AdvancedAutomationNode, AdvancedAutomationNodeKind, AdvancedAutomationStatsSummary } from "lib/automations/types"
import { NODE_TYPES, type StartNodeData, type StepNodeData } from "./BotNodes"
import { UNAVAILABLE_KINDS } from "./botNodeMeta"
import { PALETTE_DRAG_TYPE, PALETTE_PRESET_DRAG_TYPE } from "./BotPalette"

import "reactflow/dist/style.css"

const START_EDGE_ID = "e-start"
const EDGE_STYLE = { stroke: "#bbb9c7", strokeWidth: 2 } as const
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: "#bbb9c7", width: 16, height: 16 } as const

type Props = {
  draft: BotDraft
  selectedId: string | null
  unreachable: ReadonlySet<string>
  stats: AdvancedAutomationStatsSummary | null
  showStats: boolean
  dispatch: Dispatch<BotBuilderAction>
  /** Registers a function that adds a step at the visible center (used by the palette click). */
  registerAdder: (add: ((kind: AdvancedAutomationNodeKind, preset?: Record<string, unknown>) => void) | null) => void
  onAutoLayout: () => void
  onToggleStats: () => void
  statsLoading: boolean
  /** A floating panel (inspector / preview) covers the right edge: the minimap steps aside. */
  rightPanelOpen: boolean
}

function ZoomLabel() {
  const zoom = useStore((s) => Math.round(s.transform[2] * 100))
  return <span className="flex min-w-10 items-center justify-center text-body-12 font-semibold text-neutral-500">{zoom}%</span>
}

function CanvasInner({
  draft,
  selectedId,
  unreachable,
  stats,
  showStats,
  dispatch,
  registerAdder,
  onAutoLayout,
  onToggleStats,
  statsLoading,
  rightPanelOpen,
}: Props) {
  const { t } = useAutomationsT()
  const flow = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Domain -> ReactFlow nodes. Unchanged steps keep their object so memoized cards don't re-render
  // while another step is being edited.
  const startCaption = useMemo(() => {
    const kind = t(draft.trigger.kind === "manual" ? "advancedAutomationTriggerManual" : "advancedAutomationTriggerNewConversation")
    return showStats && stats
      ? `${kind}\n${t("advancedAutomationStatsStarted", { count: stats.started })} · ${t("advancedAutomationStatsRange")}`
      : kind
  }, [draft.trigger.kind, showStats, stats, t])

  const incoming = useMemo(() => {
    const set = new Set<string>(draft.edges.map((e) => e.to))
    if (draft.startNodeId) set.add(draft.startNodeId)
    return set
  }, [draft.edges, draft.startNodeId])

  const cache = useRef(new Map<string, { src: AdvancedAutomationNode; deps: string; node: Node<StepNodeData> }>())
  const derived = useMemo<Node[]>(() => {
    const next = new Map<string, { src: AdvancedAutomationNode; deps: string; node: Node<StepNodeData> }>()
    const out: Node[] = []
    for (const n of draft.nodes) {
      const stat = stats?.nodes[n.id]
      const issues = nodeIssues(n).length
      const unreach = unreachable.has(n.id)
      const isSelected = selectedId === n.id
      const hasIncoming = incoming.has(n.id)
      const deps = `${issues}|${hasIncoming ? 1 : 0}|${unreach ? 1 : 0}|${isSelected ? 1 : 0}|${showStats ? 1 : 0}|${
        stat ? JSON.stringify(stat) : ""
      }|${draft.startNodeId === n.id ? 1 : 0}`
      const hit = cache.current.get(n.id)
      if (hit && hit.src === n && hit.deps === deps) {
        next.set(n.id, hit)
        out.push(hit.node)
        continue
      }
      const node: Node<StepNodeData> = {
        id: n.id,
        type: "step",
        position: { x: n.x, y: n.y },
        selected: isSelected,
        data: { node: n, issues, unreachable: unreach, isStart: draft.startNodeId === n.id, stat, showStats, hasIncoming },
      }
      next.set(n.id, { src: n, deps, node })
      out.push(node)
    }
    cache.current = next
    const startNode: Node<StartNodeData> = {
      id: START_NODE_ID,
      type: "start",
      position: startPillPosition(draft.nodes, draft.startNodeId),
      draggable: false,
      deletable: false,
      selected: selectedId === START_NODE_ID,
      data: { selected: selectedId === START_NODE_ID, caption: startCaption },
    }
    return [startNode, ...out]
  }, [draft.nodes, draft.startNodeId, selectedId, showStats, stats, unreachable, incoming, startCaption])

  const [rfNodes, setRfNodes, onNodesChangeBase] = useNodesState<Node["data"]>([])
  // Keep ReactFlow's measured size / in-flight drag position when the domain re-derives.
  useEffect(() => {
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]))
      return derived.map((d) => {
        const p = prevById.get(d.id)
        if (!p) return d
        if (
          p.data === d.data &&
          p.position.x === d.position.x &&
          p.position.y === d.position.y &&
          p.selected === d.selected
        )
          return p
        return { ...d, width: p.width, height: p.height }
      })
    })
  }, [derived, setRfNodes])

  const edges = useMemo<Edge[]>(() => {
    const list: Edge[] = draft.edges.map((e) => ({
      id: e.id,
      source: e.from,
      sourceHandle: e.output,
      target: e.to,
      targetHandle: "in",
      type: "smoothstep",
      style: EDGE_STYLE,
      markerEnd: EDGE_MARKER,
    }))
    if (draft.startNodeId) {
      list.push({
        id: START_EDGE_ID,
        source: START_NODE_ID,
        sourceHandle: "start",
        target: draft.startNodeId,
        targetHandle: "in",
        type: "smoothstep",
        style: { ...EDGE_STYLE, stroke: "#29684c" },
        markerEnd: { ...EDGE_MARKER, color: "#29684c" },
      })
    }
    return list
  }, [draft.edges, draft.startNodeId])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes)
      for (const c of changes) {
        if (c.type === "remove" && c.id !== START_NODE_ID) {
          dispatch({ type: "remove", id: c.id })
        }
      }
    },
    [dispatch, onNodesChangeBase]
  )

  // The drag-end change carries no position in ReactFlow 11, so persist from the drag-stop events.
  const onDragStop = useCallback(
    (_: unknown, moved: Node | Node[]) => {
      for (const n of Array.isArray(moved) ? moved : [moved]) {
        if (n.id !== START_NODE_ID)
          dispatch({ type: "move", id: n.id, x: Math.round(n.position.x), y: Math.round(n.position.y) })
      }
    },
    [dispatch]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const c of changes) {
        if (c.type !== "remove") continue
        if (c.id === START_EDGE_ID) dispatch({ type: "setStart", id: "" })
        else dispatch({ type: "disconnect", edgeId: c.id })
      }
    },
    [dispatch]
  )

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.target === START_NODE_ID) return
      if (c.source === START_NODE_ID) dispatch({ type: "setStart", id: c.target })
      else if (c.sourceHandle) dispatch({ type: "connect", from: c.source, output: c.sourceHandle, to: c.target })
    },
    [dispatch]
  )

  const isValidConnection = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.target === START_NODE_ID) return false
      if (c.source === START_NODE_ID) return true
      const from = draft.nodes.find((n) => n.id === c.source)
      return !!from && !!c.sourceHandle && nodeOutputs(from).includes(c.sourceHandle)
    },
    [draft.nodes]
  )

  const addAtCenter = useCallback(
    (kind: AdvancedAutomationNodeKind, preset?: Record<string, unknown>) => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      const center = rect
        ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        : { x: 400, y: 200 }
      // Stagger so repeated clicks don't stack steps exactly on top of each other.
      const jitter = (draft.nodes.length % 5) * 24
      dispatch({
        type: "add",
        kind,
        preset,
        x: Math.round(center.x - 130 + jitter),
        y: Math.round(center.y - 60 + jitter),
      })
    },
    [dispatch, draft.nodes.length, flow]
  )

  useEffect(() => {
    registerAdder(addAtCenter)
    return () => registerAdder(null)
  }, [addAtCenter, registerAdder])

  const onDrop = useCallback(
    (e: DragEvent) => {
      const kind = e.dataTransfer.getData(PALETTE_DRAG_TYPE) as AdvancedAutomationNodeKind
      if (!kind || UNAVAILABLE_KINDS.has(kind)) return
      e.preventDefault()
      const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      let preset: Record<string, unknown> | undefined
      try {
        const raw = e.dataTransfer.getData(PALETTE_PRESET_DRAG_TYPE)
        preset = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined
      } catch {
        preset = undefined
      }
      dispatch({ type: "add", kind, preset, x: Math.round(p.x - 130), y: Math.round(p.y - 24) })
    },
    [dispatch, flow]
  )

  return (
    <div ref={wrapperRef} className="absolute inset-0" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onDragStop}
        onSelectionDragStop={onDragStop}
        isValidConnection={isValidConnection}
        onNodeClick={(_, n) => dispatch({ type: "select", id: n.id })}
        onPaneClick={() => dispatch({ type: "select", id: null })}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.5}
        snapToGrid
        snapGrid={[10, 10]}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
        className="!bg-neutral-10"
      >
        <Background gap={18} size={1} color="#dfe1e7" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={0}
          aria-label={t("advancedAutomationMinimap")}
          style={{ width: 180, height: 110, right: rightPanelOpen ? 372 : 16, bottom: 16, margin: 0 }}
          className="!rounded-md !border !border-neutral-border !bg-white"
          maskStrokeColor="#45ad7e"
          maskStrokeWidth={1.5}
          nodeColor={(n) => (n.type === "start" ? "#45ad7e" : "#c7e6d8")}
        />
      </ReactFlow>

      <div className="absolute left-[264px] top-4 z-10 flex items-center gap-0.5 rounded-md border border-neutral-border bg-white p-[3px] shadow-lg">
        <ToolbarButton
          label={t("advancedAutomationFit")}
          onClick={() => void flow.fitView({ padding: 0.25, maxZoom: 1, duration: 200 })}
        >
          <Maximize className="size-[15px]" />
        </ToolbarButton>
        <ToolbarButton label={t("advancedAutomationZoomOut")} onClick={() => void flow.zoomOut({ duration: 150 })}>
          <Minus className="size-[15px]" />
        </ToolbarButton>
        <ZoomLabel />
        <ToolbarButton label={t("advancedAutomationZoomIn")} onClick={() => void flow.zoomIn({ duration: 150 })}>
          <Plus className="size-[15px]" />
        </ToolbarButton>
        <span className="mx-0.5 h-5 w-px bg-neutral-50" aria-hidden />
        <ToolbarButton label={t("advancedAutomationAutoLayout")} onClick={onAutoLayout}>
          <LayoutGrid className="size-[15px]" />
        </ToolbarButton>
        <button
          type="button"
          aria-pressed={showStats}
          aria-label={t("advancedAutomationStats")}
          disabled={statsLoading || !draft.id}
          title={draft.id ? undefined : t("advancedAutomationStatsNeedsSave")}
          onClick={onToggleStats}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded px-2.5 text-body-12 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
            showStats ? "bg-primary-clean text-primary-dark" : "text-neutral-500 hover:bg-neutral-10"
          )}
        >
          <ChartNoAxesColumn className="size-[15px]" aria-hidden />
          {t("advancedAutomationStats")}
        </button>
      </div>

      {showStats && stats ? (
        <div className="absolute bottom-4 left-[264px] z-10 flex flex-wrap items-center gap-3 rounded-full border border-neutral-border bg-white px-3.5 py-2 text-body-12 text-neutral-600">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            {t("advancedAutomationStatsRange")}
          </span>
          <span className="text-neutral-400">{t("advancedAutomationStatsStarted", { count: stats.started })}</span>
          <span className="text-neutral-400">{t("advancedAutomationStatsCompleted", { count: stats.completed })}</span>
          {stats.failed > 0 ? (
            <span className="text-error">{t("advancedAutomationStatsFailed", { count: stats.failed })}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <IconButton type="button" size="medium" variant="ghost" aria-label={label} title={label} onClick={onClick} icon={children} />
  )
}

export function BotCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
