import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: "light" | "dark"
  /** Lift on hover (use for clickable cards). */
  interactive?: boolean
}

/** Content surface of the bots app: soft border, layered shadow, generous radius. */
export function PremiumCard({ tone = "light", interactive = false, className, ...props }: Props) {
  return (
    <div
      className={cn(
        "rounded-[14px] border transition-[box-shadow,transform,border-color] duration-300",
        tone === "light"
          ? "border-neutral-50 bg-white shadow-[var(--bots-shadow-card)]"
          : "border-white/10 bg-[rgb(var(--bots-ink-raised))] text-white shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)]",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-primary-lighter hover:shadow-[var(--bots-shadow-lift)] motion-reduce:transform-none",
        className
      )}
      {...props}
    />
  )
}
