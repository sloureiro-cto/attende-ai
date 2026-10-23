import { Skeleton } from "components/ui/skeleton"

/** Shown the instant the builder route is opened, while the bot and the workspace context load on the server. */
export default function BuilderLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-10" aria-busy="true">
      <div className="flex h-16 items-center gap-3 border-b border-neutral-50 bg-white px-5">
        <Skeleton className="size-9" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
      <div className="flex flex-1 gap-4 p-4">
        <Skeleton className="hidden h-[420px] w-60 sm:block" />
        <Skeleton className="h-[420px] flex-1" />
      </div>
    </div>
  )
}
