"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { DropdownContent, DropdownItem, DropdownPortal } from "components/ui/dropdown-menu"

/**
 * `DropdownContent` ships unstyled, so every screen passes its own surface. This is the project's
 * standard menu surface (see agent-chat's "more" menu): portalled, white, bordered, small shadow.
 */
const CONTENT_CLASS = "z-[400] min-w-[180px] rounded-lg border border-neutral-50 bg-white p-1 shadow-md"
const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-body-13 text-neutral-900 outline-none focus:bg-neutral-10 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

export function MenuContent({ className, ...props }: ComponentProps<typeof DropdownContent>) {
  return (
    <DropdownPortal>
      <DropdownContent sideOffset={4} className={cn(CONTENT_CLASS, className)} {...props} />
    </DropdownPortal>
  )
}

export function MenuItem({ className, danger, ...props }: ComponentProps<typeof DropdownItem> & { danger?: boolean }) {
  return <DropdownItem className={cn(ITEM_CLASS, danger && "text-error-dark focus:bg-error-clean", className)} {...props} />
}
