"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { DropdownContent, DropdownItem, DropdownPortal } from "components/ui/dropdown-menu"

/** Standard menu surface (portalled, white, bordered). Own copy so this app does not depend on the automations module. */
const CONTENT_CLASS =
  "z-[400] min-w-[220px] rounded-xl border border-neutral-50 bg-white p-1.5 shadow-[var(--bots-shadow-lift)]"
const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-13 text-neutral-900 outline-none transition-colors focus:bg-neutral-10 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

export function MenuContent({ className, ...props }: ComponentProps<typeof DropdownContent>) {
  return (
    <DropdownPortal>
      <DropdownContent sideOffset={8} className={cn(CONTENT_CLASS, className)} {...props} />
    </DropdownPortal>
  )
}

export function MenuItem({ className, danger, ...props }: ComponentProps<typeof DropdownItem> & { danger?: boolean }) {
  return <DropdownItem className={cn(ITEM_CLASS, danger && "text-error-dark focus:bg-error-clean", className)} {...props} />
}
