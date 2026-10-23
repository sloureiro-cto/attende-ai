/** Normaliza telefone para pedidos API (só dígitos e prefixo + opcional). */
export function normalizeWhatsAppPhoneInput(raw: string): string {
  const t = raw.trim().replace(/\s/g, "")
  if (!t) return ""
  const hasPlus = t.startsWith("+")
  const digits = t.replace(/\D/g, "")
  if (!digits) return ""
  const normalized = normalizeOutboundPhoneDigits(digits)
  return hasPlus ? `+${normalized}` : normalized
}

/**
 * Adds BR country code (55) to 10/11-digit Brazilian phone numbers
 * that match local mobile/landline patterns.
 */
function normalizeOutboundPhoneDigits(digits: string): string {
  if (!digits) return digits
  if (digits.startsWith("55") && digits.length >= 12) return digits
  if (digits.length === 11 && /^[1-9][1-9]9\d{8}$/.test(digits)) {
    return `55${digits}`
  }
  if (digits.length === 10 && /^[1-9][1-9]\d{8}$/.test(digits)) {
    return `55${digits}`
  }
  return digits
}
