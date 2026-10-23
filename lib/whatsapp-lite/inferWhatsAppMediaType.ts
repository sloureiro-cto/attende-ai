/**
 * Categorias para `mediaType` em multipart (inferidas pelo MIME).
 * **Sticker** não é inferido por `image/webp` — o cliente envia `mediaType: sticker` só quando o utilizador escolhe “enviar como sticker”.
 */
export type WhatsAppMediaCategory = "image" | "video" | "audio" | "document"

export function inferWhatsAppMediaType(mime: string): WhatsAppMediaCategory {
  const m = (mime || "").toLowerCase()
  if (m.startsWith("image/")) return "image"
  if (m.startsWith("video/")) return "video"
  if (m.startsWith("audio/")) return "audio"
  return "document"
}
