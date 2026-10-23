import { listWhatsAppSessionsAction } from "actions/whatsapp-lite/sessions"
import {
  type InboxOverviewData,
  type InboxPage,
  loadInboxItemAction,
  loadInboxOverviewAction,
  loadInboxPageAction,
} from "./actions"
import { DEFAULT_INBOX_FILTERS, type InboxFilters, type InboxItem } from "./model"

export type InboxInitialData = {
  page: InboxPage | null
  pageFailed: boolean
  overview: InboxOverviewData | null
  /** WhatsApp session id -> transport, so the thread can warn about the 24h window on official lines. */
  transports: Record<string, string | null>
  selected: InboxItem | null
}

/**
 * Everything the inbox screen needs for its first paint, fetched in parallel. Each source can fail on its own:
 * the list is the only one that blocks (it shows a retry), the others degrade silently.
 */
export async function loadInboxInitial(conversationId?: string, filters: InboxFilters = DEFAULT_INBOX_FILTERS): Promise<InboxInitialData> {
  const [page, overview, sessions, item] = await Promise.all([
    loadInboxPageAction(filters),
    loadInboxOverviewAction(),
    listWhatsAppSessionsAction(),
    conversationId ? loadInboxItemAction(conversationId) : Promise.resolve(null),
  ])
  const transports: Record<string, string | null> = {}
  if (sessions.success) for (const s of sessions.data) transports[s._id] = s.transport ?? null
  return {
    page: page.success ? page.data : null,
    pageFailed: !page.success,
    overview: overview.success ? overview.data : null,
    transports,
    selected: item && item.success ? item.data : null,
  }
}
