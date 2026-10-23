import type { KpiValue, OverviewResponse, SeriesPoint } from "./types"

export const kpi = (value: number | null, previous: number | null = null): KpiValue => ({
  value,
  previous,
  delta: value !== null && previous !== null ? value - previous : null,
  deltaPct: value !== null && previous !== null && previous !== 0 ? (value - previous) / previous : null,
})

export const day = (n: number): string => `2026-10-${String(n).padStart(2, "0")}`

export function point(n: number, over: Partial<SeriesPoint> = {}): SeriesPoint {
  return { day: day(n), conversations: 0, inboundMessages: 0, aiReplies: 0, humanReplies: 0, handoffEvents: 0, leadsCreated: 0, ...over }
}

/** An overview with traffic. Override pieces per test. */
export function overview(over: Partial<OverviewResponse> = {}): OverviewResponse {
  return {
    range: { from: day(1), to: day(7), days: 7 },
    previousRange: { from: "2026-09-24", to: "2026-09-30" },
    generatedAt: "2026-10-07T12:00:00.000Z",
    kpis: {
      conversations: kpi(120, 100),
      aiReplies: kpi(400, 380),
      humanReplies: kpi(60, 70),
      automationReplies: kpi(30, 30),
      handoffRate: kpi(0.2, 0.3),
      aiResolutionRate: kpi(0.55, 0.4),
      firstResponseAiAvgMs: kpi(50_000, 60_000),
      firstResponseAiMedianMs: kpi(45_000, 60_000),
      firstResponseHumanAvgMs: kpi(900_000, 800_000),
      firstResponseHumanMedianMs: kpi(600_000, 700_000),
      leadsCreated: kpi(25, 20),
      messagesPerActiveConversationDay: kpi(6.5, 6),
      afterHoursShare: kpi(null, null),
    },
    series: [point(1, { conversations: 10, aiReplies: 30 }), point(2, { conversations: 40, aiReplies: 90, handoffEvents: 6 }), point(3, { conversations: 20 })],
    byAgent: [
      { agentId: "a".repeat(24), name: "Sofia", conversations: 80, aiReplies: 300, handoffRate: 0.15, aiResolutionRate: 0.7, firstResponseAiAvgMs: 40_000, firstResponseAiMedianMs: 35_000, leadsCreated: 18 },
      { agentId: "b".repeat(24), name: "Rafa", conversations: 30, aiReplies: 100, handoffRate: 0.4, aiResolutionRate: 0.4, firstResponseAiAvgMs: 70_000, firstResponseAiMedianMs: 60_000, leadsCreated: 5 },
      { agentId: null, name: null, conversations: 10, aiReplies: 0, handoffRate: null, aiResolutionRate: null, firstResponseAiAvgMs: null, firstResponseAiMedianMs: null, leadsCreated: 2 },
    ],
    byChannel: [{ channel: "whatsapp", conversations: 120, inboundMessages: 700, aiReplies: 400, humanReplies: 60, handoffRate: 0.2, aiResolutionRate: 0.55 }],
    outcomes: {
      total: 120,
      items: [
        { outcome: "resolved_by_ai", count: 60, share: 0.5 },
        { outcome: "handed_off", count: 24, share: 0.2 },
        { outcome: "human_handled", count: 6, share: 0.05 },
        { outcome: "abandoned", count: 12, share: 0.1 },
        { outcome: "open", count: 18, share: 0.15 },
      ],
    },
    topHandoffReasons: [{ reason: "wants to talk about price", count: 9 }],
    notAvailable: ["opt_outs", "customer_satisfaction", "ai_resolution_confirmed", "after_hours_share"],
    ...over,
  }
}

export function emptyOverview(): OverviewResponse {
  const zero = kpi(0, 0)
  return overview({
    kpis: {
      conversations: zero,
      aiReplies: zero,
      humanReplies: zero,
      automationReplies: zero,
      handoffRate: kpi(null, null),
      aiResolutionRate: kpi(null, null),
      firstResponseAiAvgMs: kpi(null, null),
      firstResponseAiMedianMs: kpi(null, null),
      firstResponseHumanAvgMs: kpi(null, null),
      firstResponseHumanMedianMs: kpi(null, null),
      leadsCreated: zero,
      messagesPerActiveConversationDay: kpi(null, null),
      afterHoursShare: kpi(null, null),
    },
    series: [point(1), point(2), point(3)],
    byAgent: [],
    byChannel: [],
    outcomes: { total: 0, items: [] },
    topHandoffReasons: [],
  })
}
