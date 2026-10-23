import type { AgentStatus } from "lib/attende/agents/types"
import type { AutomationChannel } from "lib/automations/types"
import type { BotsLineChoiceDelivery, BotsLineStatus, BotsLineTransport } from "lib/bots-app/lines"
import type { BotsAppTranslationKey } from "lib/i18n/translations/botsApp"
import { MESSAGES_SETTINGS_HREF } from "lib/settings/messagesSettingsRoutes"
import { BOTS_BRAND, BOTS_ROUTES } from "../brand"

/** Presentation tables of the Channels feature (route /lines) (labels as i18n keys, tones as Tailwind classes). */

export const LINE_STATE_KEY: Record<BotsLineStatus, BotsAppTranslationKey> = {
  connected: "lineStateConnected",
  reconnecting: "lineStateReconnecting",
  qr_pending: "lineStateQrPending",
  disconnected: "lineStateDisconnected",
  error: "lineStateError",
  pending_setup: "lineStatePendingSetup",
  disabled: "lineStateDisabled",
}

/**
 * Badge tones. Text/background pairs hold 4.5:1 in light and dark (the warning tint is softened in light
 * mode for that), and a ring keeps the badge visible on any surface. The dot repeats the hue only.
 */
export const LINE_STATE_TONE: Record<BotsLineStatus, { chip: string; dot: string }> = {
  connected: { chip: "bg-primary-clean text-primary-darkest ring-primary-lighter", dot: "bg-primary-dark" },
  reconnecting: { chip: "bg-info-clean text-info-darkest ring-info-lighter", dot: "bg-info" },
  qr_pending: { chip: "bg-info-clean text-info-darkest ring-info-lighter", dot: "bg-info" },
  disconnected: { chip: "bg-warning-clean/50 text-warning-darkest ring-warning-lighter", dot: "bg-warning" },
  error: { chip: "bg-error-clean text-error-darkest ring-error-lighter", dot: "bg-error" },
  pending_setup: { chip: "bg-neutral-10 text-neutral-700 ring-neutral-100", dot: "bg-neutral-300" },
  disabled: { chip: "bg-neutral-10 text-neutral-600 ring-neutral-50", dot: "bg-neutral-200" },
}

/** What each connection state means for messages, in one sentence (never claims more than the API tells). */
export const LINE_IMPACT_KEY: Record<BotsLineStatus, BotsAppTranslationKey> = {
  connected: "lineImpactConnected",
  reconnecting: "lineImpactReconnecting",
  qr_pending: "lineImpactQrPending",
  disconnected: "lineImpactDisconnected",
  error: "lineImpactError",
  pending_setup: "lineImpactPendingSetup",
  disabled: "lineImpactDisabled",
}

export const LINE_TRANSPORT_KEY: Record<BotsLineTransport, BotsAppTranslationKey> = {
  whatsapp_qr: "lineTransportWhatsappQr",
  whatsapp_cloud: "lineTransportWhatsappCloud",
  instagram: "lineTransportInstagram",
  sms: "lineTransportSms",
}

export const LINE_DELIVERY_KEY: Record<BotsLineChoiceDelivery, BotsAppTranslationKey> = {
  buttons: "lineDeliveryButtons",
  text_menu: "lineDeliveryTextMenu",
  quick_replies: "lineDeliveryQuickReplies",
}

export const LINE_CHANNEL_KEY: Record<AutomationChannel, BotsAppTranslationKey> = {
  whatsapp: "linesChannelWhatsapp",
  instagram: "linesChannelInstagram",
  sms: "linesChannelSms",
}

export const LINE_BOT_STATUS_KEY = {
  active: "lineBotActive",
  paused: "lineBotPaused",
  draft: "lineBotDraft",
} as const satisfies Record<string, BotsAppTranslationKey>

/** AI agent state on a channel: the binding answers only when the agent is live and the binding active. */
export function lineAgentStateKey(agent: { status: AgentStatus; active: boolean }): BotsAppTranslationKey {
  if (agent.status === "draft") return "lineAgentDraft"
  return agent.active ? "lineAgentActive" : "lineAgentPaused"
}

/** Where this channel's lines are managed in the main JSYNQ app (connect, reconnect, credentials). */
export function jsynqLinesUrl(channel: AutomationChannel): string {
  return `${BOTS_BRAND.jsynqUrl.replace(/\/$/, "")}${MESSAGES_SETTINGS_HREF[channel]}`
}

/**
 * Deep link to one channel on /lines/<channel>: `?line=` opens its details, `&reconnect=1` also starts the reconnect
 * flow (WhatsApp QR). Used by the side-menu alert so it can point at the exact channel.
 */
export function lineHref(line: { channel: AutomationChannel; id: string }, options: { reconnect?: boolean } = {}): string {
  const params = new URLSearchParams({ line: `${line.channel}:${line.id}` })
  if (options.reconnect) params.set("reconnect", "1")
  return `${BOTS_ROUTES.lines}/${line.channel}?${params.toString()}`
}
