import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/** Translucent panel for use on the dark "ink" surfaces (login brand panel, hero areas). */
export function GlassPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bots-glass rounded-2xl", className)} {...props} />
}
