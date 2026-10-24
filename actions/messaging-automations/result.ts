import type { AdvancedAutomationIssue } from "lib/automations/types"

type ActionOk<T> = { success: true; data: T }
export type ActionErr = {
  success: false
  /** The API's own message, or "" when there is none: callers fall back to a localized string. */
  error: string
  /** HTTP status when the failure came from the API (409 = changed by someone else). */
  status?: number
  /** Structured validation problems (advanced automations). */
  issues?: AdvancedAutomationIssue[]
}
export type ActionResult<T> = ActionOk<T> | ActionErr
