import {
  Bot,
  CircleStop,
  Clock,
  CornerDownRight,
  FileText,
  Filter,
  Globe,
  ListChecks,
  type LucideIcon,
  MessageSquare,
  MoveRight,
  PenLine,
  Shuffle,
  Tag,
  UserRound,
} from "lucide-react"
import type { SalesBotNodeKind } from "lib/automations/types"
import type { AutomationsTranslationKey } from "lib/i18n/translations/automations"

type NodeTone = "primary" | "neutral" | "warning" | "error" | "info"

export const NODE_META: Record<SalesBotNodeKind, { icon: LucideIcon; labelKey: AutomationsTranslationKey; tone: NodeTone }> = {
  send_message: { icon: MessageSquare, labelKey: "salesBotKindSendMessage", tone: "primary" },
  send_meta_template: { icon: FileText, labelKey: "salesBotKindSendTemplate", tone: "primary" },
  condition: { icon: Filter, labelKey: "salesBotKindCondition", tone: "info" },
  split: { icon: Shuffle, labelKey: "salesBotKindSplit", tone: "info" },
  wait: { icon: Clock, labelKey: "salesBotKindWait", tone: "info" },
  ai_agent: { icon: Bot, labelKey: "salesBotKindAiAgent", tone: "warning" },
  goto_bot: { icon: CornerDownRight, labelKey: "salesBotKindGotoBot", tone: "info" },
  set_field: { icon: PenLine, labelKey: "salesBotKindSetField", tone: "neutral" },
  move_stage: { icon: MoveRight, labelKey: "salesBotKindMoveStage", tone: "neutral" },
  add_label: { icon: Tag, labelKey: "salesBotKindAddLabel", tone: "neutral" },
  create_task: { icon: ListChecks, labelKey: "salesBotKindCreateTask", tone: "neutral" },
  webhook: { icon: Globe, labelKey: "salesBotKindWebhook", tone: "neutral" },
  handoff: { icon: UserRound, labelKey: "salesBotKindHandoff", tone: "error" },
  stop: { icon: CircleStop, labelKey: "salesBotKindStop", tone: "neutral" },
}

/** Tailwind classes for the icon chip of each tone (same pairings as the design). */
export const TONE_CHIP: Record<NodeTone, string> = {
  primary: "bg-primary-clean text-primary-dark",
  neutral: "bg-neutral-10 text-neutral-600",
  warning: "bg-warning-clean text-warning-darkest",
  error: "bg-error-clean text-error-darkest",
  info: "bg-info-clean text-info-dark",
}

export type PaletteItem = {
  /** Unique within the palette (the question preset shares `send_message` with the plain message). */
  id: string
  kind: SalesBotNodeKind
  labelKey: AutomationsTranslationKey
  /** Fields merged into the new step (e.g. a question starts in free-text reply mode). */
  preset?: Record<string, unknown>
}

/** Same four groups as the design; the swatch tints match the group, not the step's own tone. */
export const PALETTE_GROUPS: Array<{ titleKey: AutomationsTranslationKey; swatch: string; items: PaletteItem[] }> = [
  {
    titleKey: "salesBotGroupConversation",
    swatch: "border-primary-lighter bg-primary-clean",
    items: [
      { id: "send_message", kind: "send_message", labelKey: "salesBotKindSendMessage" },
      { id: "question", kind: "send_message", labelKey: "salesBotKindQuestion", preset: { replyMode: "free" } },
      { id: "send_meta_template", kind: "send_meta_template", labelKey: "salesBotKindSendTemplate" },
    ],
  },
  {
    titleKey: "salesBotGroupFlow",
    swatch: "border-info-lighter bg-info-clean",
    items: [
      { id: "condition", kind: "condition", labelKey: "salesBotKindCondition" },
      { id: "wait", kind: "wait", labelKey: "salesBotKindWait" },
      { id: "split", kind: "split", labelKey: "salesBotKindSplit" },
      { id: "goto_bot", kind: "goto_bot", labelKey: "salesBotKindGotoBot" },
      { id: "stop", kind: "stop", labelKey: "salesBotKindStop" },
    ],
  },
  {
    titleKey: "salesBotGroupCrm",
    swatch: "border-neutral-border bg-neutral-10",
    items: [
      { id: "set_field", kind: "set_field", labelKey: "salesBotKindSetField" },
      { id: "move_stage", kind: "move_stage", labelKey: "salesBotKindMoveStage" },
      { id: "add_label", kind: "add_label", labelKey: "salesBotKindAddLabel" },
    ],
  },
  {
    titleKey: "salesBotGroupAiTeam",
    swatch: "border-warning-lighter bg-warning-clean",
    items: [
      { id: "ai_agent", kind: "ai_agent", labelKey: "salesBotKindAiAgent" },
      { id: "handoff", kind: "handoff", labelKey: "salesBotKindHandoff" },
      { id: "webhook", kind: "webhook", labelKey: "salesBotKindWebhook" },
    ],
  },
]

/** "90 min" / "2 h" / "3 days" from minutes, largest exact unit. */
export function minutesParts(minutes: number): { value: number; unit: "minutes" | "hours" | "days" } {
  if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" }
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" }
  return { value: minutes, unit: "minutes" }
}

export const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440 } as const
