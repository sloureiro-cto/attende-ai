import type { AutomationsTFn } from "./useAutomationsT"

type Key = Parameters<AutomationsTFn>[0]

/**
 * Text for a failed automation call: service-level codes get their own translated sentence; otherwise the API's message,
 * or the caller's localized fallback when there is none.
 */
export function automationErrorText(res: { error?: string; code?: string }, t: AutomationsTFn, fallback: Key): string {
  if (res.code === "JSYNQ_UNAVAILABLE") return t("advancedAutomationErrServiceUnavailable")
  if (res.code === "WORKSPACE_TOKEN_MISMATCH") return t("advancedAutomationErrWorkspaceMismatch")
  return res.error || t(fallback)
}

/** Service-level failure (as opposed to a problem with the automation itself): the generic messages would mislead. */
export const isServiceFailure = (res: { code?: string }): boolean =>
  res.code === "JSYNQ_UNAVAILABLE" || res.code === "WORKSPACE_TOKEN_MISMATCH"
