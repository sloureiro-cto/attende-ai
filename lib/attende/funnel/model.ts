import { formatDate, formatMoney, formatNumber, localeOf } from "lib/attende/format"
import { isDay } from "lib/attende/reports/model"
import { FUNNEL_CHANNELS, type FunnelChannel, type FunnelRow, type FunnelStage } from "./types"

export type FunnelTab = "deals" | "contacts"
export type FunnelSort = "updated_desc" | "updated_asc"
export type OpenConversationFilter = "any" | "yes" | "no"
export type HandlingFilter = "any" | "ai" | "human"

export const PAGE_SIZES = [25, 50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 50
/** Past this many loaded rows the table renders only what is on screen. */
export const VIRTUALIZE_AFTER = 200
/** Search starts at two characters (the backend matches name/e-mail prefixes and full phone numbers). */
export const MIN_SEARCH_CHARS = 2
export const MAX_SEARCH_CHARS = 80
export const MAX_STAGE_FILTERS = 50
/** The CSV export stops at this many rows (`GET /api/attende/funnel/export.csv`). */
export const EXPORT_ROW_CAP = 10_000

const ID_RE = /^[a-f0-9]{24}$/i

/**
 * Channel, open-conversation and AI/human handling filters need each card's conversation, and no JSYNQ card list
 * returns it (`docs/jsynq-apis-used.md`). Off: the popover hides them and links that carry them are read without them.
 */
export const CONVERSATION_FILTERS_AVAILABLE: boolean = false

export type FunnelFilters = {
  stages: string[]
  q: string
  assignee: string | null
  label: string | null
  source: string | null
  channel: FunnelChannel | null
  openConversation: OpenConversationFilter
  handling: HandlingFilter
  createdFrom: string | null
  createdTo: string | null
  sort: FunnelSort
}

export type FunnelUrlState = {
  tab: FunnelTab
  filters: FunnelFilters
  pageSize: PageSize
  maskPhone: boolean
  /** Card id whose drawer is open (deep link from the inbox: `?deal=`). */
  deal: string | null
}

export const DEFAULT_FILTERS: FunnelFilters = {
  stages: [],
  q: "",
  assignee: null,
  label: null,
  source: null,
  channel: null,
  openConversation: "any",
  handling: "any",
  createdFrom: null,
  createdTo: null,
  sort: "updated_desc",
}

export const DEFAULT_URL_STATE: FunnelUrlState = { tab: "deals", filters: DEFAULT_FILTERS, pageSize: DEFAULT_PAGE_SIZE, maskPhone: false, deal: null }

type Params = Record<string, string | string[] | undefined> | URLSearchParams

const read = (params: Params, key: string): string | null => {
  const raw = params instanceof URLSearchParams ? params.getAll(key).join(",") : Array.isArray(params[key]) ? (params[key] as string[]).join(",") : params[key]
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null
}
const readId = (params: Params, key: string): string | null => {
  const v = read(params, key)
  return v && ID_RE.test(v) ? v : null
}

/** URL -> state. Anything malformed falls back to its default: ids are validated, never passed through blindly. */
export function parseFunnelParams(params: Params): FunnelUrlState {
  const stagesRaw = read(params, "stage")
  const stages = stagesRaw ? [...new Set(stagesRaw.split(",").map((s) => s.trim()).filter((s) => ID_RE.test(s)))].slice(0, MAX_STAGE_FILTERS) : []
  const channelRaw = read(params, "channel")
  const open = read(params, "open")
  const handling = read(params, "handling")
  const from = read(params, "from")
  const to = read(params, "to")
  const size = Number(read(params, "size"))
  return {
    tab: read(params, "tab") === "contacts" ? "contacts" : "deals",
    filters: {
      stages,
      q: (read(params, "q") ?? "").slice(0, MAX_SEARCH_CHARS),
      assignee: readId(params, "assignee"),
      label: readId(params, "label"),
      source: readId(params, "source"),
      channel: CONVERSATION_FILTERS_AVAILABLE && (FUNNEL_CHANNELS as readonly string[]).includes(channelRaw ?? "") ? (channelRaw as FunnelChannel) : null,
      openConversation: CONVERSATION_FILTERS_AVAILABLE && (open === "yes" || open === "no") ? open : "any",
      handling: CONVERSATION_FILTERS_AVAILABLE && (handling === "ai" || handling === "human") ? handling : "any",
      createdFrom: isDay(from) ? from : null,
      createdTo: isDay(to) ? to : null,
      sort: read(params, "sort") === "updated_asc" ? "updated_asc" : "updated_desc",
    },
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_PAGE_SIZE,
    maskPhone: read(params, "mask") === "1",
    deal: readId(params, "deal"),
  }
}

/** State -> the short query string kept in the URL (defaults are omitted). */
export function stateToSearchParams(state: FunnelUrlState): URLSearchParams {
  const p = new URLSearchParams()
  const f = state.filters
  if (state.tab === "contacts") p.set("tab", "contacts")
  if (f.stages.length > 0) p.set("stage", f.stages.join(","))
  if (f.q.trim()) p.set("q", f.q.trim())
  if (f.assignee) p.set("assignee", f.assignee)
  if (f.label) p.set("label", f.label)
  if (f.source) p.set("source", f.source)
  if (f.channel) p.set("channel", f.channel)
  if (f.openConversation !== "any") p.set("open", f.openConversation)
  if (f.handling !== "any") p.set("handling", f.handling)
  if (f.createdFrom) p.set("from", f.createdFrom)
  if (f.createdTo) p.set("to", f.createdTo)
  if (f.sort !== "updated_desc") p.set("sort", f.sort)
  if (state.pageSize !== DEFAULT_PAGE_SIZE) p.set("size", String(state.pageSize))
  if (state.maskPhone) p.set("mask", "1")
  if (state.deal) p.set("deal", state.deal)
  return p
}

/** Text that is long enough to search with (one character would match half the contacts). */
export const effectiveSearch = (q: string): string => (q.trim().length >= MIN_SEARCH_CHARS ? q.trim() : "")

/** Number of filters the user has set (drives the 'Clear filters' button and the badge). The sort and page size do not count. */
export function activeFilterCount(f: FunnelFilters): number {
  return (
    (f.stages.length > 0 ? 1 : 0) +
    (effectiveSearch(f.q) ? 1 : 0) +
    (f.assignee ? 1 : 0) +
    (f.label ? 1 : 0) +
    (f.source ? 1 : 0) +
    (f.channel ? 1 : 0) +
    (f.openConversation !== "any" ? 1 : 0) +
    (f.handling !== "any" ? 1 : 0) +
    (f.createdFrom || f.createdTo ? 1 : 0)
  )
}

/** The filters of the filters popover (everything but the stage chips, the search and the sort). */
export type SecondaryFilterKey = "assignee" | "label" | "source" | "channel" | "openConversation" | "handling" | "created"

/** Which secondary filters are on, in the order their chips show. */
export function activeSecondaryFilters(f: FunnelFilters): SecondaryFilterKey[] {
  const on: SecondaryFilterKey[] = []
  if (f.assignee) on.push("assignee")
  if (f.label) on.push("label")
  if (f.source) on.push("source")
  if (f.channel) on.push("channel")
  if (f.openConversation !== "any") on.push("openConversation")
  if (f.handling !== "any") on.push("handling")
  if (f.createdFrom || f.createdTo) on.push("created")
  return on
}

/** The patch that turns one secondary filter off. */
export function clearSecondaryFilter(key: SecondaryFilterKey): Partial<FunnelFilters> {
  switch (key) {
    case "created":
      return { createdFrom: null, createdTo: null }
    case "openConversation":
    case "handling":
      return { [key]: "any" }
    default:
      return { [key]: null }
  }
}

/** The patch that turns every secondary filter off (stages, search and sort stay). */
export const CLEAR_SECONDARY_FILTERS: Partial<FunnelFilters> = {
  assignee: null,
  label: null,
  source: null,
  channel: null,
  openConversation: "any",
  handling: "any",
  createdFrom: null,
  createdTo: null,
}

/** Filters -> the backend's query for `GET /` and `GET /export.csv` (no cursor: callers add it). */
export function filtersToApiQuery(f: FunnelFilters, extra: { limit?: number; cursor?: string | null; maskPhone?: boolean } = {}): Record<string, string> {
  const q: Record<string, string> = {}
  if (f.stages.length > 0) q.stage = f.stages.join(",")
  const search = effectiveSearch(f.q)
  if (search) q.q = search
  if (f.assignee) q.assignee = f.assignee
  if (f.label) q.label = f.label
  if (f.source) q.source = f.source
  if (f.channel) q.channel = f.channel
  if (f.openConversation !== "any") q.hasOpenConversation = f.openConversation === "yes" ? "true" : "false"
  if (f.handling !== "any") q.agentHandling = f.handling
  if (f.createdFrom) q.createdFrom = f.createdFrom
  if (f.createdTo) q.createdTo = f.createdTo
  q.sort = f.sort
  if (extra.limit) q.limit = String(extra.limit)
  if (extra.cursor) q.cursor = extra.cursor
  if (extra.maskPhone) q.maskPhone = "true"
  return q
}

/** Two filter sets that would produce the same backend query (used to drop answers of superseded requests). */
export const sameQuery = (a: FunnelFilters, b: FunnelFilters): boolean => JSON.stringify(filtersToApiQuery(a)) === JSON.stringify(filtersToApiQuery(b))

// --- pages -------------------------------------------------------------------------------------

/** Appends a page without ever repeating a row (a deal that moved while paging could show up twice). */
export function mergeById<T>(existing: T[], incoming: T[], key: (item: T) => string): T[] {
  const seen = new Set(existing.map(key))
  const out = existing.slice()
  for (const item of incoming) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

/** Max automatic follow-up requests after a `partial` page that brought nothing (the budget bounds the cost per click). */
export const MAX_PARTIAL_FOLLOW_UPS = 6

/**
 * After a page arrives: keep going on our own only while the server says there is more, the page was partial and it
 * added no new row (a short partial page is normal, an empty one means the scan window ended before finding matches).
 */
export function shouldFollowUp(page: { hasMore: boolean; partial: boolean }, gained: number, followUps: number): boolean {
  return page.hasMore && page.partial && gained === 0 && followUps < MAX_PARTIAL_FOLLOW_UPS
}

// --- optimistic stage move ---------------------------------------------------------------------

export type MoveSnapshot = { rows: FunnelRow[]; previous: FunnelRow | null }

/** Moves a deal to another stage in the loaded rows and remembers what it replaced, for the rollback. */
export function moveRowToStage(rows: FunnelRow[], cardId: string, stage: FunnelStage): MoveSnapshot {
  const previous = rows.find((r) => r.cardId === cardId) ?? null
  if (!previous) return { rows, previous: null }
  const status = stage.kind
  return {
    previous,
    rows: rows.map((r) => (r.cardId === cardId ? { ...r, stage, deal: r.deal ? { ...r.deal, status } : r.deal } : r)),
  }
}

/** Puts the previous version of a row back (only if the row is still there). */
export const restoreRow = (rows: FunnelRow[], previous: FunnelRow): FunnelRow[] => rows.map((r) => (r.cardId === previous.cardId ? previous : r))

// --- columns -----------------------------------------------------------------------------------

export const FUNNEL_COLUMNS = ["contact", "stage", "deal", "owner", "labels", "source", "lastMessage", "updated"] as const
export type FunnelColumn = (typeof FUNNEL_COLUMNS)[number]
/** Calm by default: labels, source and "updated" stay available under "Columns". */
export const DEFAULT_COLUMNS: readonly FunnelColumn[] = ["contact", "stage", "deal", "owner", "lastMessage"]
/** The contact column is the row's identity: it cannot be hidden. */
export const REQUIRED_COLUMNS: readonly FunnelColumn[] = ["contact"]

export function parseColumnPrefs(raw: unknown): FunnelColumn[] {
  if (!Array.isArray(raw)) return [...DEFAULT_COLUMNS]
  const known = raw.filter((c): c is FunnelColumn => typeof c === "string" && (FUNNEL_COLUMNS as readonly string[]).includes(c))
  const withRequired = [...new Set([...REQUIRED_COLUMNS, ...known])]
  return FUNNEL_COLUMNS.filter((c) => withRequired.includes(c))
}

// --- formatting --------------------------------------------------------------------------------

/**
 * A deal value in its own currency (never converted when the language changes). `deal: null` means the card carries
 * no value: callers show "No value", never a zero. A real 0 (products that add up to nothing) is formatted as zero.
 */
export function formatDealValue(deal: FunnelRow["deal"], language: string): string | null {
  if (!deal || !Number.isFinite(deal.value)) return null
  return formatMoney(deal.value, deal.currency, language) ?? formatNumber(deal.value, language, { maximumFractionDigits: 2 })
}

/** The amount as typed in the value editor: the language's decimal mark, no grouping ("1500,5" / "1500.5"). */
export const moneyInputText = (value: number, language: string): string => formatNumber(value, language, { maximumFractionDigits: 2, useGrouping: false })

/**
 * `2026-10-22T10:00:00Z` -> "2 hours ago" / "há 2 horas" (coarse on purpose); a full date past 30 days. Empty string
 * for a missing or invalid date: callers show their own placeholder.
 */
export function formatRelativeTime(iso: string | null | undefined, now: Date, language: string): string {
  if (!iso) return ""
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return ""
  const diffMs = time - now.getTime()
  const rtf = new Intl.RelativeTimeFormat(localeOf(language), { numeric: "auto" })
  const abs = Math.abs(diffMs)
  if (abs < 60_000) return rtf.format(0, "second")
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute")
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour")
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diffMs / 86_400_000), "day")
  return formatDate(time, language, { day: "numeric", month: "short", year: "numeric" })
}

/** Up to two initials from the letters of a name ("Ana Souza" -> "AS"); empty when there are none (a phone number). */
export const initials = (name: string | null | undefined): string => {
  const firstLetter = (part: string) => part.match(/\p{L}/u)?.[0] ?? ""
  const parts = (name ?? "").trim().split(/\s+/).map(firstLetter).filter(Boolean)
  return ((parts[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1] ?? "") : "")).toUpperCase()
}

type ContactLike = { name: string | null; phone: string | null; email: string | null } | null | undefined

/** The name to show for a contact: its name, else the deal title, else its phone or e-mail; empty when none exists. */
export const displayName = (contact: ContactLike, title?: string | null): string =>
  contact?.name?.trim() || title?.trim() || contact?.phone?.trim() || contact?.email?.trim() || ""

/** True only when the contact really has neither a phone nor an e-mail. */
export const lacksPhoneAndEmail = (contact: ContactLike): boolean => !!contact && !contact.phone?.trim() && !contact.email?.trim()
