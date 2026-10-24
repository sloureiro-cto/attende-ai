/** Result of a server action that talks to the Attende backend or to JSYNQ. Safe to import from client code (no server imports). */
export type AttendeActionError = {
  success: false
  /** HTTP status; 0 = network problem, 400 = rejected by the action before any call. */
  status: number
  /** Stable backend code (`ATTENDE_TRIAL_EXPIRED`, `ATTENDE_SUBSCRIPTION_INACTIVE`, `ATTENDE_NOT_ENTITLED`...). The UI branches on it, never on the message. */
  reference?: string
  message?: string
  /** Extra fields of the error body (`details`), when the backend sent them. */
  details?: Record<string, unknown>
}
export type AttendeActionResult<T> = { success: true; data: T } | AttendeActionError

/** Codes that mean "the subscription does not allow this right now" (show the plan gate, not a generic error). */
export const SUBSCRIPTION_BLOCK_REFERENCES = ["ATTENDE_TRIAL_EXPIRED", "ATTENDE_SUBSCRIPTION_INACTIVE"] as const

export const isSubscriptionBlock = (error: { status: number; reference?: string }): boolean =>
  error.status === 402 || (SUBSCRIPTION_BLOCK_REFERENCES as readonly string[]).includes(error.reference ?? "")

/**
 * Service-level failures any Attende call can answer with:
 * - `WORKSPACE_TOKEN_MISMATCH` (409): the request named another workspace than the session's. Reloading picks up the session's.
 * - `JSYNQ_UNAVAILABLE` (503): the platform behind the Attende backend did not answer. A retry later usually works.
 * The keys live in `lib/i18n/translations/attende/serviceErrors.ts` and are part of every Attende dictionary.
 */
export type ServiceErrorKey = "errWorkspaceMismatch" | "errJsynqUnavailable"

export function serviceErrorKey(code: string | undefined | null): ServiceErrorKey | null {
  if (code === "WORKSPACE_TOKEN_MISMATCH") return "errWorkspaceMismatch"
  if (code === "JSYNQ_UNAVAILABLE") return "errJsynqUnavailable"
  return null
}
