import type { IInstagramSession } from "actions/instagram-lite/types"
import type { ISmsSession } from "actions/sms-lite/types"
import type { WhatsAppSession } from "actions/whatsapp-lite/types"
import type { AgentStatus, AgentView } from "lib/attende/agents/types"
import type { AutomationChannel, SalesBotListItem, SalesBotStatus } from "lib/automations/types"

/**
 * Pure model of the "Channels" feature (the route stays `/lines` and the code still says "line"): the three channel
 * session shapes are normalised into one `BotsLine` so the UI (list, drawer, side-menu alert) never branches on
 * channel-specific statuses. Every indicator (page tiles, channel tabs, side-menu alert) counts with the helpers
 * below, so they always agree.
 */

export type BotsLineStatus =
  /** Delivering and receiving. */
  | "connected"
  /** WhatsApp (QR) that was paired before and now waits for a new QR scan to come back. */
  | "reconnecting"
  /** WhatsApp (QR) never paired yet, waiting for the first scan. */
  | "qr_pending"
  /** Was connected, is not now (QR dropped, reconnect required, account disconnected). */
  | "disconnected"
  /** Banned or otherwise unusable without support. */
  | "error"
  /** Created but setup (checkout, credentials) is not finished. */
  | "pending_setup"
  /** Switched off on purpose, or suspended because the workspace lost access to the channel. */
  | "disabled"

/** How a "buttons / list" message actually reaches the contact on this line. Matters to automation authors. */
export type BotsLineChoiceDelivery = "buttons" | "text_menu" | "quick_replies"

export type BotsLineTransport = "whatsapp_qr" | "whatsapp_cloud" | "instagram" | "sms"

/** An automation (sales bot) that lists this line in its channel bindings. */
export type BotsLineBot = { id: string; name: string; status: SalesBotStatus }

/** An AI agent bound to this line. `active` is the binding's own state: the agent answers on this line. */
export type BotsLineAgent = { id: string; name: string; status: AgentStatus; active: boolean }

export type BotsLine = {
  /** Session id. Unique per channel (ids of different channels may theoretically collide, so key on both). */
  id: string
  channel: AutomationChannel
  label: string
  /** Phone number, @username or sender number: what the contact sees. */
  identifier: string | null
  transport: BotsLineTransport
  status: BotsLineStatus
  /** The provider status as sent by the backend, for the detail drawer (never shown as the main state). */
  rawStatus: string
  /** ISO date of the last notable event: the disconnect when disconnected, else the last update. */
  lastEventAt: string | null
  lastEventKind: "disconnected" | "updated" | null
  choiceDelivery: BotsLineChoiceDelivery
  /** Automations that include this line in their channel bindings. Filled by `attachBots`. */
  bots: BotsLineBot[]
  /** AI agents bound to this line. Filled by `attachAgents`; absent when agents were not loaded. */
  agents?: BotsLineAgent[]
}

const asIso = (value?: string | null) => (value && !Number.isNaN(Date.parse(value)) ? value : null)

/** Fields the session list returns (the whole document) that the shared WhatsApp type does not declare. */
type WhatsAppSessionExtra = { lastConnectedAt?: string | null; entitlementSuspendedAt?: string | null }

export function mapWhatsAppSession(s: WhatsAppSession): BotsLine {
  const extra = s as WhatsAppSession & WhatsAppSessionExtra
  const cloud = s.transport === "cloud_api"
  // A QR session that had a number or a connection before is coming back, not being set up for the first time.
  const pairedBefore = !!s.phoneNumber?.trim() || !!asIso(extra.lastConnectedAt)
  const status: BotsLineStatus = extra.entitlementSuspendedAt
    ? "disabled"
    : s.status === "connected"
      ? "connected"
      : s.status === "qr_pending"
        ? pairedBefore
          ? "reconnecting"
          : "qr_pending"
        : s.status === "banned"
          ? "error"
          : "disconnected"
  const disconnectedAt = status === "disconnected" || status === "error" || status === "reconnecting" ? asIso(s.lastDisconnectAt) : null
  const lastEventAt = disconnectedAt ?? asIso(s.updatedAt)
  return {
    id: s._id,
    channel: "whatsapp",
    label: s.label,
    identifier: s.phoneNumber?.trim() || null,
    transport: cloud ? "whatsapp_cloud" : "whatsapp_qr",
    status,
    rawStatus: String(s.status),
    lastEventAt,
    lastEventKind: lastEventAt ? (disconnectedAt ? "disconnected" : "updated") : null,
    // Only the official Cloud API can send interactive buttons/lists. QR (Baileys) numbers get a numbered text menu.
    choiceDelivery: cloud ? "buttons" : "text_menu",
    bots: [],
  }
}

export function mapInstagramSession(s: IInstagramSession): BotsLine {
  const status: BotsLineStatus =
    s.status === "active"
      ? s.unipileAccountStatus === "disconnected" || s.unipileAccountStatus === "credentials"
        ? "disconnected"
        : "connected"
      : s.status === "reconnect_required"
        ? "disconnected"
        : s.status === "disabled"
          ? "disabled"
          : "pending_setup"
  return {
    id: s._id,
    channel: "instagram",
    label: s.label,
    identifier: s.instagramUsername ? `@${s.instagramUsername.replace(/^@/, "")}` : null,
    transport: "instagram",
    status,
    rawStatus: s.unipileAccountStatus ? `${s.status} / ${s.unipileAccountStatus}` : String(s.status),
    lastEventAt: asIso(s.updatedAt),
    lastEventKind: asIso(s.updatedAt) ? "updated" : null,
    choiceDelivery: "quick_replies",
    bots: [],
  }
}

export function mapSmsSession(s: ISmsSession): BotsLine {
  const status: BotsLineStatus = s.status === "active" ? "connected" : s.status === "disabled" ? "disabled" : "pending_setup"
  return {
    id: s._id,
    channel: "sms",
    label: s.label,
    identifier: s.fromNumber?.trim() || null,
    transport: "sms",
    status,
    rawStatus: String(s.status),
    lastEventAt: asIso(s.updatedAt),
    lastEventKind: asIso(s.updatedAt) ? "updated" : null,
    choiceDelivery: "text_menu",
    bots: [],
  }
}

/** An automation runs on a line when one of its channel bindings lists that exact session. */
export function attachBots(lines: BotsLine[], bots: SalesBotListItem[]): BotsLine[] {
  return lines.map((line) => {
    const onLine = bots
      .filter((bot) => bot.channels.some((c) => c.channel === line.channel && c.enabledSessionIds.includes(line.id)))
      .map<BotsLineBot>((bot) => ({ id: bot.id, name: bot.name, status: bot.status }))
    return { ...line, bots: onLine }
  })
}

/** An AI agent is on a line when one of its bindings (`lines[]` of the agent view) points at that session. */
export function attachAgents(lines: BotsLine[], agents: Array<Pick<AgentView, "id" | "name" | "status" | "lines">>): BotsLine[] {
  return lines.map((line) => {
    const onLine = agents.flatMap<BotsLineAgent>((agent) => {
      const binding = agent.lines.find((l) => l.channel === line.channel && l.sessionId === line.id)
      return binding ? [{ id: agent.id, name: agent.name, status: agent.status, active: agent.status === "live" && binding.active !== false }] : []
    })
    return { ...line, agents: onLine }
  })
}

/** Turned off on purpose: not a problem, but not working either. */
export const isLineDisabled = (line: Pick<BotsLine, "status">) => line.status === "disabled"

/** Needs attention: it should be working and is not. Disabled lines are intentional and not counted. */
export const isLineOffline = (line: Pick<BotsLine, "status">) => line.status !== "connected" && line.status !== "disabled"

/** A WhatsApp QR line whose pairing can be restarted right here (the existing reconnect + QR flow). */
export const canReconnectHere = (line: Pick<BotsLine, "transport" | "status">) =>
  line.transport === "whatsapp_qr" && (line.status === "disconnected" || line.status === "reconnecting" || line.status === "qr_pending")

/** Offline lines that are fixed in JSYNQ (Instagram re-login, Cloud API credentials): the reconnect is a link there. */
export const reconnectsInJsynq = (line: Pick<BotsLine, "transport" | "status">) => line.status === "disconnected" && line.transport !== "whatsapp_qr"

export const activeBotsOf = (line: BotsLine) => line.bots.filter((b) => b.status === "active")

export type LinesSummary = {
  /** Every channel listed (same base as the "All" tab). */
  total: number
  /** Channels not switched off. */
  enabled: number
  disabled: number
  connected: number
  /** Enabled channels that are not connected. */
  attention: number
  /** Distinct automations with status active on at least one listed channel. `null` = automations not loaded. */
  activeAutomations: number | null
  /** Distinct AI agents answering on at least one listed channel. `null` = agents not loaded. */
  activeAgents: number | null
}

export function summarizeLines(lines: BotsLine[], options: { botsLoaded?: boolean; agentsLoaded?: boolean } = {}): LinesSummary {
  const { botsLoaded = true, agentsLoaded = lines.every((l) => l.agents !== undefined) } = options
  const enabled = lines.filter((l) => !isLineDisabled(l))
  const activeBotIds = new Set(lines.flatMap((l) => activeBotsOf(l).map((b) => b.id)))
  const activeAgentIds = new Set(lines.flatMap((l) => (l.agents ?? []).filter((a) => a.active).map((a) => a.id)))
  return {
    total: lines.length,
    enabled: enabled.length,
    disabled: lines.length - enabled.length,
    connected: enabled.filter((l) => l.status === "connected").length,
    attention: enabled.filter(isLineOffline).length,
    activeAutomations: botsLoaded ? activeBotIds.size : null,
    activeAgents: agentsLoaded ? activeAgentIds.size : null,
  }
}

/** One channel named in the side-menu alert. Labels are user content (shown as is). */
export type LinesPillAffected = { id: string; channel: AutomationChannel; label: string; status: BotsLineStatus; reconnectHere: boolean }

/**
 * What the side-menu card shows. `total` counts every channel (same base as /lines). `affected` is the list of enabled
 * channels that are not connected, one entry per channel (deduplicated), problems first. A failed load shows nothing
 * rather than a false "all good" (the action returns null).
 */
export type LinesPillStatus =
  | { state: "none"; total: number }
  | { state: "ok"; total: number; connected: number }
  | { state: "degraded"; total: number; affected: LinesPillAffected[] }

export function pillStatusOf(lines: BotsLine[]): LinesPillStatus {
  const summary = summarizeLines(lines, { botsLoaded: false, agentsLoaded: false })
  if (summary.enabled === 0) return { state: "none", total: summary.total }
  const seen = new Set<string>()
  const affected: LinesPillAffected[] = []
  for (const line of sortLines(lines.filter(isLineOffline))) {
    const key = `${line.channel}:${line.id}`
    if (seen.has(key)) continue
    seen.add(key)
    affected.push({ id: line.id, channel: line.channel, label: line.label, status: line.status, reconnectHere: canReconnectHere(line) })
  }
  return affected.length === 0 ? { state: "ok", total: summary.total, connected: summary.connected } : { state: "degraded", total: summary.total, affected }
}

export const LINE_CHANNELS: readonly AutomationChannel[] = ["whatsapp", "instagram", "sms"]

export const isLineChannel = (value: string): value is AutomationChannel => (LINE_CHANNELS as readonly string[]).includes(value)

/** `whatsapp:<id>`: the key used in lists and in the `?line=` deep link that opens a channel's details. */
export const lineKeyOf = (line: Pick<BotsLine, "channel" | "id">) => `${line.channel}:${line.id}`

/** Failures are per channel so one broken integration does not blank the whole page. */
export type LinesLoadResult = {
  lines: BotsLine[]
  /** Channels whose session list could not be loaded. */
  failedChannels: AutomationChannel[]
  /** The automation join failed or was cut off: lines are shown without (or with partial) automation info. */
  botsUnavailable: boolean
  botsTruncated: boolean
  /** The AI agent join failed (or was not requested): lines are shown without agent info. */
  agentsUnavailable?: boolean
}

export const LINE_STATUS_ORDER: Record<BotsLineStatus, number> = {
  error: 0,
  disconnected: 1,
  reconnecting: 2,
  qr_pending: 3,
  pending_setup: 4,
  connected: 5,
  disabled: 6,
}

/** Problems first, then by channel and label: the page opens on what needs a hand. */
export function sortLines(lines: BotsLine[]): BotsLine[] {
  return [...lines].sort(
    (a, b) =>
      LINE_STATUS_ORDER[a.status] - LINE_STATUS_ORDER[b.status] ||
      LINE_CHANNELS.indexOf(a.channel) - LINE_CHANNELS.indexOf(b.channel) ||
      a.label.localeCompare(b.label)
  )
}
