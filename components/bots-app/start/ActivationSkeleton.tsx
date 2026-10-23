import { Skeleton } from "components/ui/skeleton"

/** Loading frame of the home and the guided setup: same title bar and padding as PageLayout, no text to translate. */
export function ActivationSkeleton() {
  return (
    <div className="flex min-h-full flex-col" aria-busy="true">
      <div className="flex min-h-[60px] items-center border-b border-neutral-border bg-white px-4 py-3 sm:px-6 lg:px-8">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-6 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-6">
        <Skeleton className="h-[220px] w-full rounded-[14px]" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
