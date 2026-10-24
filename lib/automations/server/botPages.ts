import { notFound } from "next/navigation"
import { getAdvancedAutomationAction } from "actions/messaging-automations/advancedAutomations"
import type { EditorContextData } from "lib/automations/editorContext"
import { AUTOMATION_CHANNELS, type AutomationChannel, type AdvancedAutomationDetail } from "lib/automations/types"
import { requireBotsEnabled } from "./botsEnabled"
import { loadEditorContext } from "./loadEditorContext"

/**
 * Data of the bot builder pages, shared by the JSYNQ studio (`/automation-studio/bots/*`) and the standalone
 * bots app (`/bots/*`): one place for the gate, the parallel fetches and the not-found handling.
 */

export type NewBotPageData = {
  context: EditorContextData
  seed: { channel?: AutomationChannel; template?: "quote" }
}

export type EditBotPageData = { detail: AdvancedAutomationDetail; context: EditorContextData }

/** `?channel=` / `?template=` of the "new bot" page, ignoring anything we do not know. */
export function parseNewBotSeed(searchParams: { channel?: string; template?: string }): NewBotPageData["seed"] {
  const channel = AUTOMATION_CHANNELS.includes(searchParams.channel as AutomationChannel) ? (searchParams.channel as AutomationChannel) : undefined
  const template = searchParams.template === "quote" ? "quote" : undefined
  return { channel, template }
}

export async function loadNewBotPage(searchParams: { channel?: string; template?: string }): Promise<NewBotPageData> {
  // The layout 404s when the gate is off; checking here too keeps the loaders below from running at all.
  await requireBotsEnabled()
  const context = await loadEditorContext()
  return { context, seed: parseNewBotSeed(searchParams) }
}

export async function loadEditBotPage(rawId: string): Promise<EditBotPageData> {
  await requireBotsEnabled()
  // The bot and the workspace context (sessions, projects) load together.
  const [detail, context] = await Promise.all([getAdvancedAutomationAction(decodeURIComponent(rawId)), loadEditorContext()])
  if (!detail.success) {
    if (detail.status === 404) notFound()
    throw new Error(detail.error || "Failed to load")
  }
  return { detail: detail.data, context }
}
