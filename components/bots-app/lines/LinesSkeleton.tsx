import { Skeleton } from "components/ui/skeleton"

/** Route-level loading state of the lines pages: header, summary strip, filter and a grid of cards. */
export function LinesSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" role="status" aria-busy="true" aria-label={label}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-[152px] rounded-[14px] sm:h-[76px]" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72 max-w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[168px] rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
