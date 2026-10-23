"use client"

import { Calendar } from "iconsax-react"
import { cn } from "@/lib/utils"
import { useAttendeT } from "./useAttendeT"
import { BOTS_BRAND } from "../brand"

type Props = {
  className?: string
  /** `solid` for prominent spots, `outline` for empty states and cards, `ghost` for the side menu. */
  appearance?: "solid" | "outline" | "ghost"
  /** Show the short label ("Book a demo") instead of the full one. */
  short?: boolean
  /** In the side menu: with the menu collapsed, only the icon shows (label kept for screen readers, tooltip on hover). */
  rail?: boolean
}

/** "Book a demo or training". Always opens the booking page in a new tab (URL lives in BOTS_BRAND.bookingUrl). */
export function BookDemoButton({ className, appearance = "outline", short = false, rail = false }: Props) {
  const { t } = useAttendeT()
  const label = short ? t("bookDemoShort") : t("bookDemo")
  return (
    <a
      title={rail ? label : undefined}
      href={BOTS_BRAND.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-body-14 font-semibold no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        appearance === "solid"
          ? "bg-primary text-white hover:bg-primary-dark"
          : appearance === "ghost"
            ? "h-[34px] rounded-md px-2.5 text-body-13 font-medium text-neutral-700 hover:bg-neutral-10 hover:text-neutral-900"
            : "border border-neutral-50 bg-white text-neutral-900 hover:bg-neutral-10",
        rail && "[[data-sidebar=collapsed]_&]:w-11 [[data-sidebar=collapsed]_&]:justify-center [[data-sidebar=collapsed]_&]:px-0",
        className
      )}
    >
      <Calendar size={16} aria-hidden className="shrink-0" />
      <span className={cn("truncate", rail && "[[data-sidebar=collapsed]_&]:sr-only")}>{label}</span>
    </a>
  )
}
