"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as React from "react"

import { cn } from "@/lib/utils"
import {
  ExclusiveOverlayRoot,
  exclusiveOverlayContentProps,
  exclusiveOverlayTriggerProps,
  useExclusiveOverlayId,
  useExclusiveOverlayVirtualAnchor,
} from "context/ExclusiveOverlayContext"
import { overlayStackZClass, useOverlayStackMode } from "context/OverlayStackContext"

type PopoverProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> & {
  /** Hover/tooltip popovers should not dismiss click menus (and cannot close without onOpenChange). */
  exclusive?: boolean
}

/** Non-modal by default so outside click / Escape do not freeze the page (especially inside Dialog). */
const Popover = ({ exclusive = true, modal = false, open, defaultOpen, onOpenChange, ...props }: PopoverProps) => {
  const root = (
    <PopoverPrimitive.Root modal={modal} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} {...props} />
  )
  if (!exclusive) return root
  return (
    <ExclusiveOverlayRoot open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {(binding) => (
        <PopoverPrimitive.Root
          modal={modal}
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          {...props}
          {...binding}
        />
      )}
    </ExclusiveOverlayRoot>
  )
}

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ ...props }, ref) => {
  const id = useExclusiveOverlayId()
  return <PopoverPrimitive.Trigger ref={ref} {...props} {...exclusiveOverlayTriggerProps(id)} />
})
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName

type PopoverAnchorProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor> & {
  virtualRef?: React.RefObject<{ getBoundingClientRect(): DOMRect } | null>
}

/** Positioning reference only — unlike PopoverTrigger, attaches no click-to-open behavior.
 *  For popovers opened programmatically (e.g. on right-click) anchored to an element that
 *  already has its own click semantics (a nav Link, a drag handle, ...). */
const PopoverAnchor = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Anchor>, PopoverAnchorProps>(
  ({ virtualRef, ...props }, ref) => {
    const id = useExclusiveOverlayId()
    useExclusiveOverlayVirtualAnchor(virtualRef)
    return (
      <PopoverPrimitive.Anchor ref={ref} virtualRef={virtualRef} {...props} {...exclusiveOverlayTriggerProps(id)} />
    )
  }
)
PopoverAnchor.displayName = PopoverPrimitive.Anchor.displayName

type PopoverContentProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
  removePortal?: boolean
}

const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, PopoverContentProps>(
  ({ className, align = "center", sideOffset = 4, removePortal = false, ...props }, ref) => {
    const overlayMode = useOverlayStackMode()
    const id = useExclusiveOverlayId()
    const content = (
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          overlayStackZClass(overlayMode, "z-[120]"),
          // "popover"/"popover-foreground" aren't defined in this project's Tailwind theme (only the
          // custom primary/secondary/neutral/... palette is), so these were silently no-ops and every
          // PopoverContent rendered with no background at all. Use the project's actual white/dark tokens.
          "w-72 rounded-md border border-neutral-50 bg-white p-4 text-secondary-darkest shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
        {...exclusiveOverlayContentProps(id)}
      />
    )

    return removePortal ? content : <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>
  }
)
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
