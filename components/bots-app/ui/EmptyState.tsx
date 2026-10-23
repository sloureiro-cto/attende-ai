import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

/** Centered empty/error placeholder on a dotted grid. */
export function EmptyState({ title, description, icon, action, className }: Props) {
  return (
    <div
      className={cn(
        "bots-grid-light flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-neutral-100 px-6 py-14 text-center",
        className
      )}
      role="status"
    >
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary-dark shadow-[var(--bots-shadow-card)]">
          {icon}
        </span>
      )}
      <h2 className="text-body-16 font-semibold text-neutral-900">{title}</h2>
      {description && <p className="max-w-sm text-body-14 text-neutral-500">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
