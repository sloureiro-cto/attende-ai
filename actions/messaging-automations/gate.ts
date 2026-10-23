import { isBotsEnabled } from "lib/automations/server/botsEnabled"
import type { ActionErr } from "./result"

/** Not a "use server" file on purpose: server actions call it as a plain helper. */
export const BOTS_DISABLED_MESSAGE = "This feature is not enabled for this workspace"

/** `null` when the `bots` gate is on, otherwise the error result every action must return. */
export async function botsGate(): Promise<ActionErr | null> {
  return (await isBotsEnabled()) ? null : { success: false, error: BOTS_DISABLED_MESSAGE, status: 404 }
}
