import { attendeFetch } from "lib/attende/signup/api"

/** What a plan check can refuse. `outbound` = one more message sent while trialing. */
export type PlanResource = "lines" | "seats" | "agents" | "docs" | "outbound"

export type PlanCheck = { ok: true } | { ok: false; status: number; reference?: string; message: string }

const FALLBACK = "Your Attende-ai plan does not allow this right now."

/**
 * Server-side (server actions only): asks the Attende API whether the signed-in workspace may add `adding` of `resource`
 * before an action the app sends straight to JSYNQ. JSYNQ keeps no Attende limits, so this is where they hold.
 * Fails closed: when the Attende API cannot answer, the action is refused.
 */
export async function attendePlanCheck(resource: PlanResource, adding = 1): Promise<PlanCheck> {
  const result = await attendeFetch<{ allowed: boolean }>("/attende/limits/check", {
    method: "POST",
    body: { resource, adding },
    session: true,
    timeoutMs: 15_000,
  })
  if (result.ok) return { ok: true }
  return { ok: false, status: result.status, reference: result.reference, message: result.message || FALLBACK }
}

/** Counts messages the app sent (monthly meter and the trial cap). Best effort: never throws, never blocks the send. */
export async function attendeRecordOutbound(count = 1): Promise<void> {
  await attendeFetch("/attende/usage/outbound", { method: "POST", body: { count }, session: true, timeoutMs: 5_000 }).catch(() => undefined)
}
