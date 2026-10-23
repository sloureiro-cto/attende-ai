import { cn } from "@/lib/utils"
import type { BotsLineStatus } from "lib/bots-app/lines"
import { LINE_STATE_TONE } from "./lineMeta"

/** Colored status pill. The label is passed in so the chip stays presentational (and testable). */
export function LineStatusChip({ status, label, className }: { status: BotsLineStatus; label: string; className?: string }) {
  const tone = LINE_STATE_TONE[status]
  return (
    <span
      data-status={status}
      className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-body-12 font-semibold ring-1 ring-inset", tone.chip, className)}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot, (status === "qr_pending" || status === "reconnecting") && "animate-pulse motion-reduce:animate-none")} aria-hidden />
      {label}
    </span>
  )
}
