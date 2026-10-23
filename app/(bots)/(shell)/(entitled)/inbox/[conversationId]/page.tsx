import { Metadata } from "next"
import { InboxView } from "components/bots-app/inbox/InboxView"
import { loadInboxInitial } from "lib/bots-app/inbox/loadInbox"
import { filtersFromSearchParams } from "lib/bots-app/inbox/model"

export const metadata: Metadata = { title: "Inbox" }

/**
 * Deep link to one conversation. The server resolves it (subject to the user's access) and opens it. `?filter=` is
 * kept for the list; `?channel=` here is the conversation's own channel, not a filter.
 */
export default async function InboxConversationPage({
  params,
  searchParams,
}: {
  params: { conversationId: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const filters = filtersFromSearchParams(searchParams, { readChannel: false })
  const data = await loadInboxInitial(decodeURIComponent(params.conversationId), filters)
  return (
    <InboxView
      initialPage={data.page}
      initialFailed={data.pageFailed}
      overview={data.overview}
      transports={data.transports}
      initialSelected={data.selected}
      initialFilters={filters}
    />
  )
}
