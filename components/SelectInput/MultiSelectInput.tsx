"use client"

import { ArrowDown2 } from "iconsax-react"
import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { CheckMarkIcon } from "components/SVGS/CheckMarkIcon"
import { CloseIcon } from "components/SVGS/CloseIcon"
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover"

function MultiSelectInput({
  items,
  triggerClassNames,
  placeholder,
  onValueChange,
  onOpenChange,
  customItems,
  value = [],
  showIcon = true,
  iconClassNames,
  triggerStyle,
  containerClassNames,
  open,
  viewportClassNames,
  customTrigger,
  emptyContent,
  startIcon,
  size = "large",
  disabled = false,
  portalClassNames,
}: {
  items?: { displayName: string; value: string }[]
  defaultValue?: string[]
  triggerClassNames?: string
  placeholder?: string
  onValueChange?: (value: string[]) => void
  onOpenChange?: (open: boolean) => void
  customItems?: React.ReactNode[]
  value?: string[]
  showIcon?: boolean
  iconClassNames?: string
  triggerStyle?: React.CSSProperties
  containerClassNames?: string
  open?: boolean
  viewportClassNames?: string
  customTrigger?: React.ReactNode
  emptyContent?: React.ReactNode
  startIcon?: React.ReactNode
  size?: "small" | "medium" | "large"
  disabled?: boolean
  /** Extra classes on the portaled content (e.g. `z-[500]` above stacked dialogs). */
  portalClassNames?: string
}) {
  const selectedItems = items?.filter((item) => value.includes(item.value)) || []
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [internalOpen, setInternalOpen] = useState(false)
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setIsOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (isOpen) {
      setTriggerWidth(triggerRef.current?.clientWidth)
    }
  }, [isOpen])

  const triggerContent = (
    <>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {startIcon && selectedItems.length === 0 ? (
          <div className="flex shrink-0 items-center justify-center">{startIcon}</div>
        ) : null}
        {selectedItems.length === 0 ? (
          <span className="min-w-0 truncate text-neutral-500">{placeholder}</span>
        ) : (
          selectedItems.map((item) => (
            <span
              key={item.value}
              className="inline-flex max-w-full items-center gap-1 rounded border border-primary/30 bg-primary-clean px-1.5 py-0.5 text-[11px] leading-tight text-primary"
            >
              <span className="truncate">{item.displayName}</span>
              <button
                type="button"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onValueChange?.(value.filter((v) => v !== item.value))
                }}
              >
                <CloseIcon className="cursor-pointer text-primary" size={12} />
              </button>
            </span>
          ))
        )}
      </div>
      {showIcon ? (
        <ArrowDown2
          className={cn(
            "shrink-0 self-center text-neutral-400 transition-colors",
            isOpen && "rotate-180",
            iconClassNames
          )}
          size={size === "small" ? 12 : size === "medium" ? 14 : 16}
        />
      ) : null}
    </>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {customTrigger ? (
          customTrigger
        ) : (
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            style={triggerStyle}
            className={cn(
              "flex min-h-7 w-full min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-md border border-neutral-border bg-white px-2 py-1.5 text-sm transition-all focus:border-neutral-900 focus:outline-none focus-visible:text-neutral-900",
              size === "small" && "min-h-7 py-1.5 pl-2 pr-2 text-xs",
              size === "medium" && "text-xs",
              size === "large" && "text-sm",
              selectedItems.length > 0 && "items-start py-1.5",
              triggerClassNames
            )}
            onClick={(e) => {
              // Stop propagation so nested dialogs/overlays do not swallow the click.
              e.stopPropagation()
            }}
          >
            {triggerContent}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        style={{ width: triggerWidth }}
        className={cn(
          "min-w-[200px] overflow-scroll rounded-md border border-gray-300 bg-white p-0 py-2 shadow-md",
          viewportClassNames,
          portalClassNames
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className={cn("", containerClassNames)}>
          {customItems
            ? customItems
            : items?.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    const newValue = value.includes(item.value)
                      ? value.filter((v) => v !== item.value)
                      : [...value, item.value]
                    onValueChange?.(newValue)
                  }}
                  className={cn(
                    "flex flex-row items-center gap-2 border-transparent px-3 py-1.5 text-sm hover:cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-0",
                    size === "small" && "px-2 py-1 text-xs",
                    value.includes(item.value) && "bg-primary-clean"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-start justify-center gap-2 text-body-14 text-neutral-500",
                      value.includes(item.value) && "text-primary"
                    )}
                  >
                    {value.includes(item.value) && <CheckMarkIcon color="text-primary" size={14} />}
                    {item.displayName}
                  </span>
                </div>
              ))}
        </div>
        {!customItems?.length && !items?.length && emptyContent}
      </PopoverContent>
    </Popover>
  )
}

export default MultiSelectInput
