export type CloudApiCredentialsFormValue = {
  wabaId: string
  phoneNumberId: string
  accessToken: string
  pin: string
}

export function emptyCloudApiCredentials(): CloudApiCredentialsFormValue {
  return {
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    pin: "",
  }
}

export function cloudApiCredentialsFromSession(session: {
  cloudApiConfig?: { wabaId?: string; phoneNumberId?: string } | null
}): CloudApiCredentialsFormValue {
  return {
    wabaId: session.cloudApiConfig?.wabaId?.trim() ?? "",
    phoneNumberId: session.cloudApiConfig?.phoneNumberId?.trim() ?? "",
    accessToken: "",
    pin: "",
  }
}

export function isCloudApiCredentialsValid(
  value: CloudApiCredentialsFormValue,
  options?: { pinRequired?: boolean }
): boolean {
  const pin = value.pin.trim()
  const pinOk =
    options?.pinRequired === false
      ? pin.length === 0 || /^\d{6}$/.test(pin)
      : /^\d{6}$/.test(pin)
  return (
    value.wabaId.trim().length > 0 &&
    value.phoneNumberId.trim().length > 0 &&
    value.accessToken.trim().length > 0 &&
    pinOk
  )
}

export function readCloudApiPinRequired(details: unknown): { pendingId?: string } | null {
  if (!details || typeof details !== "object") return null
  const record = details as { reason?: unknown; pendingId?: unknown }
  if (record.reason !== "cloud_api_pin_required") return null
  const pendingId = typeof record.pendingId === "string" ? record.pendingId.trim() : ""
  return pendingId ? { pendingId } : {}
}

export function sanitizeCloudApiPinInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6)
}

export type CloudApiRegistrationMeta = {
  skippedAlreadyRegistered?: boolean
}

export function pickCloudApiRegistrationMeta(body: unknown): CloudApiRegistrationMeta {
  if (body == null || typeof body !== "object" || !("meta" in body)) {
    return {}
  }
  const meta = (body as { meta?: Record<string, unknown> }).meta
  const reg = meta?.cloudApiRegistration
  if (!reg || typeof reg !== "object") return {}
  return {
    skippedAlreadyRegistered:
      "skippedAlreadyRegistered" in reg
        ? Boolean((reg as { skippedAlreadyRegistered?: unknown }).skippedAlreadyRegistered)
        : undefined,
  }
}
