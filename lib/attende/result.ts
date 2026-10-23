/** Result of a server action that talks to `/api/attende/*`. Safe to import from client code (types only). */
export type AttendeActionError = {
  success: false
  /** HTTP status; 0 = network problem, 400 = rejected by the action before any call. */
  status: number
  /** Stable backend code (`ATTENDE_TRIAL_EXPIRED`, `ATTENDE_SUBSCRIPTION_INACTIVE`, `ATTENDE_NOT_ENTITLED`...). The UI branches on it, never on the message. */
  reference?: string
  message?: string
}
export type AttendeActionResult<T> = { success: true; data: T } | AttendeActionError

/** Codes that mean "the subscription does not allow this right now" (show the plan gate, not a generic error). */
export const SUBSCRIPTION_BLOCK_REFERENCES = ["ATTENDE_TRIAL_EXPIRED", "ATTENDE_SUBSCRIPTION_INACTIVE"] as const

export const isSubscriptionBlock = (error: { status: number; reference?: string }): boolean =>
  error.status === 402 || (SUBSCRIPTION_BLOCK_REFERENCES as readonly string[]).includes(error.reference ?? "")
