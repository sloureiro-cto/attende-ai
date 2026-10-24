"use client"

import { AlertTriangle, Play, Square } from "lucide-react"
import { memo, useContext, useEffect } from "react"
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from "reactflow"
import { cn } from "@/lib/utils"
import { type AutomationsTFn, useAutomationsT } from "components/automations/ui/useAutomationsT"
import { exitDisplayName, FIXED_EXIT_LABEL_KEYS, nodeOutputs } from "lib/automations/botGraph"
import type { AdvancedAutomationNode } from "lib/automations/types"
import { minutesParts, NODE_META, TONE_CHIP } from "./botNodeMeta"
import { BotStageLabelsContext } from "./botStageLabels"

type NodeStat = { reached: number; reachedPct: number; exits: Record<string, number> }

export type StepNodeData = {
  node: AdvancedAutomationNode
  issues: number
  unreachable: boolean
  isStart: boolean
  stat?: NodeStat
  showStats: boolean
  /** Something (another step or the start pill) leads here. */
  hasIncoming: boolean
}

const HANDLE_CLASS = "!size-2.5 !border-2 !bg-white"

function summarize(node: AdvancedAutomationNode, t: AutomationsTFn, stageLabel?: string): string {
  switch (node.kind) {
    case "send_message":
      return node.text.trim() || t("advancedAutomationSummaryNoText")
    case "send_meta_template":
      return node.templateId ? t("advancedAutomationSummaryTemplateSet") : t("advancedAutomationSummaryNotSet")
    case "condition":
      return t("advancedAutomationSummaryRules", { count: node.rows.length })
    case "split":
      return node.paths.map((p) => `${p.name} ${p.percent}%`).join(" · ")
    case "wait": {
      const { value, unit } = minutesParts(node.minutes)
      return `${value} ${t(
        unit === "days" ? "advancedAutomationUnitDays" : unit === "hours" ? "advancedAutomationUnitHours" : "advancedAutomationUnitMinutes"
      )}`
    }
    case "ai_agent":
      return node.instruction.trim() || t("advancedAutomationSummaryNotSet")
    case "goto_automation":
      return node.automationId ? t("advancedAutomationSummaryBotSet") : t("advancedAutomationSummaryNotSet")
    case "set_field":
      return node.fieldId ? node.value || t("advancedAutomationSummaryEmptyValue") : t("advancedAutomationSummaryNotSet")
    case "move_stage":
      return node.columnId ? stageLabel || t("advancedAutomationSummaryStageSet") : t("advancedAutomationSummaryNotSet")
    case "add_label":
      return node.labelText.trim() || t("advancedAutomationSummaryNotSet")
    case "create_task":
      return node.title.trim() || t("advancedAutomationSummaryNotSet")
    case "webhook":
      return node.url.trim() || t("advancedAutomationSummaryNotSet")
    case "handoff":
      return t(`advancedAutomationAssign_${node.assignMode ?? "all_crm_members"}`)
    case "stop":
      return ""
  }
}

function exitTone(exitId: string): "timeout" | "fail" | "other" | "choice" {
  if (exitId === "no_reply") return "timeout"
  if (exitId === "send_failed" || exitId === "not_understood") return "fail"
  if (exitId === "other" || exitId === "none" || exitId === "else") return "other"
  return "choice"
}

const PORT_BORDER = {
  timeout: "!border-warning",
  fail: "!border-error",
  other: "!border-neutral-100",
  choice: "!border-primary",
} as const

/** Target port: filled when something reaches the step, hollow when it is an orphan (as in the design). */
const inPortClass = (connected: boolean) =>
  cn(HANDLE_CLASS, connected ? "!border-primary !bg-primary" : "!border-neutral-100")

const CARD_SHADOW = "shadow-[0_16px_40px_-8px_rgba(29,29,38,0.08)]"

const StepNodeImpl = ({ data, selected }: NodeProps<StepNodeData>) => {
  const { t } = useAutomationsT()
  const { node, issues, unreachable, stat, showStats, hasIncoming } = data
  const stageLabel = useContext(BotStageLabelsContext)[node.id]
  const meta = NODE_META[node.kind]
  const Icon = meta.icon
  const exits = nodeOutputs(node)
  const exitKey = exits.join("|")
  const updateInternals = useUpdateNodeInternals()
  // Exit rows move when options are added or removed: tell ReactFlow to re-measure the handles.
  useEffect(() => {
    updateInternals(node.id)
  }, [exitKey, node.id, updateInternals])

  const title = node.label?.trim() || t(meta.labelKey)
  const ring = selected ? "border-primary ring-[3px] ring-primary-lighter" : "border-neutral-border"

  // "Stop bot" is an end cap, not a card: a pill with only an input port.
  if (node.kind === "stop") {
    return (
      <div
        className={cn(
          "relative flex h-9 w-[110px] items-center justify-center gap-2 rounded-full border bg-white text-body-13 font-semibold text-neutral-600",
          ring,
          unreachable && "opacity-70"
        )}
      >
        <Handle type="target" position={Position.Left} id="in" className={inPortClass(hasIncoming)} style={{ top: 12 }} />
        <Square className="size-[11px] fill-current" aria-hidden />
        {title}
        {showStats && stat ? (
          <span className="absolute -top-2 right-1 rounded-full bg-primary-clean px-1.5 text-body-11 font-semibold text-primary-dark">
            {stat.reached}
          </span>
        ) : null}
      </div>
    )
  }

  const summary = summarize(node, t, stageLabel)
  const isMessage = node.kind === "send_message" || node.kind === "ai_agent" || node.kind === "send_meta_template"
  // A single plain exit sits on the summary row itself (design: "Sales -> Quote" with its port).
  const inlineExit = exits.length === 1 && exitTone(exits[0]!) !== "choice" ? exits[0]! : null
  const bubble = node.kind === "send_message" && !!summary

  const exitRow = (exitId: string, i: number) => {
    const name = exitDisplayName(node, exitId)
    const label = name.fixedKey ? t(FIXED_EXIT_LABEL_KEYS[name.fixedKey]) : name.name?.trim() || exitId
    const tone = exitTone(exitId)
    const count = showStats ? stat?.exits[exitId] : undefined
    return (
      <li
        key={exitId}
        className={cn(
          "relative flex h-8 items-center justify-between gap-2 px-2.5",
          !bubble && i > 0 && "border-t border-dashed border-neutral-50"
        )}
      >
        {tone === "choice" ? (
          <span className="max-w-[170px] truncate rounded border border-primary-lighter bg-white px-2 py-0.5 text-body-12 font-medium text-primary-dark">
            {label}
          </span>
        ) : (
          <span
            className={cn(
              "truncate text-body-12",
              tone === "timeout" && "text-warning-darkest",
              tone === "fail" && "text-error-darkest",
              tone === "other" && "text-neutral-400"
            )}
          >
            {label}
          </span>
        )}
        {count !== undefined ? <span className="text-body-11 text-neutral-400">{count}</span> : null}
        <Handle type="source" position={Position.Right} id={exitId} className={cn(HANDLE_CLASS, PORT_BORDER[tone])} />
      </li>
    )
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-white transition-shadow",
        isMessage || exits.length > 1 ? "w-[250px]" : "w-[210px]",
        CARD_SHADOW,
        ring,
        unreachable && "opacity-70"
      )}
    >
      <Handle type="target" position={Position.Left} id="in" className={inPortClass(hasIncoming)} style={{ top: 18 }} />
      <div className="flex h-9 items-center justify-between gap-2 border-b border-neutral-50 px-2.5">
        <span className="flex min-w-0 items-center gap-2 text-body-12 font-semibold text-neutral-800">
          <span
            className={cn("flex size-[22px] shrink-0 items-center justify-center rounded", TONE_CHIP[meta.tone])}
            aria-hidden
          >
            <Icon className="size-3" />
          </span>
          <span className="truncate">{title}</span>
        </span>
        {issues > 0 ? (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-warning-clean px-1.5 py-0.5 text-body-11 font-semibold text-warning-darkest"
            title={t("advancedAutomationNeedsSetup")}
          >
            <AlertTriangle className="size-3" aria-hidden />
            {t("advancedAutomationNeedsSetup")}
          </span>
        ) : null}
        {showStats && stat ? (
          <span className="shrink-0 rounded-full bg-primary-clean px-1.5 py-0.5 text-body-11 font-semibold text-primary-dark">
            {stat.reached} · {stat.reachedPct}%
          </span>
        ) : null}
      </div>
      <div className="py-2">
        {bubble ? (
          <p className="mx-2.5 line-clamp-3 rounded-lg border border-primary-lighter bg-primary-clean px-2.5 py-2 text-body-12 leading-4 text-primary-darkest">
            {summary}
          </p>
        ) : inlineExit ? (
          <div className="relative flex h-8 items-center justify-between gap-2 px-2.5 text-body-12 text-neutral-600">
            <span className="line-clamp-1">{summary || t("advancedAutomationSummaryNotSet")}</span>
            {showStats && stat?.exits[inlineExit] !== undefined ? (
              <span className="text-body-11 text-neutral-400">{stat.exits[inlineExit]}</span>
            ) : null}
            <Handle
              type="source"
              position={Position.Right}
              id={inlineExit}
              className={cn(HANDLE_CLASS, PORT_BORDER[exitTone(inlineExit)])}
            />
          </div>
        ) : summary ? (
          <p className="line-clamp-2 px-2.5 pb-1 text-body-12 text-neutral-600">{summary}</p>
        ) : null}
        {!inlineExit && exits.length > 0 ? (
          <ul className={cn(bubble && "mt-2")}>{exits.map((id, i) => exitRow(id, i))}</ul>
        ) : null}
        {!bubble && !inlineExit && exits.length === 0 && !summary ? <div className="h-4" /> : null}
      </div>
    </div>
  )
}

export const StepNode = memo(StepNodeImpl)

export type StartNodeData = { selected: boolean; caption: string }

const StartNodeImpl = ({ data }: NodeProps<StartNodeData>) => {
  const { t } = useAutomationsT()
  return (
    <div className="relative">
      <div
        className={cn(
          "relative flex h-9 w-[120px] items-center justify-center gap-2 rounded-full border border-primary-dark bg-primary-dark text-body-13 font-semibold text-white",
          data.selected && "ring-[3px] ring-primary-lighter"
        )}
      >
        <Play className="size-3 fill-current" aria-hidden />
        {t("advancedAutomationStart")}
        <Handle type="source" position={Position.Right} id="start" className={cn(HANDLE_CLASS, "!border-primary")} />
      </div>
      {data.caption ? (
        <p className="absolute left-0 top-10 w-[150px] whitespace-pre-line text-body-11 leading-[1.4] text-neutral-400">
          {data.caption}
        </p>
      ) : null}
    </div>
  )
}

export const StartNode = memo(StartNodeImpl)

export const NODE_TYPES = { step: StepNode, start: StartNode }
