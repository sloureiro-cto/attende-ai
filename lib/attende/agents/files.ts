import { formatNumber } from "lib/attende/format"

/** The backend rejects files over 20 MB; hosting limits may be lower, override with NEXT_PUBLIC_ATTENDE_UPLOAD_MAX_MB. */
export const DEFAULT_MAX_UPLOAD_MB = 20

export function maxUploadBytes(env: string | undefined = process.env.NEXT_PUBLIC_ATTENDE_UPLOAD_MAX_MB): number {
  const mb = Number(env)
  return (Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024
}

/** Types the knowledge pipeline can read. The server stays the judge: this only spares a round trip. */
export const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "txt", "md", "csv", "xls", "xlsx", "ppt", "pptx", "html"] as const

export type FileIssue = "empty" | "size" | "type" | "duplicate"

const extensionOf = (name: string): string => (name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "")

export function validateUpload(file: { name: string; size: number }, existingNames: readonly string[] = [], maxBytes = maxUploadBytes()): FileIssue | null {
  if (file.size <= 0) return "empty"
  if (file.size > maxBytes) return "size"
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) return "type"
  if (existingNames.some((n) => n.toLowerCase() === file.name.toLowerCase())) return "duplicate"
  return null
}

/** "1,5 MB" / "1.5 MB": the number follows the user's language (`english` | `portuguese` | `spanish`). */
export function formatBytes(bytes: number, language = "english"): string {
  if (bytes < 1024) return `${formatNumber(bytes, language)} B`
  if (bytes < 1024 * 1024) return `${formatNumber(Math.round(bytes / 1024), language)} KB`
  const digits = bytes < 10 * 1024 * 1024 ? 1 : 0
  return `${formatNumber(bytes / (1024 * 1024), language, { minimumFractionDigits: digits, maximumFractionDigits: digits })} MB`
}
