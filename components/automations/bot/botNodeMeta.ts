import {
  Bot,
  CheckCheck,
  CircleStop,
  Clock,
  Copy,
  FilePlus2,
  Hourglass,
  Inbox,
  ListPlus,
  MessageSquareText,
  SquareCheck,
  Tags,
  Trash2,
  UserCheck,
  UserPlus,
  Wallet,
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
import type { AdvancedAutomationNode, AdvancedAutomationNodeKind } from "lib/automations/types"
import type { AutomationsTranslationKey } from "lib/i18n/translations/automations"

type NodeTone = "primary" | "neutral" | "warning" | "error" | "info"

export const NODE_META: Record<AdvancedAutomationNodeKind, { icon: LucideIcon; labelKey: AutomationsTranslationKey; tone: NodeTone }> = {
  send_message: { icon: MessageSquare, labelKey: "advancedAutomationKindSendMessage", tone: "primary" },
  send_meta_template: { icon: FileText, labelKey: "advancedAutomationKindSendTemplate", tone: "primary" },
  condition: { icon: Filter, labelKey: "advancedAutomationKindCondition", tone: "info" },
  split: { icon: Shuffle, labelKey: "advancedAutomationKindSplit", tone: "info" },
  wait: { icon: Clock, labelKey: "advancedAutomationKindWait", tone: "info" },
  ai_agent: { icon: Bot, labelKey: "advancedAutomationKindAiAgent", tone: "warning" },
  goto_automation: { icon: CornerDownRight, labelKey: "advancedAutomationKindGotoBot", tone: "info" },
  set_field: { icon: PenLine, labelKey: "advancedAutomationKindSetField", tone: "neutral" },
  move_stage: { icon: MoveRight, labelKey: "advancedAutomationKindMoveStage", tone: "neutral" },
  add_label: { icon: Tag, labelKey: "advancedAutomationKindAddLabel", tone: "neutral" },
  create_task: { icon: ListChecks, labelKey: "advancedAutomationKindCreateTask", tone: "neutral" },
  webhook: { icon: Globe, labelKey: "advancedAutomationKindWebhook", tone: "neutral" },
  handoff: { icon: UserRound, labelKey: "advancedAutomationKindHandoff", tone: "error" },
  stop: { icon: CircleStop, labelKey: "advancedAutomationKindStop", tone: "neutral" },
  create_card: { icon: FilePlus2, labelKey: "advancedAutomationKindCreateCard", tone: "neutral" },
  duplicate_card: { icon: Copy, labelKey: "advancedAutomationKindDuplicateCard", tone: "neutral" },
  delete_card: { icon: Trash2, labelKey: "advancedAutomationKindDeleteCard", tone: "error" },
  move_board: { icon: MoveRight, labelKey: "advancedAutomationKindMoveBoard", tone: "neutral" },
  set_value: { icon: Wallet, labelKey: "advancedAutomationKindSetValue", tone: "neutral" },
  set_owner: { icon: UserCheck, labelKey: "advancedAutomationKindSetOwner", tone: "neutral" },
  remove_label: { icon: Tags, labelKey: "advancedAutomationKindRemoveLabel", tone: "neutral" },
  add_comment: { icon: MessageSquareText, labelKey: "advancedAutomationKindAddComment", tone: "neutral" },
  add_checklist_item: { icon: ListPlus, labelKey: "advancedAutomationKindAddChecklistItem", tone: "neutral" },
  check_checklist_item: { icon: SquareCheck, labelKey: "advancedAutomationKindCheckChecklistItem", tone: "neutral" },
  mark_read: { icon: CheckCheck, labelKey: "advancedAutomationKindMarkRead", tone: "primary" },
  assign_conversation: { icon: UserPlus, labelKey: "advancedAutomationKindAssignConversation", tone: "primary" },
  save_reply: { icon: Inbox, labelKey: "advancedAutomationKindSaveReply", tone: "primary" },
  wait_reply: { icon: Hourglass, labelKey: "advancedAutomationKindWaitReply", tone: "info" },
}

/** Label of a step's kind; a handoff to an AI agent reads as such, not as "hand off to a person". */
export function nodeKindLabelKey(node: AdvancedAutomationNode): AutomationsTranslationKey {
  if (node.kind === "handoff" && node.to === "ai") return "advancedAutomationKindHandoffAi"
  return NODE_META[node.kind].labelKey
}

/** Steps the runtime cannot run for now: shown disabled in the palette, flagged on the canvas. */
export const UNAVAILABLE_KINDS: ReadonlySet<AdvancedAutomationNodeKind> = new Set<AdvancedAutomationNodeKind>(["send_meta_template"])

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
  kind: AdvancedAutomationNodeKind
  labelKey: AutomationsTranslationKey
  /** Fields merged into the new step (e.g. a question starts in free-text reply mode). */
  preset?: Record<string, unknown>
}

/** Same four groups as the design; the swatch tints match the group, not the step's own tone. */
export const PALETTE_GROUPS: Array<{ titleKey: AutomationsTranslationKey; swatch: string; items: PaletteItem[] }> = [
  {
    titleKey: "advancedAutomationGroupConversation",
    swatch: "border-primary-lighter bg-primary-clean",
    items: [
      { id: "send_message", kind: "send_message", labelKey: "advancedAutomationKindSendMessage" },
      { id: "question", kind: "send_message", labelKey: "advancedAutomationKindQuestion", preset: { replyMode: "free" } },
      { id: "send_meta_template", kind: "send_meta_template", labelKey: "advancedAutomationKindSendTemplate" },
      { id: "mark_read", kind: "mark_read", labelKey: "advancedAutomationKindMarkRead" },
      { id: "assign_conversation", kind: "assign_conversation", labelKey: "advancedAutomationKindAssignConversation" },
      { id: "save_reply", kind: "save_reply", labelKey: "advancedAutomationKindSaveReply" },
    ],
  },
  {
    titleKey: "advancedAutomationGroupFlow",
    swatch: "border-info-lighter bg-info-clean",
    items: [
      { id: "condition", kind: "condition", labelKey: "advancedAutomationKindCondition" },
      { id: "wait", kind: "wait", labelKey: "advancedAutomationKindWait" },
      { id: "wait_reply", kind: "wait_reply", labelKey: "advancedAutomationKindWaitReply" },
      { id: "split", kind: "split", labelKey: "advancedAutomationKindSplit" },
      { id: "goto_automation", kind: "goto_automation", labelKey: "advancedAutomationKindGotoBot" },
      { id: "stop", kind: "stop", labelKey: "advancedAutomationKindStop" },
    ],
  },
  {
    titleKey: "advancedAutomationGroupLead",
    swatch: "border-neutral-border bg-neutral-10",
    items: [
      { id: "create_card", kind: "create_card", labelKey: "advancedAutomationKindCreateCard" },
      { id: "set_field", kind: "set_field", labelKey: "advancedAutomationKindSetField" },
      { id: "set_value", kind: "set_value", labelKey: "advancedAutomationKindSetValue" },
      { id: "set_owner", kind: "set_owner", labelKey: "advancedAutomationKindSetOwner" },
      { id: "move_stage", kind: "move_stage", labelKey: "advancedAutomationKindMoveStage" },
      { id: "move_board", kind: "move_board", labelKey: "advancedAutomationKindMoveBoard" },
      { id: "add_label", kind: "add_label", labelKey: "advancedAutomationKindAddLabel" },
      { id: "remove_label", kind: "remove_label", labelKey: "advancedAutomationKindRemoveLabel" },
      { id: "duplicate_card", kind: "duplicate_card", labelKey: "advancedAutomationKindDuplicateCard" },
      { id: "delete_card", kind: "delete_card", labelKey: "advancedAutomationKindDeleteCard" },
    ],
  },
  {
    titleKey: "advancedAutomationGroupRecord",
    swatch: "border-neutral-border bg-neutral-10",
    items: [
      { id: "add_comment", kind: "add_comment", labelKey: "advancedAutomationKindAddComment" },
      { id: "add_checklist_item", kind: "add_checklist_item", labelKey: "advancedAutomationKindAddChecklistItem" },
      { id: "check_checklist_item", kind: "check_checklist_item", labelKey: "advancedAutomationKindCheckChecklistItem" },
    ],
  },
  {
    titleKey: "advancedAutomationGroupAiTeam",
    swatch: "border-warning-lighter bg-warning-clean",
    items: [
      { id: "ai_agent", kind: "ai_agent", labelKey: "advancedAutomationKindAiAgent" },
      { id: "handoff", kind: "handoff", labelKey: "advancedAutomationKindHandoff" },
      { id: "handoff_ai", kind: "handoff", labelKey: "advancedAutomationKindHandoffAi", preset: { to: "ai" } },
      { id: "webhook", kind: "webhook", labelKey: "advancedAutomationKindWebhook" },
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
