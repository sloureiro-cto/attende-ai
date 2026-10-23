/**
 * Cross-route messaging inbox unread counts (sessionStorage + same-tab CustomEvent).
 * Canonical keys: `whatsapp::<sessionId>::<conversationId>` | `sms::...`
 * Legacy WA-only keys (`<sessionId>::<conversationId>`) are migrated on read.
 *
 * Counts are scoped by user + workspace so switching accounts (same tab) cannot
 * reuse another user's badge. The unscoped legacy key is discarded on scope set.
 */

export type InboxUnreadChannel = "whatsapp" | "sms" | "instagram"

export type InboxUnreadScope = {
  userId?: string | null
  workspaceId?: string | null
}

export const INBOX_UNREAD_STORAGE_KEY = "wa_inbox_unread_by_key_v1"
export const INBOX_UNREAD_EVENT = "wa-inbox-unread"

/** @deprecated Use INBOX_UNREAD_STORAGE_KEY — kept for existing listeners */
export const WA_INBOX_UNREAD_STORAGE_KEY = INBOX_UNREAD_STORAGE_KEY
/** @deprecated Use INBOX_UNREAD_EVENT */
export const WA_INBOX_UNREAD_EVENT = INBOX_UNREAD_EVENT

export function inboxUnreadKey(channel: InboxUnreadChannel, sessionId: string, conversationId: string): string {
  return `${channel}::${sessionId}::${conversationId}`
}

export function inboxUnreadStorageKeyForScope(scope: InboxUnreadScope = {}): string {
  const userId = String(scope.userId || "").trim() || "_"
  const workspaceId = String(scope.workspaceId || "").trim() || "_"
  return `${INBOX_UNREAD_STORAGE_KEY}::${userId}::${workspaceId}`
}

let activeStorageKey = inboxUnreadStorageKeyForScope()

export function getActiveInboxUnreadStorageKey(): string {
  return activeStorageKey
}

export function isInboxUnreadStorageEventKey(key: string | null): boolean {
  if (key === null) return true
  return key === INBOX_UNREAD_STORAGE_KEY || key.startsWith(`${INBOX_UNREAD_STORAGE_KEY}::`)
}

function discardLegacyUnscopedUnread(): void {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.removeItem(INBOX_UNREAD_STORAGE_KEY)
  } catch {
    // ignore
  }
}

function emitInboxUnreadEvent(): void {
  try {
    window.dispatchEvent(new CustomEvent(INBOX_UNREAD_EVENT))
  } catch {
    // ignore
  }
}

/** Bind reads/writes to the signed-in user + workspace. Returns true when the key changed. */
export function setInboxUnreadScope(scope: InboxUnreadScope): boolean {
  const next = inboxUnreadStorageKeyForScope(scope)
  discardLegacyUnscopedUnread()
  if (next === activeStorageKey) return false
  activeStorageKey = next
  emitInboxUnreadEvent()
  return true
}

export function clearInboxUnreadMap(): void {
  writeInboxUnreadMap({})
}

/** Drop every scoped + legacy unread blob in this tab (logout / account switch). */
export function clearInboxUnreadOnLogout(): void {
  if (typeof sessionStorage !== "undefined") {
    const toRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i)
      if (key && (key === INBOX_UNREAD_STORAGE_KEY || key.startsWith(`${INBOX_UNREAD_STORAGE_KEY}::`))) {
        toRemove.push(key)
      }
    }
    for (const key of toRemove) {
      try {
        sessionStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
  }
  setInboxUnreadScope({})
  emitInboxUnreadEvent()
}

/** Legacy WhatsApp-only inbox key (migrated to canonical on read). */
export function legacyWaInboxKey(sessionId: string, conversationId: string): string {
  return `${sessionId}::${conversationId}`
}

function isCanonicalInboxUnreadKey(key: string): boolean {
  return key.startsWith("whatsapp::") || key.startsWith("sms::") || key.startsWith("instagram::")
}

/** Maps legacy `sessionId::conversationId` → `whatsapp::sessionId::conversationId`. */
export function migrateInboxUnreadKey(key: string): string {
  if (isCanonicalInboxUnreadKey(key)) return key
  const sep = key.indexOf("::")
  if (sep <= 0) return key
  const sessionId = key.slice(0, sep)
  const conversationId = key.slice(sep + 2)
  if (!sessionId || !conversationId) return key
  return inboxUnreadKey("whatsapp", sessionId, conversationId)
}

function normalizeUnreadMap(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    const n = typeof v === "number" ? v : Number(v)
    if (!Number.isFinite(n) || n <= 0) continue
    const mk = migrateInboxUnreadKey(k)
    out[mk] = (out[mk] ?? 0) + Math.floor(n)
  }
  return out
}

export function readInboxUnreadMap(): Record<string, number> {
  if (typeof sessionStorage === "undefined") return {}
  try {
    const raw = sessionStorage.getItem(activeStorageKey)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== "object" || Array.isArray(o)) return {}
    return normalizeUnreadMap(o as Record<string, unknown>)
  } catch {
    return {}
  }
}

/** @deprecated Use readInboxUnreadMap */
export function readWaInboxUnreadMap(): Record<string, number> {
  return readInboxUnreadMap()
}

export function sumInboxUnreadMap(m: Record<string, number>): number {
  return Object.values(m).reduce((a, b) => a + (typeof b === "number" && Number.isFinite(b) ? b : 0), 0)
}

/** @deprecated Use sumInboxUnreadMap */
export function sumWaInboxUnreadMap(m: Record<string, number>): number {
  return sumInboxUnreadMap(m)
}

export function writeInboxUnreadMap(map: Record<string, number>): void {
  if (typeof sessionStorage === "undefined") return
  const canonical: Record<string, number> = {}
  for (const [k, v] of Object.entries(map)) {
    const n = typeof v === "number" ? v : Number(v)
    if (!Number.isFinite(n) || n <= 0) continue
    const mk = migrateInboxUnreadKey(k)
    canonical[mk] = Math.floor(n)
  }
  try {
    sessionStorage.setItem(activeStorageKey, JSON.stringify(canonical))
  } catch {
    // ignore quota / private mode
  }
  emitInboxUnreadEvent()
}

/** @deprecated Use writeInboxUnreadMap */
export function writeWaInboxUnreadMap(map: Record<string, number>): void {
  writeInboxUnreadMap(map)
}

export function bumpInboxUnreadKey(key: string, delta = 1): void {
  const cur = readInboxUnreadMap()
  const next = { ...cur }
  const mk = migrateInboxUnreadKey(key)
  const v = (next[mk] ?? 0) + delta
  if (v <= 0) delete next[mk]
  else next[mk] = v
  writeInboxUnreadMap(next)
}

/** @deprecated Use bumpInboxUnreadKey */
export function bumpWaInboxUnreadKey(key: string, delta = 1): void {
  bumpInboxUnreadKey(key, delta)
}
