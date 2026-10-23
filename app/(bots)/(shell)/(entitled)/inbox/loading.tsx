import { ConversationListSkeleton } from "components/bots-app/inbox/ConversationList"
import { Skeleton } from "components/ui/skeleton"

/** Shown the instant /inbox is opened, while the first page of conversations loads. */
export default function InboxLoading() {
  return (
    <div
      className="grid h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] min-h-[420px] grid-cols-1 overflow-hidden lg:h-dvh lg:grid-cols-[18.5rem_minmax(0,1fr)] xl:grid-cols-[21.25rem_minmax(0,1fr)]"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 bg-white p-3.5 lg:border-r lg:border-neutral-border">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <ConversationListSkeleton />
      </div>
      <div className="hidden items-center justify-center lg:flex">
        <Skeleton className="h-32 w-80" />
      </div>
    </div>
  )
}
