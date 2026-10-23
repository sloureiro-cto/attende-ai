/** Shared vocabulary of the automations API: channels, status and per-channel account bindings. */

export const AUTOMATION_CHANNELS = ["whatsapp", "instagram", "sms"] as const
export type AutomationChannel = (typeof AUTOMATION_CHANNELS)[number]
export type AutomationStatus = "active" | "paused"

export type AutomationChannelBinding = {
  channel: AutomationChannel
  enabledSessionIds: string[]
}
