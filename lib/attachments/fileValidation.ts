import type { IDocumentFolder } from "context/DocumentFolderContext"

/** Max size for Library / document uploads (browser → backend direct upload). */
export const MAX_UPLOAD_FILE_BYTES = 1 * 1024 * 1024 * 1024 // 1 GB

export const MAX_UPLOAD_FILE_SIZE_LABEL = "1 GB"

export const ALLOWED_FILE_TYPES = [
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/json",
  "application/xml",
] as const

export const BLOCKED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".pif",
  ".scr",
  ".vbs",
  ".js",
  ".jar",
  ".app",
  ".deb",
  ".pkg",
  ".rpm",
  ".msi",
  ".dmg",
  ".sh",
  ".ps1",
  ".py",
  ".rb",
] as const

function getFileExtension(filename: string): string {
  return filename.toLowerCase().substring(filename.lastIndexOf("."))
}

export function isFileAllowed(file: File): boolean {
  const extension = getFileExtension(file.name)
  if (BLOCKED_EXTENSIONS.includes(extension)) return false
  if (ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) return true
  return !BLOCKED_EXTENSIONS.includes(extension)
}

/**
 * Check if a document from the library can be attached to a card/epic.
 * - Folders (type "folder") are not attachable.
 * - Files (type "file") must have mimeType in allowed list and extension not blocked.
 * - Documents (type "document") with mimeType must be in allowed list; without mimeType (rich text) are allowed.
 */
export function isDocumentAllowedForAttachment(doc: IDocumentFolder): boolean {
  if (doc.type === "folder") return false

  const filename = doc.fileName ?? doc.name ?? ""
  const extension = getFileExtension(filename)
  if (BLOCKED_EXTENSIONS.includes(extension as (typeof BLOCKED_EXTENSIONS)[number])) return false

  if (doc.type === "file") {
    if (!doc.mimeType) return false
    return ALLOWED_FILE_TYPES.includes(doc.mimeType as (typeof ALLOWED_FILE_TYPES)[number])
  }
  // type "document" - rich text or document with optional mimeType
  if (doc.mimeType) {
    return ALLOWED_FILE_TYPES.includes(doc.mimeType as (typeof ALLOWED_FILE_TYPES)[number])
  }
  return true
}
