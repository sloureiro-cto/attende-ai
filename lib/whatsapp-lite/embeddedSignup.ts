export const FACEBOOK_EMBEDDED_SIGNUP_ORIGIN = "https://www.facebook.com"

export const DEFAULT_META_APP_ID = "4254039094845736"
export const DEFAULT_META_EMBEDDED_SIGNUP_CONFIG_ID = "1337023271628585"
export const DEFAULT_META_SDK_VERSION = "v26.0"

export function getMetaEmbeddedSignupPublicConfig(): {
  appId: string
  configId: string
  sdkVersion: string
} {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID?.trim() || DEFAULT_META_APP_ID,
    configId: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || DEFAULT_META_EMBEDDED_SIGNUP_CONFIG_ID,
    sdkVersion: process.env.NEXT_PUBLIC_META_SDK_VERSION?.trim() || DEFAULT_META_SDK_VERSION,
  }
}

export function shouldOfferWhatsAppEmbeddedSignup(input: {
  gateEnabled: boolean
  hasWorkspaceMetaOverride: boolean
}): boolean {
  return input.gateEnabled && !input.hasWorkspaceMetaOverride
}

export function isFacebookEmbeddedSignupOrigin(origin: string): boolean {
  return origin === FACEBOOK_EMBEDDED_SIGNUP_ORIGIN
}

export type WaEmbeddedSignupSessionInfo = {
  event: string
  wabaId?: string
  phoneNumberId?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function readId(record: Record<string, unknown> | null, ...keys: string[]): string | undefined {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

export function parseWaEmbeddedSignupSessionInfo(raw: unknown): WaEmbeddedSignupSessionInfo | null {
  let payload: unknown = raw
  if (typeof raw === "string") {
    try {
      payload = JSON.parse(raw)
    } catch {
      return null
    }
  }
  const root = asRecord(payload)
  if (!root || root.type !== "WA_EMBEDDED_SIGNUP") return null
  const data = asRecord(root.data)
  const event = typeof root.event === "string" ? root.event : ""
  return {
    event,
    wabaId: readId(data, "waba_id", "wabaId") ?? readId(root, "waba_id", "wabaId"),
    phoneNumberId: readId(data, "phone_number_id", "phoneNumberId") ?? readId(root, "phone_number_id", "phoneNumberId"),
  }
}

/** Meta custom flow for WhatsApp Business App + Cloud API (coexistence). */
export const WHATSAPP_EMBEDDED_SIGNUP_COEXISTENCE_FEATURE_TYPE =
  "whatsapp_business_app_onboarding" as const

export function buildWhatsAppEmbeddedSignupExtras(input: {
  workspaceName: string
  email?: string
}): Record<string, unknown> {
  const name = input.workspaceName.trim() || "JSYNQ Workspace"
  const email = input.email?.trim()
  return {
    version: "v4",
    sessionInfoVersion: "3",
    featureType: WHATSAPP_EMBEDDED_SIGNUP_COEXISTENCE_FEATURE_TYPE,
    setup: {
      business: {
        name,
        ...(email ? { email } : {}),
        website: "https://jsynq.com/",
      },
      phone: {
        displayName: name,
        category: null,
        description: "",
      },
    },
  }
}
