import { useEffect, useMemo, useState } from "react"
import type { ResponseSlaRules, WhatsAppConversation, WhatsAppSession } from "actions/whatsapp-lite/types"

export type SlaStatus = "normal" | "warning" | "critical"

export interface ConversationSlaInfo {
  status: SlaStatus
  elapsedMs: number
}

function resolveThresholds(
  conv: WhatsAppConversation,
  rules: ResponseSlaRules
): { warningMinutes: number; criticalMinutes: number } | null {
  if (rules.columnRules?.length && conv.crmColumnId) {
    const match = rules.columnRules.find(
      (r) => r.columnId === conv.crmColumnId && (!r.projectId || r.projectId === conv.crmProjectId)
    )
    if (match) return { warningMinutes: match.warningMinutes, criticalMinutes: match.criticalMinutes }
  }
  if (rules.defaultWarningMinutes > 0 && rules.defaultCriticalMinutes > 0) {
    return { warningMinutes: rules.defaultWarningMinutes, criticalMinutes: rules.defaultCriticalMinutes }
  }
  return null
}

export function computeSlaStatus(
  conv: WhatsAppConversation,
  rules: ResponseSlaRules,
  now: number
): ConversationSlaInfo {
  const inbound = conv.lastInboundAt ? new Date(conv.lastInboundAt).getTime() : 0
  const outbound = conv.lastOutboundAt ? new Date(conv.lastOutboundAt).getTime() : 0

  if (!inbound || outbound >= inbound) {
    return { status: "normal", elapsedMs: 0 }
  }

  const thresholds = resolveThresholds(conv, rules)
  if (!thresholds) return { status: "normal", elapsedMs: 0 }
  const { warningMinutes, criticalMinutes } = thresholds
  const elapsedMs = now - inbound
  if (elapsedMs >= criticalMinutes * 60_000) return { status: "critical", elapsedMs }
  if (elapsedMs >= warningMinutes * 60_000) return { status: "warning", elapsedMs }
  return { status: "normal", elapsedMs }
}

export function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  if (totalMinutes < 60) {
    const s = Math.floor((ms % 60_000) / 1000)
    return `${totalMinutes}:${String(s).padStart(2, "0")}`
  }
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) {
    const m = totalMinutes % 60
    return `${totalHours}h${m > 0 ? ` ${m}m` : ""}`
  }
  const totalDays = Math.floor(totalHours / 24)
  const h = totalHours % 24
  return `${totalDays}d${h > 0 ? ` ${h}h` : ""}`
}

const SLA_STATUS_ORDER: Record<SlaStatus, number> = { critical: 0, warning: 1, normal: 2 }

function compareSlaRows(
  slaA: ConversationSlaInfo,
  slaB: ConversationSlaInfo,
  lastAtA: number,
  lastAtB: number
): number {
  const orderDiff = SLA_STATUS_ORDER[slaA.status] - SLA_STATUS_ORDER[slaB.status]
  if (orderDiff !== 0) return orderDiff

  if (slaA.status !== "normal" || slaB.status !== "normal") {
    return slaB.elapsedMs - slaA.elapsedMs
  }

  return lastAtB - lastAtA
}

export function slaAwareSort(
  conversations: WhatsAppConversation[],
  slaMap: Map<string, ConversationSlaInfo>
): WhatsAppConversation[] {
  return [...conversations].sort((a, b) => {
    const slaA = slaMap.get(a._id) ?? { status: "normal" as const, elapsedMs: 0 }
    const slaB = slaMap.get(b._id) ?? { status: "normal" as const, elapsedMs: 0 }
    const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return compareSlaRows(slaA, slaB, dateA, dateB)
  })
}

/** SLA-first ordering for unified inbox rows (WhatsApp SLA + SMS chronological). */
export function slaAwareUnifiedInboxSort<
  T extends { channel: "whatsapp" | "sms" | "instagram"; lastAt: number; conversationId: string },
>(rows: T[], slaMap: Map<string, ConversationSlaInfo>): T[] {
  return [...rows].sort((a, b) => {
    const slaA =
      a.channel === "whatsapp"
        ? slaMap.get(a.conversationId) ?? { status: "normal" as const, elapsedMs: 0 }
        : { status: "normal" as const, elapsedMs: 0 }
    const slaB =
      b.channel === "whatsapp"
        ? slaMap.get(b.conversationId) ?? { status: "normal" as const, elapsedMs: 0 }
        : { status: "normal" as const, elapsedMs: 0 }
    return compareSlaRows(slaA, slaB, a.lastAt, b.lastAt)
  })
}

function resolveActiveSlaRules(sessions: WhatsAppSession[], activeSessionId?: string | null): ResponseSlaRules | null {
  const target = activeSessionId ? sessions.find((s) => s._id === activeSessionId) : undefined

  if (target?.responseSlaRules?.enabled) return target.responseSlaRules

  for (const s of sessions) {
    if (s.responseSlaRules?.enabled) return s.responseSlaRules
  }
  return null
}

/**
 * Hook that recalculates SLA status for all conversations every second.
 * Supports per-column SLA rules via `conv.crmColumnId` matching `rules.columnRules`.
 */
export function useConversationSla(
  conversations: WhatsAppConversation[],
  sessions: WhatsAppSession[],
  activeSessionId?: string | null
) {
  const [now, setNow] = useState(Date.now)

  const rules = useMemo(() => resolveActiveSlaRules(sessions, activeSessionId), [sessions, activeSessionId])

  useEffect(() => {
    if (!rules) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [rules])

  const slaMap = useMemo(() => {
    const map = new Map<string, ConversationSlaInfo>()
    if (!rules) return map
    for (const c of conversations) {
      map.set(c._id, computeSlaStatus(c, rules, now))
    }
    return map
  }, [conversations, rules, now])

  return { slaMap, slaRules: rules }
}
