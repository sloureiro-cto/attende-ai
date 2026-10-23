/** Legacy default stored in DB when no custom avatar was uploaded. */
const LEGACY_AGENT_ICON_PLACEHOLDERS = new Set(["bot"])

/**
 * Agent `icon` in config can be an S3/HTTPS URL, data URL, or a short emoji / label.
 * next/image only works for remote or static patterns; never pass non-URLs to Image.
 */
export function isAgentIconImageUrl(icon: string | undefined | null): boolean {
  if (icon == null || typeof icon !== "string") return false
  const s = icon.trim()
  if (!s) return false
  if (s.startsWith("https://") || s.startsWith("http://")) return true
  if (s.startsWith("data:image/")) return true
  if (s.startsWith("blob:")) return true
  return false
}

/** True when `icon` is the legacy sentinel (not a user-facing label). */
export function isLegacyAgentIconPlaceholder(icon: string | undefined | null): boolean {
  if (icon == null || typeof icon !== "string") return false
  return LEGACY_AGENT_ICON_PLACEHOLDERS.has(icon.trim().toLowerCase())
}

/** Strip legacy placeholders; pass through URLs, blob previews, and emoji icons. */
export function resolveAgentIconForDisplay(icon: string | undefined | null): string | undefined {
  const s = icon?.trim() ?? ""
  if (!s || isLegacyAgentIconPlaceholder(s)) return undefined
  return s
}
