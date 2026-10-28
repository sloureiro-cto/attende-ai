/**
 * Plan refusals of actions the app sends straight to JSYNQ (connect a channel, send a message). Those actions answer
 * `{ success: false, error: string }`, so `attendePlanCheck` puts a stable marker in `error` instead of the API's English
 * sentence, and the UI turns it into its own translated message. Safe to import from client code.
 */
export type PlanBlockKind = "quota" | "inactive" | "unavailable"

const PREFIX = "ATTENDE_PLAN_BLOCK:"
const INACTIVE = ["ATTENDE_TRIAL_EXPIRED", "ATTENDE_SUBSCRIPTION_INACTIVE", "ATTENDE_NOT_ENTITLED"]

/** The marker for a refused plan check: a limit reached, a plan that is not active, or the check could not answer. */
export function planBlockMessage(status: number, reference?: string): string {
  if (reference === "ATTENDE_QUOTA_EXCEEDED" || reference === "ATTENDE_TRIAL_OUTBOUND_CAP") return `${PREFIX}quota`
  if (status === 402 || INACTIVE.includes(reference ?? "")) return `${PREFIX}inactive`
  return `${PREFIX}unavailable`
}

/** The kind of plan refusal an action error carries, or null when it is another error. */
export function planBlockKind(error: string | null | undefined): PlanBlockKind | null {
  if (!error?.startsWith(PREFIX)) return null
  const kind = error.slice(PREFIX.length)
  return kind === "quota" || kind === "inactive" || kind === "unavailable" ? kind : null
}
