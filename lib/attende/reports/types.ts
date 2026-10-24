/** Shapes of JSYNQ conversation analytics (`GET /api/conversation-analytics/*`), the same as the old reports API. */
export type ReportChannel = "whatsapp" | "instagram" | "sms"
export const REPORT_CHANNELS: readonly ReportChannel[] = ["whatsapp", "instagram", "sms"]

export type ConversationOutcome = "resolved_by_ai" | "handed_off" | "human_handled" | "abandoned" | "open"
export const CONVERSATION_OUTCOMES: readonly ConversationOutcome[] = ["resolved_by_ai", "handed_off", "human_handled", "abandoned", "open"]

export type KpiValue = {
  value: number | null
  previous: number | null
  delta: number | null
  /** (value - previous) / previous; null when previous is 0 or null. */
  deltaPct: number | null
}

export type OverviewKpis = {
  conversations: KpiValue
  aiReplies: KpiValue
  humanReplies: KpiValue
  automationReplies: KpiValue
  handoffRate: KpiValue
  aiResolutionRate: KpiValue
  firstResponseAiAvgMs: KpiValue
  firstResponseAiMedianMs: KpiValue
  firstResponseHumanAvgMs: KpiValue
  firstResponseHumanMedianMs: KpiValue
  leadsCreated: KpiValue
  messagesPerActiveConversationDay: KpiValue
  afterHoursShare: KpiValue
}
export type KpiKey = keyof OverviewKpis

export type SeriesPoint = {
  day: string
  conversations: number
  inboundMessages: number
  aiReplies: number
  humanReplies: number
  handoffEvents: number
  leadsCreated: number
}

export type AgentBreakdownRow = {
  /** null = activity that is not attributable to an AI agent (people, rules, bots, unanswered). */
  agentId: string | null
  name: string | null
  conversations: number
  aiReplies: number
  handoffRate: number | null
  aiResolutionRate: number | null
  firstResponseAiAvgMs: number | null
  firstResponseAiMedianMs: number | null
  leadsCreated: number
}

export type ChannelBreakdownRow = {
  channel: ReportChannel
  conversations: number
  inboundMessages: number
  aiReplies: number
  humanReplies: number
  handoffRate: number | null
  aiResolutionRate: number | null
}

export type OutcomesDistribution = {
  total: number
  items: Array<{ outcome: ConversationOutcome; count: number; share: number | null }>
}

export type HandoffReasonCount = { reason: string; count: number }

export type OverviewResponse = {
  range: { from: string; to: string; days: number }
  previousRange: { from: string; to: string }
  generatedAt: string
  kpis: OverviewKpis
  series: SeriesPoint[]
  byAgent: AgentBreakdownRow[]
  byChannel: ChannelBreakdownRow[]
  outcomes: OutcomesDistribution
  topHandoffReasons: HandoffReasonCount[]
  /** Stable keys of metrics the data cannot support: `opt_outs`, `customer_satisfaction`, `ai_resolution_confirmed`, `after_hours_share`. */
  notAvailable: string[]
}

/** The filters of the screen. `agentId` may be `none` (not attributable to an AI agent). */
export type ReportFilters = {
  /** Inclusive UTC days, `YYYY-MM-DD`. */
  from: string
  to: string
  channel: ReportChannel | null
  agentId: string | null
}
