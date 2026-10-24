"use client"

import { Copy, Trash2, X } from "lucide-react"
import { type Dispatch, memo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import Button from "components/Button/Button"
import IconButton from "components/IconButton/IconButton"
import TextInput from "components/TextInput/TextInput"
import type { BotBuilderAction } from "lib/automations/botBuilderState"
import type { EditorContextData } from "lib/automations/editorContext"
import type { AutomationChannel, AdvancedAutomationNode } from "lib/automations/types"
import { NODE_META, TONE_CHIP } from "./botNodeMeta"
import { KindFields } from "./inspector/KindFields"
import type { BotLookups } from "./useBotLookups"

type Props = {
  node: AdvancedAutomationNode
  /** 1-based position shown in the header ("Step 2"); the start pill is step 1. */
  stepNumber: number
  channels: AutomationChannel[]
  ctx: EditorContextData
  lookups: BotLookups
  dispatch: Dispatch<BotBuilderAction>
  onClose: () => void
}

/** Right-hand editor of the selected step. Memoized: only re-renders for its own step. */
export const BotInspector = memo(function BotInspector({ node, stepNumber, channels, ctx, lookups, dispatch, onClose }: Props) {
  const { t } = useAutomationsT()
  const meta = NODE_META[node.kind]
  const Icon = meta.icon
  const patch = useCallback(
    (p: Record<string, unknown>) => dispatch({ type: "patch", id: node.id, patch: p }),
    [dispatch, node.id]
  )

  return (
    <aside
      aria-label={t("advancedAutomationInspectorTitle")}
      className="absolute inset-y-4 right-4 z-20 flex w-[340px] flex-col overflow-hidden rounded-lg border border-neutral-border bg-white shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-neutral-50 p-3">
        <span
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", TONE_CHIP[meta.tone])}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-12 text-neutral-400">
            {node.kind === "stop" ? t("advancedAutomationInspectorEnd") : t("advancedAutomationInspectorStepN", { n: stepNumber })}
          </p>
          <p className="truncate text-body-14 font-semibold text-neutral-800">{t(meta.labelKey)}</p>
        </div>
        <IconButton type="button" size="large" variant="ghost" aria-label={t("advancedAutomationClose")} onClick={onClose} icon={<X />} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <TextInput
            size="small"
            label={t("advancedAutomationFieldStepName")}
            value={node.label ?? ""}
            maxLength={60}
            placeholder={t(meta.labelKey)}
            onChange={(e) => patch({ label: e.target.value || undefined })}
            hideErrorMessage
            removeOptionalText
          />
          <KindFields node={node} channels={channels} ctx={ctx} lookups={lookups} patch={patch} t={t} />
        </div>
      </div>

      <div className="flex gap-2 border-t border-neutral-50 p-3">
        <Button
          size="small"
          variant="secondary"
          style="outline"
          startIcon={<Copy className="size-3.5" />}
          onClick={() => dispatch({ type: "duplicate", id: node.id })}
        >
          {t("advancedAutomationDuplicate")}
        </Button>
        <Button
          size="small"
          variant="dangerClean"
          startIcon={<Trash2 className="size-3.5" />}
          onClick={() => dispatch({ type: "remove", id: node.id })}
        >
          {t("advancedAutomationRemoveStep")}
        </Button>
      </div>
    </aside>
  )
})
