import { Skeleton } from "components/ui/skeleton"

/** Layout-shaped placeholder shown while the page's three requests are in flight. */
export function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(168px,1fr))] gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[100px]" />
        ))}
      </div>
      <Skeleton className="h-[340px]" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[260px]" />
      </div>
    </div>
  )
}
