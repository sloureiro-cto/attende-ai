import { formatCount, type ReportBases } from "lib/attende/reports/model"
import type { KpiKey } from "lib/attende/reports/types"
import type { KpiCopy } from "./KpiTile"
import type { ReportsI18n } from "./useAttendeReportsT"

/** Label and exact definition (from the backend contract) of every KPI the dashboard shows. */
export const KPI_COPY: Partial<Record<KpiKey, KpiCopy>> = {
  conversations: { label: "kpiConversations", definition: "defConversations" },
  aiReplies: { label: "kpiAiReplies", definition: "defAiReplies" },
  aiResolutionRate: { label: "kpiAiResolutionRate", definition: "defAiResolutionRate" },
  handoffRate: { label: "kpiHandoffRate", definition: "defHandoffRate" },
  firstResponseAiMedianMs: { label: "kpiFirstResponseAi", definition: "defFirstResponseAi" },
  leadsCreated: { label: "kpiLeadsCreated", definition: "defLeadsCreated" },
  firstResponseHumanMedianMs: { label: "kpiFirstResponseHuman", definition: "defFirstResponseHuman" },
  humanReplies: { label: "kpiHumanReplies", definition: "defHumanReplies" },
  automationReplies: { label: "kpiAutomationReplies", definition: "defAutomationReplies" },
  messagesPerActiveConversationDay: { label: "kpiMessagesPerConversation", definition: "defMessagesPerConversation" },
  afterHoursShare: { label: "kpiAfterHours", definition: "defAfterHours" },
}

/**
 * The line under a KPI that says what it is measured on and when: "24 of 120 conversations started Oct 1 – 30".
 * Rates get their numerator and denominator, so two rates with different bases (handoffs count every new
 * conversation, possible AI resolution leaves out the ones still open) never look like they share one.
 * Returns the main line and an optional second line.
 */
export function kpiBasis(key: KpiKey, bases: ReportBases, range: string, { t, tp, language }: ReportsI18n): string[] {
  const n = (v: number) => formatCount(v, language) ?? ""
  const share = (stem: "basisOfStarted" | "basisOfSettled", b: { count: number; total: number }) => tp(stem, b.total, { part: n(b.count), range })
  switch (key) {
    case "conversations":
      return [t("basisStarted", { range })]
    case "aiReplies":
    case "humanReplies":
    case "automationReplies":
      return [t("basisSent", { range })]
    case "handoffRate":
      return bases.handoff ? [share("basisOfStarted", bases.handoff)] : [t("basisStarted", { range })]
    case "leadsCreated":
      return bases.leads ? [share("basisOfStarted", bases.leads)] : [t("basisStarted", { range })]
    case "aiResolutionRate": {
      const r = bases.resolution
      if (!r) return [t("basisStarted", { range })]
      return r.open > 0 ? [share("basisOfSettled", r), tp("basisOpenExcluded", r.open)] : [share("basisOfSettled", r)]
    }
    case "firstResponseAiMedianMs":
    case "firstResponseAiAvgMs":
      return [t("basisFirstAi", { range })]
    case "firstResponseHumanMedianMs":
    case "firstResponseHumanAvgMs":
      return [t("basisFirstHuman", { range })]
    case "messagesPerActiveConversationDay":
      return [t("basisMessages", { range })]
    case "afterHoursShare":
      return [t("basisCustomerMessages", { range })]
    default:
      return []
  }
}
