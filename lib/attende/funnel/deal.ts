/**
 * Deal details for the funnel drawer: contact edits, checklist (child cards) and comments. Pure helpers, shared by the
 * server actions (validation, mapping of the platform's card / comment shapes) and the UI.
 */
import type { FunnelRow } from "./types"

/** Where a deal lives. All three ids are checked as ObjectIds before any request. */
export type DealRef = { projectId: string; boardId: string; cardId: string }

/** A checklist item is a child card of the deal (`parent`), same as the CRM card checklist. */
export type ChecklistItem = { id: string; title: string; done: boolean }

export type DealComment = { id: string; text: string; authorName: string; authorAvatar: string | null; createdAt: string | null; mine: boolean }

export type ContactDraft = { name: string; phone: string; email: string }
export type ContactField = keyof ContactDraft

/** `value: 0` clears the estimated value; `ownerId: null` unassigns. */
export type DealPatch = { value?: number; ownerId?: string | null; labelIds?: string[] }

export const LIMITS = { checklistTitle: 200, comment: 4000, name: 200, phone: 60, email: 200, labels: 20, maxValue: 1_000_000_000_000 } as const

/** Comments come back 5 per page from the platform (`GET .../comments?page=`). */
export const COMMENTS_PAGE_SIZE = 5

const ID_RE = /^[a-f0-9]{24}$/i
export const isId = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v)
export const isDealRef = (ref: DealRef | null | undefined): ref is DealRef => !!ref && isId(ref.projectId) && isId(ref.boardId) && isId(ref.cardId)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9()\-.\s]{6,}$/

export type ContactValidation = { ok: true; value: ContactDraft } | { ok: false; field: ContactField }

/** Name is required; phone and e-mail may be blank (cleared) but must look right when filled. */
export function validateContactDraft(draft: ContactDraft): ContactValidation {
  const value = { name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim().toLowerCase() }
  if (!value.name || value.name.length > LIMITS.name) return { ok: false, field: "name" }
  if (value.phone && (value.phone.length > LIMITS.phone || !PHONE_RE.test(value.phone) || value.phone.replace(/\D/g, "").length < 6)) return { ok: false, field: "phone" }
  if (value.email && (value.email.length > LIMITS.email || !EMAIL_RE.test(value.email))) return { ok: false, field: "email" }
  return { ok: true, value }
}

/**
 * Money typed by a person, in any of the usual formats ("1234.5", "1.234,50", "1,234.50", "R$ 99"). Blank means
 * "clear" (0). Returns `null` when it cannot be read.
 */
export function parseMoneyInput(raw: string): number | null {
  const text = raw.replace(/[^\d.,-]/g, "")
  if (text === "") return raw.trim() === "" ? 0 : null
  if (text.includes("-")) return null
  const lastDot = text.lastIndexOf(".")
  const lastComma = text.lastIndexOf(",")
  let normalized: string
  if (lastDot >= 0 && lastComma >= 0) {
    // Both: the last one is the decimal separator.
    const decimal = lastDot > lastComma ? "." : ","
    const thousands = decimal === "." ? "," : "."
    normalized = text.split(thousands).join("").replace(decimal, ".")
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : "."
    const parts = text.split(sep)
    // "1,234" / "1.234.567" are thousands; "12,5" / "12.50" are decimals.
    const tail = parts[parts.length - 1] ?? ""
    const head = parts[0] ?? ""
    normalized = parts.length > 2 || (tail.length === 3 && head !== "" && head !== "0") ? parts.join("") : parts.join(".")
  } else {
    normalized = text
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Math.round(Number(normalized) * 100) / 100
  return Number.isFinite(value) && value <= LIMITS.maxValue ? value : null
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)

/** Card comments are rich text (HTML) in the platform: plain text goes in as escaped paragraphs. */
export function commentToHtml(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " }

/** Rich text from the platform shown as plain text (never injected as HTML). */
export function commentFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const idOf = (v: unknown): string => {
  if (typeof v === "string") return v
  if (v && typeof v === "object") {
    const o = v as { _id?: unknown; id?: unknown }
    if (o._id != null) return String(o._id)
    if (o.id != null) return String(o.id)
    return String(v)
  }
  return v == null ? "" : String(v)
}

type RawCard = { _id?: unknown; title?: unknown; completed?: unknown; parent?: unknown; deleted?: unknown; subtaskHierarchyOrder?: unknown; createdAt?: unknown }

/** Direct, non-deleted children of the deal, in the order the CRM shows them. */
export function toChecklistItems(cards: unknown, parentId: string): ChecklistItem[] {
  if (!Array.isArray(cards)) return []
  return (cards as RawCard[])
    .filter((c) => c && !c.deleted && idOf(c.parent) === parentId && isId(idOf(c._id)))
    .map((c, i) => ({ c, i, order: Number(c.subtaskHierarchyOrder) }))
    .sort((a, b) => (Number.isFinite(a.order) ? a.order : a.i) - (Number.isFinite(b.order) ? b.order : b.i) || a.i - b.i)
    .map(({ c }) => toChecklistItem(c))
}

export const toChecklistItem = (c: RawCard): ChecklistItem => ({ id: idOf(c._id), title: typeof c.title === "string" ? c.title : "", done: c.completed === true })

type RawComment = { _id?: unknown; text?: unknown; author?: unknown; createdAt?: unknown }

export function toDealComment(raw: RawComment, userId: string | null, fallbackName = ""): DealComment {
  const author = raw.author && typeof raw.author === "object" ? (raw.author as { name?: unknown; image?: unknown; avatarUrl?: unknown }) : null
  const authorId = idOf(raw.author)
  const avatar = typeof author?.avatarUrl === "string" && author.avatarUrl ? author.avatarUrl : typeof author?.image === "string" && author.image ? author.image : null
  return {
    id: idOf(raw._id),
    text: commentFromHtml(typeof raw.text === "string" ? raw.text : ""),
    authorName: typeof author?.name === "string" && author.name.trim() ? author.name.trim() : fallbackName,
    authorAvatar: avatar,
    createdAt: raw.createdAt ? String(raw.createdAt) : null,
    mine: !!userId && authorId === userId,
  }
}

/** Ids of a card's assignees (populated or not); the first one is the funnel's "owner". */
export const assigneeIds = (assigned: unknown): string[] => (Array.isArray(assigned) ? assigned.map(idOf).filter(isId) : [])

/** New assignee list with `ownerId` first (kept once); `null` drops the current owner and keeps the rest. */
export function withOwner(current: string[], ownerId: string | null): string[] {
  if (ownerId === null) return current.slice(1)
  return [ownerId, ...current.filter((id) => id !== ownerId)]
}

/** The row after a contact edit (every deal of that contact shows the new name / e-mail / phone). */
export function patchRowsContact(rows: FunnelRow[], contactId: string, draft: ContactDraft, keepPhone: boolean): FunnelRow[] {
  let changed = false
  const next = rows.map((r) => {
    if (r.contact?.id !== contactId) return r
    changed = true
    return { ...r, contact: { ...r.contact, name: draft.name, email: draft.email || null, phone: keepPhone ? r.contact.phone : draft.phone || null } }
  })
  return changed ? next : rows
}
