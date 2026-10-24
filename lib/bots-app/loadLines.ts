import { listAttendeAgentsAction } from "actions/attende/agents"
import { listInstagramSessionsAction } from "actions/instagram-lite/sessions"
import { listAdvancedAutomationsAction } from "actions/messaging-automations/advancedAutomations"
import { listSmsSessionsAction } from "actions/sms-lite/sessions"
import { listWhatsAppSessionsAction } from "actions/whatsapp-lite"
import type { AutomationChannel } from "lib/automations/types"
import {
  attachAgents,
  attachBots,
  type BotsLine,
  type LinesLoadResult,
  mapInstagramSession,
  mapSmsSession,
  mapWhatsAppSession,
  sortLines,
} from "./lines"

/** The automation list is capped by the API; lines are few, so one page of automations is enough in practice. */
const BOTS_PAGE_LIMIT = 100

type Options = {
  /** Skip the automation and AI agent joins (the side-menu alert and the pickers only need connection health). */
  withBots?: boolean
}

/** Never let a failing join (agents not enabled, backend error) take the channel list down with it. */
const settle = async <T,>(promise: Promise<T>): Promise<T | null> => {
  try {
    return await promise
  } catch {
    return null
  }
}

/**
 * Loads the workspace's channels (WhatsApp, Instagram, SMS) in parallel with the automations and AI agents that run
 * on them. Reuses the same server actions as the main app, so access rules (ACL, plan, private lines) are exactly
 * the ones the backend already enforces for this user. Each source fails independently.
 */
export async function loadLines({ withBots = true }: Options = {}): Promise<LinesLoadResult> {
  const [wa, ig, sms, bots, agents] = await Promise.all([
    listWhatsAppSessionsAction(),
    listInstagramSessionsAction(),
    listSmsSessionsAction(),
    withBots ? settle(listAdvancedAutomationsAction({ limit: BOTS_PAGE_LIMIT })) : Promise.resolve(null),
    withBots ? settle(listAttendeAgentsAction()) : Promise.resolve(null),
  ])

  const failedChannels: AutomationChannel[] = []
  let lines: BotsLine[] = []
  if (wa.success) lines.push(...wa.data.map(mapWhatsAppSession))
  else failedChannels.push("whatsapp")
  if (ig.success) lines.push(...ig.data.map(mapInstagramSession))
  else failedChannels.push("instagram")
  if (sms.success) lines.push(...sms.data.map(mapSmsSession))
  else failedChannels.push("sms")

  const botList = bots && bots.success ? bots.data : null
  if (botList) lines = attachBots(lines, botList.items)
  const agentList = agents && agents.success ? agents.data : null
  if (agentList) lines = attachAgents(lines, agentList)

  return {
    lines: sortLines(lines),
    failedChannels,
    botsUnavailable: withBots && !botList,
    botsTruncated: !!botList && botList.total > botList.items.length,
    agentsUnavailable: !agentList,
  }
}
