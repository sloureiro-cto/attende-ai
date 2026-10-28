"use client"

import { listAttendeAgentsAction } from "actions/attende/agents"
import type { ActionErr } from "actions/messaging-automations/result"
import { showToast } from "app/utils/showToast"
import { formatList } from "lib/attende/format"
import { automationErrorText } from "./automationErrorText"
import type { AutomationsTFn } from "./useAutomationsT"

type Session = { channel: string; sessionId: string }
type Key = Parameters<AutomationsTFn>[0]

/** Who answers a refused account: the Attende agent bound to it, when it is one of ours. */
export type AgentConflict = { lines: string[]; agent: { id: string; name: string } | null }

/** Channel names (same keys as `channelLabelKey` in ChannelFilter, kept here so this module stays free of React). */
const CHANNEL_LABEL_KEYS: Record<string, Key> = {
  whatsapp: "whatsappLiteNav",
  instagram: "instagramLiteNav",
  sms: "smsLiteNav",
}
const same = (a: Session, b: Session) =>
  a.channel === b.channel && a.sessionId.toLowerCase() === b.sessionId.toLowerCase()

/**
 * Names the accounts of a `AUTOMATION_SESSION_HAS_AGENT` refusal and finds the Attende agent that answers them. The line
 * name comes from the agent's own line list, then from the editor's accounts, then the channel name: never a raw id.
 */
export async function resolveAgentConflict(
  sessions: Session[],
  t: AutomationsTFn,
  sessionLabel?: (s: Session) => string | undefined
): Promise<AgentConflict> {
  const res = await listAttendeAgentsAction().catch(() => null)
  const agents = res?.success ? res.data : []
  const owner = agents.find((a) => a.lines.some((l) => sessions.some((s) => same(s, l))))
  const lines = sessions.map((s) => {
    const fromAgent = agents
      .flatMap((a) => a.lines)
      .find((l) => same(s, l))
      ?.label?.trim()
    if (fromAgent) return fromAgent
    const fromEditor = sessionLabel?.(s)?.trim()
    if (fromEditor) return fromEditor
    const channelKey = CHANNEL_LABEL_KEYS[s.channel]
    return channelKey ? t(channelKey) : s.channel
  })
  return { lines: Array.from(new Set(lines)), agent: owner ? { id: owner.id, name: owner.name } : null }
}

/**
 * Toast for a failed save or toggle of an automation. The conflict with an AI agent names the accounts and offers to
 * open the agent (or the agents list) so it can be paused; the other codes fall back to `automationErrorText`.
 */
export async function showAutomationError(
  res: Pick<ActionErr, "code" | "sessions"> & { error?: string },
  t: AutomationsTFn,
  fallback: Key,
  opts: { language: string; navigate: (href: string) => void; sessionLabel?: (s: Session) => string | undefined }
): Promise<void> {
  if (res.code === "AUTOMATION_SESSION_HAS_AGENT") {
    const conflict = await resolveAgentConflict(res.sessions ?? [], t, opts.sessionLabel)
    const message = conflict.lines.length
      ? t("advancedAutomationErrSessionHasAgent", { lines: formatList(conflict.lines, opts.language) })
      : t("advancedAutomationErrSessionHasAgentNoLines")
    showToast("error", message, {
      autoClose: false,
      closeOnClick: false,
      actionLabel: conflict.agent
        ? t("advancedAutomationOpenAgent", { name: conflict.agent.name })
        : t("advancedAutomationOpenAgents"),
      onAction: () =>
        opts.navigate(conflict.agent ? `/ai-agents/${encodeURIComponent(conflict.agent.id)}` : "/ai-agents"),
    })
    return
  }
  showToast("error", automationErrorText(res, t, fallback))
}
