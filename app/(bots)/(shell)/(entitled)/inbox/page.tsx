import { Metadata } from "next"
import { InboxView } from "components/bots-app/inbox/InboxView"
import { loadInboxInitial } from "lib/bots-app/inbox/loadInbox"
import { filtersFromSearchParams } from "lib/bots-app/inbox/model"

export const metadata: Metadata = { title: "Inbox" }

/** The live inbox. `?filter=` and `?channel=` open it filtered; the first page, counters and transports load in parallel. */
export default async function InboxPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const filters = filtersFromSearchParams(searchParams)
  const data = await loadInboxInitial(undefined, filters)
  return (
    <InboxView
      initialPage={data.page}
      initialFailed={data.pageFailed}
      overview={data.overview}
      transports={data.transports}
      initialSelected={null}
      initialFilters={filters}
    />
  )
}
