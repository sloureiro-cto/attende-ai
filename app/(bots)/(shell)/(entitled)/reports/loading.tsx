import { ReportsSkeleton } from "components/bots-app/reports/ReportsStates"

/** Same frame as PageLayout (title bar with the period toolbar, then the content), with no text so it needs no language. */
export default function ReportsLoading() {
  return (
    <div className="flex min-h-full flex-col" aria-busy="true">
      <div className="border-b border-neutral-border bg-white px-4 py-3 sm:px-6 lg:px-8" aria-hidden>
        <div className="h-5 w-32 animate-pulse rounded bg-neutral-10 motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded bg-neutral-10 motion-reduce:animate-none" />
        <div className="mt-4 h-10 w-full max-w-xl animate-pulse rounded-lg bg-neutral-10 motion-reduce:animate-none" />
      </div>
      <div className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
        <div className="mx-auto w-full max-w-[1440px]">
          <ReportsSkeleton />
        </div>
      </div>
    </div>
  )
}
