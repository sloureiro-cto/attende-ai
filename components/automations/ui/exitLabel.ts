import { exitDisplayName, FIXED_EXIT_LABEL_KEYS } from "lib/automations/botGraph"
import type { AdvancedAutomationNode } from "lib/automations/types"
import type { AutomationsTFn } from "./useAutomationsT"

/** What the person sees for an exit of a step: its fixed name, the author's name, or a numbered default. */
export function exitLabelText(node: AdvancedAutomationNode, exitId: string, t: AutomationsTFn): string {
  const { fixedKey, name, unnamed } = exitDisplayName(node, exitId)
  if (fixedKey) return t(FIXED_EXIT_LABEL_KEYS[fixedKey])
  if (name) return name
  if (unnamed) return t(unnamed.key, { n: unnamed.n })
  return t("advancedAutomationExitOther")
}
