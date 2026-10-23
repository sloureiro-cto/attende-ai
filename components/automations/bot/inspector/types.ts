import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import type { EditorContextData } from "lib/automations/editorContext"
import type { AutomationChannel, SalesBotNode } from "lib/automations/types"
import type { BotLookups } from "../useBotLookups"

/** What every per-kind field group receives from the inspector shell. */
export type KindProps = {
  node: SalesBotNode
  channels: AutomationChannel[]
  ctx: EditorContextData
  lookups: BotLookups
  patch: (p: Record<string, unknown>) => void
  t: AutomationsTFn
}

/** `KindProps` with the node narrowed to one kind. */
export type Narrow<K extends SalesBotNode["kind"]> = Omit<KindProps, "node"> & { node: Extract<SalesBotNode, { kind: K }> }
