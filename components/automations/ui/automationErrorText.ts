import type { AutomationsTFn } from "./useAutomationsT"

type Key = Parameters<AutomationsTFn>[0]

/** Codes with their own translated sentence: the API's English message is never shown for them. */
const CODE_TEXT: Record<string, Key> = {
  JSYNQ_UNAVAILABLE: "advancedAutomationErrServiceUnavailable",
  WORKSPACE_TOKEN_MISMATCH: "advancedAutomationErrWorkspaceMismatch",
  ATTENDE_QUOTA_EXCEEDED: "advancedAutomationErrQuota",
  ATTENDE_TRIAL_EXPIRED: "advancedAutomationErrPlanInactive",
  ATTENDE_SUBSCRIPTION_INACTIVE: "advancedAutomationErrPlanInactive",
  ATTENDE_NOT_ENTITLED: "advancedAutomationErrPlanInactive",
  AUTOMATION_SESSION_HAS_AGENT: "advancedAutomationErrSessionHasAgentNoLines",
}

/**
 * Text for a failed automation call: known codes get their own translated sentence; otherwise the API's message, or the
 * caller's localized fallback when there is none.
 */
export function automationErrorText(res: { error?: string; code?: string }, t: AutomationsTFn, fallback: Key): string {
  const own = res.code ? CODE_TEXT[res.code] : undefined
  if (own) return t(own)
  return res.error || t(fallback)
}

/** The failure has its own sentence (service, plan or conflict), so a generic message would mislead. */
export const hasOwnErrorText = (res: { code?: string }): boolean => !!res.code && res.code in CODE_TEXT
