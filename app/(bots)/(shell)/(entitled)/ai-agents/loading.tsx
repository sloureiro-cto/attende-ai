import { PageLayout } from "components/bots-app/ui/PageLayout"
import { Skeleton } from "components/ui/skeleton"

/** Same frame as the agents pages (PageLayout), so nothing jumps when the page arrives. */
export default function AgentsLoading() {
  return (
    <PageLayout title={<span className="block h-5 w-40 animate-pulse rounded-md bg-neutral-50 motion-reduce:animate-none" />}
      subtitle={<span className="mt-1 block h-3.5 w-64 max-w-full animate-pulse rounded-md bg-neutral-50 motion-reduce:animate-none" />}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        <Skeleton className="h-64 w-full rounded-[14px]" />
        <Skeleton className="h-64 w-full rounded-[14px]" />
        <Skeleton className="h-64 w-full rounded-[14px]" />
      </div>
    </PageLayout>
  )
}
