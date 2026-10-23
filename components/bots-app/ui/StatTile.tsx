import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { PremiumCard } from "./PremiumCard"

type Props = {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  className?: string
}

/** A single number with its label (counts, rates). */
export function StatTile({ label, value, hint, icon, className }: Props) {
  return (
    <PremiumCard className={cn("flex items-start justify-between gap-3 p-4", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-body-12 font-medium text-neutral-400">{label}</span>
        <span className="text-[26px] font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">{value}</span>
        {hint && <span className="text-body-12 text-neutral-400">{hint}</span>}
      </div>
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-clean text-primary-dark">
          {icon}
        </span>
      )}
    </PremiumCard>
  )
}
