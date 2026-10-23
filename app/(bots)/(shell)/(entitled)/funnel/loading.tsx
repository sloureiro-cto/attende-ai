import { FunnelTableSkeleton } from "components/bots-app/funnel/FunnelStates"

export default function FunnelLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-16 animate-pulse rounded-xl bg-neutral-10" aria-hidden />
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-neutral-10" aria-hidden />
      <FunnelTableSkeleton />
    </div>
  )
}
