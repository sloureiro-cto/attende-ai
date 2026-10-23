/**
 * Attachments of a deal (the CRM card's `card_attachment` links). Pure helpers shared by the server actions and the
 * drawer section: mapping of the platform's attachment shape, the upload rules, and the file links.
 *
 * Files a lead sends or receives on WhatsApp are synced into these same links by the backend
 * (`WhatsAppLinkedLeadAttachmentService`). The attachment list does not say where a file came from (the link has no
 * source field), so the UI does not tell them apart.
 */
import { BLOCKED_EXTENSIONS } from "lib/attachments/fileValidation"

export type DealAttachment = {
  /** Attachment link id (what `DELETE /attachments/:id` takes). */
  id: string
  /** The library document behind it; `null` when the link has none. */
  documentId: string | null
  name: string
  contentType: string | null
  /** Bytes; `null` when unknown (WhatsApp files are stored with size 0, which means "not measured", not empty). */
  size: number | null
  createdAt: string | null
  /** `file`: an uploaded file (can be opened / downloaded). `document`: a library text document. */
  kind: "file" | "document"
}

/**
 * What an Attende-ai workspace may upload: the backend's Attende upload guard accepts these types only
 * (`attende-abuse/policy.ts`, `UPLOAD_POLICY.allowedMimeTypes`), a subset of the Library's own list.
 */
export const ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "text/csv",
] as const

export const ATTACHMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".md", ".csv"] as const

/** The largest file any Attende-ai plan accepts (paid: 50 MB; a trial is capped lower by the backend). */
export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024

/** `accept` of the file input. */
export const ATTACHMENT_ACCEPT = [...ATTACHMENT_EXTENSIONS, ...ATTACHMENT_MIME_TYPES].join(",")

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}

export type AttachmentRejection = "type" | "size" | "empty"

/** Why a file would be refused before any upload, or `null` when it can go. */
export function attachmentRejection(file: { name: string; type: string; size: number }): AttachmentRejection | null {
  const ext = extensionOf(file.name)
  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) return "type"
  if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes((file.type || "").toLowerCase())) return "type"
  if (file.size <= 0) return "empty"
  if (file.size > ATTACHMENT_MAX_BYTES) return "size"
  return null
}

const ID_RE = /^[a-f0-9]{24}$/i

type RawAttachment = {
  _id?: unknown
  type?: unknown
  documentId?: unknown
  filename?: unknown
  name?: unknown
  contentType?: unknown
  size?: unknown
  createdAt?: unknown
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

export function toDealAttachment(raw: RawAttachment): DealAttachment | null {
  const id = text(raw._id) || String(raw._id ?? "")
  if (!ID_RE.test(id)) return null
  const documentId = text(raw.documentId)
  const size = typeof raw.size === "number" && Number.isFinite(raw.size) && raw.size > 0 ? raw.size : null
  return {
    id,
    documentId: ID_RE.test(documentId) ? documentId : null,
    name: text(raw.filename) || text(raw.name),
    contentType: text(raw.contentType) || null,
    size,
    createdAt: text(raw.createdAt) || null,
    kind: raw.type === "document" ? "document" : "file",
  }
}

/** Both lists of the platform action, newest first, without duplicates or malformed entries. */
export function toDealAttachments(lists: { fileAttachments?: unknown[]; documentAttachments?: unknown[] }): DealAttachment[] {
  const seen = new Set<string>()
  const out: DealAttachment[] = []
  for (const raw of [...(lists.fileAttachments ?? []), ...(lists.documentAttachments ?? [])]) {
    const item = raw && typeof raw === "object" ? toDealAttachment(raw as RawAttachment) : null
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
}

/** The file through the funnel's own route (the bots app exposes no `/api/attachments/*`); access is checked by the API. */
export function attachmentFileHref(documentId: string, download = false): string {
  return `/funnel/attachments/${encodeURIComponent(documentId)}${download ? "?download=1" : ""}`
}

export type AttachmentTypeKey = "attachmentTypePdf" | "attachmentTypeWord" | "attachmentTypeSheet" | "attachmentTypeText" | "attachmentTypeImage" | "attachmentTypeAudio" | "attachmentTypeVideo" | "attachmentTypeDocument" | "attachmentTypeFile"

/** A short, translated kind for the list ("PDF", "Planilha"...), from the MIME type and then the extension. */
export function attachmentTypeKey(a: Pick<DealAttachment, "contentType" | "name" | "kind">): AttachmentTypeKey {
  if (a.kind === "document") return "attachmentTypeDocument"
  const mime = (a.contentType ?? "").toLowerCase()
  const ext = extensionOf(a.name)
  if (mime === "application/pdf" || ext === ".pdf") return "attachmentTypePdf"
  if (mime.includes("word") || ext === ".doc" || ext === ".docx") return "attachmentTypeWord"
  if (mime.includes("excel") || mime.includes("spreadsheet") || mime === "text/csv" || [".xls", ".xlsx", ".csv"].includes(ext)) return "attachmentTypeSheet"
  if (mime.startsWith("image/")) return "attachmentTypeImage"
  if (mime.startsWith("audio/")) return "attachmentTypeAudio"
  if (mime.startsWith("video/")) return "attachmentTypeVideo"
  if (mime.startsWith("text/") || ext === ".txt" || ext === ".md") return "attachmentTypeText"
  return "attachmentTypeFile"
}

/** Types a browser may show inline from our origin. Anything else (HTML, SVG, scripts...) is always a download. */
const INLINE_SAFE = /^(application\/pdf|image\/(png|jpe?g|gif|webp)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|text\/plain)$/i

export const isInlineSafe = (contentType: string | null | undefined): boolean => INLINE_SAFE.test((contentType ?? "").split(";")[0]!.trim())
