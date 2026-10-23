import { Skeleton } from "components/ui/skeleton"

export default function TeamLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-56 w-full rounded-[14px]" />
        <Skeleton className="h-72 w-full rounded-[14px]" />
      </div>
    </div>
  )
}
