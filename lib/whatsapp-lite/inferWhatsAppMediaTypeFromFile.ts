import { inferWhatsAppMediaType, type WhatsAppMediaCategory } from "./inferWhatsAppMediaType"

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  "3gp": "video/3gpp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
  pdf: "application/pdf",
}

function extensionFromFileName(fileName: string): string | undefined {
  const base = fileName.trim()
  if (!base.includes(".")) return undefined
  return base.split(".").pop()?.toLowerCase()
}

/** Resolve MIME from browser File (type can be empty for some video/image picks). */
export function resolveWhatsAppFileMime(file: File): string {
  const fromType = (file.type || "").trim()
  if (fromType && fromType !== "application/octet-stream") return fromType
  const ext = extensionFromFileName(file.name || "")
  const mappedMime = ext ? EXT_TO_MIME[ext] : undefined
  if (mappedMime) return mappedMime
  return fromType || "application/octet-stream"
}

/** Infer WhatsApp media category from a File (MIME + extension fallback). */
export function inferWhatsAppMediaTypeFromFile(file: File): WhatsAppMediaCategory {
  return inferWhatsAppMediaType(resolveWhatsAppFileMime(file))
}

export const MAX_WHATSAPP_INBOX_ATTACHMENTS = 10

export { WHATSAPP_VIDEO_MESSAGE_MAX_BYTES as CLOUD_API_VIDEO_MAX_BYTES } from "@/lib/whatsapp-lite/whatsappMediaLimits"
