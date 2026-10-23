export const MESSAGES_SETTINGS_INDEX_HREF = "/settings/workspace/messages" as const

export const MESSAGES_SETTINGS_HREF = {
  whatsapp: "/settings/workspace/messages/whatsapp",
  instagram: "/settings/workspace/messages/instagram",
  sms: "/settings/workspace/messages/sms",
  shortcuts: "/settings/workspace/messages/shortcuts",
  automations: "/settings/workspace/messages/automations",
} as const

/** Voice calls live in their own settings tab (not under Messages). */
export const VOICE_CALLS_SETTINGS_HREF = "/settings/workspace/voice-calls" as const

export const MESSAGES_SETTINGS_DEFAULT_HREF = MESSAGES_SETTINGS_HREF.whatsapp

export const MESSAGES_SETTINGS_OLD_TO_NEW: Record<string, string> = {
  "/settings/workspace/whatsapp-lite": MESSAGES_SETTINGS_HREF.whatsapp,
  "/settings/workspace/instagram": MESSAGES_SETTINGS_HREF.instagram,
  "/settings/workspace/sms": MESSAGES_SETTINGS_HREF.sms,
  "/settings/workspace/messaging-shortcuts": MESSAGES_SETTINGS_HREF.shortcuts,
  "/settings/workspace/messages/calls": VOICE_CALLS_SETTINGS_HREF,
}

export function resolveMessagesSettingsRedirect(pathname: string): string | null {
  return MESSAGES_SETTINGS_OLD_TO_NEW[pathname] ?? null
}
