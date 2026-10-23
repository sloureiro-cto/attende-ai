import {
  createVisualActionForType,
  createVisualWhenForType,
} from "lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import { createEmptyFlow, createPath, createRouter, type EditorFlow, newStep } from "./flowModel"
import type { SalesBotEdge, SalesBotNode } from "./types"

export type RuleTemplateId = "human" | "afterHours" | "distribute"
export type BotTemplateId = "quote"

const RULE_TEMPLATE_IDS: RuleTemplateId[] = ["human", "afterHours", "distribute"]
export const isRuleTemplateId = (v: string | undefined): v is RuleTemplateId => !!v && (RULE_TEMPLATE_IDS as string[]).includes(v)

type RuleTemplateLabels = {
  humanPathName: string
  humanPathDescription: string
}

/** Starting points for the "new automation" dialog. Steps start incomplete on purpose: the author picks accounts/people. */
export function buildRuleTemplate(id: RuleTemplateId, labels: RuleTemplateLabels): EditorFlow {
  const flow = createEmptyFlow()
  if (id === "human") {
    const human = {
      ...createPath("ai", labels.humanPathName),
      description: labels.humanPathDescription,
      steps: [newStep(createVisualActionForType("assign_conversation", true))],
    }
    return { ...flow, router: { ...createRouter(), paths: [human] } }
  }
  if (id === "afterHours") {
    return {
      ...flow,
      filters: [createVisualWhenForType("outside_business_hours")],
      steps: [newStep(createVisualActionForType("send_text", true))],
    }
  }
  return {
    ...flow,
    filters: [createVisualWhenForType("new_lead")],
    steps: [newStep(createVisualActionForType("distribute_lead", true))],
  }
}

type BotTemplateLabels = {
  name: string
  welcome: string
  optionQuote: string
  optionHuman: string
  optionInfo: string
  askDetails: string
  thanks: string
  handoff: string
  info: string
}

type BotGraph = { startNodeId: string; nodes: SalesBotNode[]; edges: SalesBotEdge[] }

const edge = (from: string, output: string, to: string): SalesBotEdge => ({ id: `e_${from}_${output}`, from, output, to })

export function buildBotTemplate(id: BotTemplateId, labels: BotTemplateLabels): BotGraph {
  void id // only one template today
  const nodes: SalesBotNode[] = [
    {
      id: "welcome",
      kind: "send_message",
      x: 120,
      y: 200,
      text: labels.welcome,
      replyMode: "list",
      options: [
        { id: "quote", label: labels.optionQuote },
        { id: "human", label: labels.optionHuman },
        { id: "info", label: labels.optionInfo },
      ],
      noReplyMinutes: 60,
      noReplyBusinessHoursOnly: true,
    },
    { id: "ask_details", kind: "send_message", x: 520, y: 40, text: labels.askDetails, replyMode: "free" },
    { id: "thanks", kind: "send_message", x: 920, y: 40, text: labels.thanks, replyMode: "none" },
    { id: "handoff", kind: "handoff", x: 520, y: 260, message: labels.handoff },
    { id: "info", kind: "send_message", x: 520, y: 460, text: labels.info, replyMode: "none" },
    { id: "stop", kind: "stop", x: 920, y: 260 },
  ]
  const edges: SalesBotEdge[] = [
    edge("welcome", "quote", "ask_details"),
    edge("welcome", "human", "handoff"),
    edge("welcome", "info", "info"),
    edge("welcome", "no_reply", "handoff"),
    edge("ask_details", "answered", "thanks"),
    edge("thanks", "next", "handoff"),
  ]
  return { startNodeId: "welcome", nodes, edges }
}
