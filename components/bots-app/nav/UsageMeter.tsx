"use client"

import { cn } from "@/lib/utils"
import { useAttendeT } from "./useAttendeT"

export type UsageMeterProps = {
  label: string
  used: number
  /** Omit or pass null/0 for "no limit": the bar is hidden and only the count shows. */
  limit?: number | null
  className?: string
}

/** Compact "used of limit" meter with a progressbar role. Warns at 80% and turns red at the limit. */
export function UsageMeter({ label, used, limit, className }: UsageMeterProps) {
  const { t } = useAttendeT()
  const hasLimit = typeof limit === "number" && limit > 0
  const ratio = hasLimit ? used / (limit as number) : 0
  const full = hasLimit && used >= (limit as number)
  const near = hasLimit && !full && ratio >= 0.8
  const percent = hasLimit ? Math.min(100, Math.round(ratio * 100)) : 0

  return (
    <div className={cn("flex min-w-[140px] flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-body-12">
        <span className="font-medium text-neutral-900">{label}</span>
        <span className={cn("tabular-nums", full ? "font-semibold text-error-dark" : near ? "font-semibold text-warning-darkest" : "text-neutral-400")}>
          {hasLimit ? t("usageOf", { used, limit: limit as number }) : t("usageUnlimited", { used })}
        </span>
      </div>
      {hasLimit && (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit as number}
          aria-valuenow={Math.min(used, limit as number)}
          aria-valuetext={full ? t("usageFull") : near ? t("usageNearLimit") : t("usageOf", { used, limit: limit as number })}
          className="h-1.5 overflow-hidden rounded-full bg-neutral-50"
        >
          <div className={cn("h-full rounded-full transition-[width]", full ? "bg-error" : near ? "bg-warning" : "bg-primary")} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}
