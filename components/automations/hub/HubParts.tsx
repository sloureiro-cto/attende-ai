"use client"

import { Skeleton } from "components/ui/skeleton"

export function MetricCard({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-50 bg-white px-5 py-4">
      <div className="text-body-12 text-neutral-500">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-heading-24 font-semibold text-neutral-900">{value === null ? "–" : value.toLocaleString()}</span>
        {suffix && <span className="text-body-12 text-neutral-500">{suffix}</span>}
      </div>
    </div>
  )
}

export function HubMessage({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-body-16 font-semibold text-neutral-800">{title}</p>
      {hint && <p className="max-w-md text-body-14 text-neutral-500">{hint}</p>}
      {action}
    </div>
  )
}

export function HubSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
