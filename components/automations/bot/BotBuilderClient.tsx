"use client"

import { Edit2 } from "iconsax-react"
import { ArrowLeft, Play, TriangleAlert } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  createAdvancedAutomationAction,
  getAdvancedAutomationAction,
  getAdvancedAutomationStatsAction,
  updateAdvancedAutomationAction,
} from "actions/messaging-automations/advancedAutomations"
import type { IColumn } from "app/_types/Column"
import { showToast } from "app/utils/showToast"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import { useLeaveConfirm } from "components/automations/ui/useLeaveConfirm"
import { useSavableDocument } from "components/automations/ui/useSavableDocument"
import Button from "components/Button/Button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog"
import { Input } from "components/ui/input"
import { Switch } from "components/ui/switch"
import {
  autoLayoutPositions,
  botBuilderReducer,
  type BotDraft,
  draftFromDetail,
  draftToInput,
  emptyDraft,
  initialBuilderState,
  START_NODE_ID,
} from "lib/automations/botBuilderState"
import { nodeIssues, unreachableNodeIds } from "lib/automations/botGraph"
import { stageLabelsByNode, stageRefsOfNodes } from "lib/automations/botStage"
import type { EditorContextData } from "lib/automations/editorContext"
import { type BotTemplateId, buildBotTemplate } from "lib/automations/templates"
import type {
  AutomationChannel,
  AdvancedAutomationDetail,
  AdvancedAutomationIssue,
  AdvancedAutomationNodeKind,
  AdvancedAutomationStatsSummary,
} from "lib/automations/types"
import type { AutomationsTranslationKey } from "lib/i18n/translations/automations"
import { BotCanvas } from "./BotCanvas"
import { BotChannelsPopover } from "./BotChannelsPopover"
import { BotInspector } from "./BotInspector"
import { BotPalette } from "./BotPalette"
import { BotStageLabelsContext } from "./botStageLabels"
import { BotStartInspector } from "./BotStartInspector"
import { useBotLookups } from "./useBotLookups"
import { STUDIO_ROUTES } from "../studioRoutes"

// Opened on demand (the "Preview" button): its code (and the chat UI) stays out of the builder's first load.
const BotPreviewPanel = dynamic(() => import("./BotPreviewPanel").then((m) => m.BotPreviewPanel), { ssr: false })

type Props = {
  /** Saved bot, or null when creating. */
  initial: AdvancedAutomationDetail | null
  context: EditorContextData
  /** Query-string seeds for a new bot (from the "New automation" modal). */
  seed?: { channel?: AutomationChannel; template?: BotTemplateId }
}

function buildInitialDraft(
  initial: AdvancedAutomationDetail | null,
  seed: Props["seed"],
  t: ReturnType<typeof useAutomationsT>["t"]
): BotDraft {
  if (initial) return draftFromDetail(initial)
  const channel = seed?.channel
  const base = emptyDraft({
    channels: channel ? [{ channel, enabledSessionIds: [] }] : [],
  })
  if (seed?.template) {
    const graph = buildBotTemplate(seed.template, {
      name: t("advancedAutomationTplName"),
      welcome: t("advancedAutomationTplWelcome"),
      optionQuote: t("advancedAutomationTplOptionQuote"),
      optionHuman: t("advancedAutomationTplOptionHuman"),
      optionInfo: t("advancedAutomationTplOptionInfo"),
      askDetails: t("advancedAutomationTplAskDetails"),
      thanks: t("advancedAutomationTplThanks"),
      handoff: t("advancedAutomationTplHandoff"),
      info: t("advancedAutomationTplInfo"),
    })
    return { ...base, name: t("advancedAutomationTplName"), ...graph }
  }
  return base
}

export function BotBuilderClient({ initial, context, seed }: Props) {
  const { t } = useAutomationsT()
  const router = useRouter()
  const [state, dispatch] = useReducer(botBuilderReducer, undefined, () =>
    initialBuilderState(buildInitialDraft(initial, seed, t))
  )
  const { draft, selectedId, dirty } = state

  const automationId = draft.id
  const fetchUpdatedAt = useCallback(async () => {
    if (!automationId) return null
    const res = await getAdvancedAutomationAction(automationId)
    return res.success ? res.data.updatedAt : null
  }, [automationId])
  const { saving, conflict, setConflict, save: runSave, overwrite } = useSavableDocument<AdvancedAutomationDetail, { issues?: AdvancedAutomationIssue[] }>({
    initialUpdatedAt: initial?.updatedAt,
    fetchUpdatedAt,
  })
  const [issues, setIssues] = useState<AdvancedAutomationIssue[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  // `?stats=1` (e.g. from the stats page) opens the builder with the stats overlay already on.
  const statsRequested = useSearchParams()?.get("stats") === "1"
  const [showStats, setShowStats] = useState(statsRequested)
  const [stats, setStats] = useState<AdvancedAutomationStatsSummary | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const lookups = useBotLookups(context.workspaceId, draft.id)
  // Name the move-stage cards ("Sales · Won"): columns of the referenced boards load in the background.
  const stageRefs = useMemo(() => stageRefsOfNodes(draft.nodes), [draft.nodes])
  const stageRefsKey = JSON.stringify(stageRefs)
  const { loadProjectColumns } = lookups
  useEffect(() => {
    for (const ref of JSON.parse(stageRefsKey) as typeof stageRefs) loadProjectColumns(ref.projectId, ref.boardId || undefined, context.crmProjects)
  }, [stageRefsKey, loadProjectColumns, context.crmProjects])
  const stageLabelsRaw = useMemo(() => {
    const columns: Record<string, IColumn[]> = {}
    for (const [pid, v] of Object.entries(lookups.projectColumns)) columns[pid] = v.data
    return stageLabelsByNode(draft.nodes, columns, context.crmProjects)
  }, [draft.nodes, lookups.projectColumns, context.crmProjects])
  const stageLabelsKey = JSON.stringify(stageLabelsRaw)
  // Stable identity: cards re-render only when a name actually resolves or changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content on purpose
  const stageLabels = useMemo(() => stageLabelsRaw, [stageLabelsKey])
  const adder = useRef<((kind: AdvancedAutomationNodeKind, preset?: Record<string, unknown>) => void) | null>(null)
  const registerAdder = useCallback((fn: ((kind: AdvancedAutomationNodeKind, preset?: Record<string, unknown>) => void) | null) => {
    adder.current = fn
  }, [])

  // --- derived validation (cheap: linear in steps) ---
  const unreachable = useMemo(
    () => new Set(unreachableNodeIds(draft.startNodeId, draft.nodes, draft.edges)),
    [draft.startNodeId, draft.nodes, draft.edges]
  )
  const problemNodeIds = useMemo(
    () => draft.nodes.filter((n) => nodeIssues(n).length > 0).map((n) => n.id),
    [draft.nodes]
  )
  const blockers = useMemo(() => {
    const list: AutomationsTranslationKey[] = []
    if (!draft.name.trim()) list.push("advancedAutomationBlockName")
    if (draft.channels.length === 0) list.push("advancedAutomationBlockChannels")
    // The backend refuses to activate a bot that runs on no account (unlike rules, there is no "all accounts").
    else if (!draft.channels.some((c) => c.enabledSessionIds.length > 0)) list.push("advancedAutomationBlockAccounts")
    if (draft.nodes.length === 0) list.push("advancedAutomationBlockNoSteps")
    else if (!draft.startNodeId) list.push("advancedAutomationBlockNoStart")
    if (problemNodeIds.length > 0) list.push("advancedAutomationBlockSteps")
    return list
  }, [draft.name, draft.channels, draft.nodes.length, draft.startNodeId, problemNodeIds.length])

  const { confirmLeave, leaveDialog } = useLeaveConfirm({
    dirty,
    title: t("advancedAutomationLeaveConfirm"),
    cancelLabel: t("automationsCancel"),
    leaveLabel: t("automationsLeave"),
  })

  // Leaving with unsaved changes: the browser's own prompt (the app has no shared guard for full-page screens).
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const active = draft.status === "active"
  const toggleActive = (next: boolean) => {
    if (next && blockers.length > 0) {
      showToast("error", t("advancedAutomationCannotActivate", { reason: t(blockers[0]!) }))
      return
    }
    dispatch({ type: "meta", patch: { status: next ? "active" : "paused" } })
  }

  const save = async () => {
    if (saving) return
    if (!draft.name.trim()) {
      showToast("error", t("advancedAutomationBlockName"))
      return
    }
    if (draft.status === "active" && blockers.length > 0) {
      showToast("error", t("advancedAutomationCannotActivate", { reason: t(blockers[0]!) }))
      return
    }
    setIssues([])
    const sent = draft
    const input = draftToInput(sent)
    await runSave(
      (expectedUpdatedAt) =>
        sent.id ? updateAdvancedAutomationAction(sent.id, { ...input, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) }) : createAdvancedAutomationAction(input),
      (res) => {
        if (!res.success) {
          if (res.status !== 409) {
            if (res.issues?.length) setIssues(res.issues)
            showToast("error", res.error || t("advancedAutomationSaveError"))
          }
          return
        }
        dispatch({ type: "saved", sent, id: res.data.id, status: res.data.status })
        showToast("success", t("advancedAutomationSaved"))
        if (!sent.id) router.replace(STUDIO_ROUTES.bot(res.data.id))
      }
    )
  }

  const loadStats = useCallback(async () => {
    if (!draft.id) return
    setStatsLoading(true)
    const res = await getAdvancedAutomationStatsAction(draft.id, 30)
    setStatsLoading(false)
    if (res.success) setStats(res.data)
    else showToast("error", t("advancedAutomationStatsError"))
  }, [draft.id, t])

  useEffect(() => {
    if (statsRequested && draft.id) void loadStats()
    // Only once per opened bot: the toggle handles later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsRequested, draft.id])

  const toggleStats = () => {
    const next = !showStats
    setShowStats(next)
    if (next && !stats) void loadStats()
  }

  const autoLayout = () =>
    dispatch({ type: "layout", positions: autoLayoutPositions(draft.startNodeId, draft.nodes, draft.edges) })

  const selectedNode =
    selectedId && selectedId !== START_NODE_ID ? draft.nodes.find((n) => n.id === selectedId) : undefined
  // "Step N" of the header: the start pill is step 1, so steps count from 2 in creation order.
  const selectedStepNumber = selectedNode ? draft.nodes.findIndex((n) => n.id === selectedNode.id) + 2 : 0
  const closeInspector = useCallback(() => dispatch({ type: "select", id: null }), [])
  const channelList = useMemo(() => draft.channels.map((c) => c.channel), [draft.channels])
  const addStep = useCallback(
    (kind: AdvancedAutomationNodeKind, preset?: Record<string, unknown>) => adder.current?.(kind, preset),
    []
  )
  const setChannels = useCallback(
    (channels: BotDraft["channels"]) => dispatch({ type: "meta", patch: { channels } }),
    []
  )

  return (
    <div className="flex h-screen min-h-0 flex-col bg-neutral-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-50 bg-white px-5 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link
            href={STUDIO_ROUTES.hub}
            onClick={confirmLeave}
            aria-label={t("advancedAutomationBack")}
            className="flex size-9 items-center justify-center rounded border border-neutral-50 text-neutral-700 hover:bg-neutral-10"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex min-w-0 flex-col">
            <span className="text-body-12 text-neutral-400">{t("advancedAutomationBreadcrumb")}</span>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">{t("advancedAutomationNameLabel")}</span>
              <Input
                value={draft.name}
                maxLength={80}
                placeholder={t("advancedAutomationNamePlaceholder")}
                onChange={(e) => dispatch({ type: "meta", patch: { name: e.target.value } })}
                className="-ml-1.5 h-8 w-64 border-transparent bg-transparent px-1.5 text-body-16 font-semibold text-neutral-800 hover:border-neutral-50 focus:border-primary"
              />
              <Edit2 size={14} className="text-neutral-200" aria-hidden />
            </label>
          </div>
          <span className="hidden h-8 w-px bg-neutral-50 sm:block" aria-hidden />
          <BotChannelsPopover channels={draft.channels} sessions={context.sessions} onChange={setChannels} />
          {problemNodeIds.length > 0 ? (
            <Button
              type="button"
              size="small"
              variant="warning"
              style="outline"
              startIcon={<TriangleAlert aria-hidden />}
              onClick={() => dispatch({ type: "select", id: problemNodeIds[0]! })}
            >
              {t("advancedAutomationProblems", { count: problemNodeIds.length })}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded border border-neutral-50 bg-white px-3 text-body-13 font-semibold text-neutral-900">
            <Switch size="sm" checked={active} onCheckedChange={toggleActive} aria-label={t("advancedAutomationActiveToggle")} />
            {active
              ? t("advancedAutomationStatusActive")
              : draft.status === "draft"
              ? t("advancedAutomationStatusDraft")
              : t("advancedAutomationStatusPaused")}
          </label>
          <Button
            size="medium"
            variant="secondary"
            style="outline"
            startIcon={<Play className="size-3.5 fill-current" />}
            disabled={!draft.startNodeId}
            onClick={() => {
              dispatch({ type: "select", id: null })
              setPreviewOpen((o) => !o)
            }}
          >
            {t("advancedAutomationPreview")}
          </Button>
          <Link
            href={STUDIO_ROUTES.hub}
            onClick={confirmLeave}
            className="flex h-9 items-center rounded border border-neutral-50 bg-white px-4 text-body-14 font-semibold text-neutral-900 hover:bg-neutral-10"
          >
            {t("advancedAutomationCancel")}
          </Link>
          <Button
            size="medium"
            loading={saving}
            disabled={saving || (!dirty && !!draft.id)}
            onClick={() => void save()}
          >
            {t("advancedAutomationSave")}
          </Button>
        </div>
      </header>

      {issues.length > 0 ? (
        <div
          role="alert"
          className="border-b border-error-lighter bg-error-clean px-5 py-2 text-body-12 text-error-darkest"
        >
          <p className="font-semibold">{t("advancedAutomationServerIssues")}</p>
          <ul className="list-disc pl-5">
            {issues.slice(0, 5).map((i, n) => (
              <li key={`${i.path}-${n}`}>{i.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <BotStageLabelsContext.Provider value={stageLabels}>
        <BotCanvas
          draft={draft}
          selectedId={selectedId}
          unreachable={unreachable}
          stats={stats}
          showStats={showStats}
          dispatch={dispatch}
          registerAdder={registerAdder}
          onAutoLayout={autoLayout}
          onToggleStats={toggleStats}
          statsLoading={statsLoading}
          rightPanelOpen={previewOpen || selectedId !== null}
        />
        </BotStageLabelsContext.Provider>
        <BotPalette onAdd={addStep} />
        {draft.nodes.length === 0 ? <EmptyHint onAddFirst={() => addStep("send_message")} t={t} /> : null}
        {previewOpen ? (
          <BotPreviewPanel draft={draft} onClose={() => setPreviewOpen(false)} />
        ) : selectedId === START_NODE_ID ? (
          <BotStartInspector draft={draft} dispatch={dispatch} onClose={closeInspector} />
        ) : selectedNode ? (
          <BotInspector
            node={selectedNode}
            stepNumber={selectedStepNumber}
            channels={channelList}
            ctx={context}
            lookups={lookups}
            dispatch={dispatch}
            onClose={closeInspector}
          />
        ) : null}
      </div>

      <AlertDialog open={conflict} onOpenChange={setConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("advancedAutomationConflictTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("advancedAutomationConflictBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => window.location.reload()}>{t("advancedAutomationConflictReload")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void overwrite()}>{t("automationsConflictOverwrite")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {leaveDialog}
    </div>
  )
}

function EmptyHint({ onAddFirst, t }: { onAddFirst: () => void; t: ReturnType<typeof useAutomationsT>["t"] }) {
  return (
    <div className={cn("pointer-events-none absolute inset-y-0 left-[248px] right-0 z-10 flex items-center justify-center")}>
      <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-2 rounded-lg border border-neutral-50 bg-white p-6 text-center shadow-md">
        <p className="text-body-14 font-semibold text-neutral-900">{t("advancedAutomationEmptyTitle")}</p>
        <p className="text-body-12 text-neutral-500">{t("advancedAutomationEmptyHint")}</p>
        <Button size="small" onClick={onAddFirst}>
          {t("advancedAutomationEmptyAction")}
        </Button>
      </div>
    </div>
  )
}
