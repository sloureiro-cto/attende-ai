import type { PartialBlock } from "@blocknote/core"
import { sanitizeBlockNoteBlocks } from "./sanitizeBlockNoteInlineContent"

function plainTextBlocks(text: string): PartialBlock[] {
  return [
    {
      type: "paragraph",
      content: [{ type: "text", text, styles: {} }],
    },
  ]
}

/** BlockNote stores JSON arrays. Legacy/integration descriptions are plain text (e.g. "Auto-created by…"). */
export function parseBlockNoteInitialContent(value: string | undefined | null): PartialBlock[] | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const looksLikeJson = trimmed.startsWith("[") || trimmed.startsWith("{")
  if (!looksLikeJson) {
    return plainTextBlocks(value)
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return sanitizeBlockNoteBlocks(parsed as PartialBlock[])
    }
    if (typeof parsed === "string" && parsed.trim()) {
      return plainTextBlocks(parsed)
    }
    return undefined
  } catch {
    return plainTextBlocks(value)
  }
}

const LIST_ENVELOPE_KEYS = ["fieldDefinitions", "layouts", "data", "items"] as const

/** Arrays, or `{ layouts | fieldDefinitions | data | items: T[] }` from FetchClient / server actions. */
export function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    for (const key of LIST_ENVELOPE_KEYS) {
      const inner = (value as Record<string, unknown>)[key]
      if (Array.isArray(inner)) return inner as T[]
    }
  }
  return []
}

/** Select/multiselect `options` from CRM imports may be a map, `{value}` rows, or a single string. */
export function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object") {
          if ("value" in item && (item as { value: unknown }).value != null) {
            return String((item as { value: unknown }).value)
          }
          if ("label" in item && (item as { label: unknown }).label != null) {
            return String((item as { label: unknown }).label)
          }
        }
        return item == null ? "" : String(item)
      })
      .filter(Boolean)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((item) => (item == null ? "" : String(item)))
      .filter(Boolean)
  }
  return []
}
