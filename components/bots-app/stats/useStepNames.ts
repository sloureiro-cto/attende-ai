"use client"

import { useCallback } from "react"
import { NODE_META } from "components/automations/bot/botNodeMeta"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import { exitDisplayName, FIXED_EXIT_LABEL_KEYS } from "lib/automations/botGraph"
import type { SalesBotNode } from "lib/automations/types"
import { useStatsT } from "./useStatsT"

const TITLE_MAX = 56

/** Human names for steps and their exits, in the user's language (same wording as the builder). */
export function useStepNames() {
  const { t: at } = useAutomationsT()
  const { t } = useStatsT()

  const stepTitle = useCallback(
    (node: SalesBotNode, order: number): string => {
      const custom = node.label?.trim()
      if (custom) return custom
      if (node.kind === "send_message" && node.text.trim()) {
        const text = node.text.trim().replace(/\s+/g, " ")
        return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text
      }
      return at(NODE_META[node.kind].labelKey) || t("stepFallback", { n: order })
    },
    [at, t]
  )

  const kindLabel = useCallback((node: SalesBotNode): string => at(NODE_META[node.kind].labelKey), [at])

  const exitLabel = useCallback(
    (node: SalesBotNode, exitId: string): string => {
      const { fixedKey, name } = exitDisplayName(node, exitId)
      if (fixedKey) return at(FIXED_EXIT_LABEL_KEYS[fixedKey])
      return name?.trim() || exitId
    },
    [at]
  )

  return { stepTitle, kindLabel, exitLabel }
}
