"use client"

import { ArrowDown2 } from "iconsax-react"
import { Check } from "lucide-react"
import React from "react"
import { cn, releaseStuckBodyPointerEvents } from "@/lib/utils"
import { ContrastText } from "components/ContrastText/ContrastText"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from "components/ui/select"
import { overlayStackZClass, useOverlayStackMode } from "context/OverlayStackContext"

interface SelectInputProps {
  items?: {
    displayName: string
    value: string
    icon?: React.ReactNode
    description?: string
    disabled?: boolean
  }[]
  size?: "small" | "medium"
  defaultValue?: string
  triggerClassNames?: string
  placeholder?: string
  onValueChange?: (value: string) => void
  onOpenChange?: (open: boolean) => void
  customItems?: React.ReactNode[]
  value?: string | React.ReactNode
  showIcon?: boolean
  iconClassNames?: string
  triggerStyle?: React.CSSProperties
  containerClassNames?: string
  contentClassNames?: string
  open?: boolean
  viewportClassNames?: string
  customTrigger?: React.ReactNode
  emptyContent?: React.ReactNode
  inheritTriggerWidth?: boolean
  disabled?: boolean
  /** Extra classes on the portaled root (e.g. `z-[500]` above stacked dialogs). */
  portalClassNames?: string
  /** Allow the selected label to wrap (up to 2 lines) and grow trigger height. */
  wrapTriggerLabel?: boolean
}

function SelectInput({
  items,
  defaultValue,
  triggerClassNames,
  placeholder,
  size = "medium",
  onValueChange,
  onOpenChange,
  customItems,
  value,
  showIcon = true,
  iconClassNames,
  triggerStyle,
  containerClassNames,
  contentClassNames,
  open,
  viewportClassNames,
  customTrigger,
  emptyContent,
  inheritTriggerWidth = false,
  disabled = false,
  portalClassNames,
  wrapTriggerLabel = false,
}: SelectInputProps) {
  const overlayMode = useOverlayStackMode()

  const triggerSize = {
    small: "px-4 py-1",
    medium: "h-10 px-4 py-2",
  }

  return (
    <Select
      modal={false}
      onValueChange={onValueChange}
      value={value as string}
      onOpenChange={(nextOpen) => {
        onOpenChange?.(nextOpen)
        if (!nextOpen) queueMicrotask(releaseStuckBodyPointerEvents)
      }}
      defaultValue={defaultValue}
      open={open}
    >
      <SelectTrigger
        style={triggerStyle}
        className={cn(
          !customTrigger &&
            "group flex w-full min-w-0 max-w-full cursor-pointer rounded text-body-12 font-semibold text-secondary-darkest hover:bg-neutral-10",
          wrapTriggerLabel
            ? "min-h-7 items-start gap-2 py-1.5"
            : cn("items-center gap-2 overflow-hidden", triggerSize[size]),
          triggerClassNames
        )}
        onClick={(e) => {
          // Só parar propagação — preventDefault no trigger quebrava abrir/fechar o Select
          // dentro de Dialogs (Radix) e noutros contentores que escutam o mesmo clique.
          e.stopPropagation()
        }}
        disabled={disabled}
      >
        {customTrigger ? (
          customTrigger
        ) : (
          <ContrastText
            dark="#191B1C"
            className={cn(
              "flex w-full min-w-0 flex-1 gap-2 font-semibold text-inherit",
              wrapTriggerLabel ? "items-start" : "items-center overflow-hidden"
            )}
          >
            <SelectValue
              placeholder={value ? undefined : placeholder}
              className={cn(
                "block min-w-0 max-w-full flex-1 text-left text-xs font-normal",
                wrapTriggerLabel
                  ? "line-clamp-2 whitespace-normal leading-snug [&>span]:line-clamp-2 [&>span]:whitespace-normal"
                  : "truncate [&>span]:block [&>span]:max-w-full [&>span]:truncate"
              )}
            />
            {showIcon && (
              <ArrowDown2
                size={14}
                className={cn(
                  "shrink-0",
                  wrapTriggerLabel && "mt-0.5",
                  "ml-auto transition-all duration-200",
                  "group-data-[state=open]:rotate-180",
                  iconClassNames
                )}
              />
            )}
          </ContrastText>
        )}
      </SelectTrigger>

      <SelectPortal className={cn("w-fit", portalClassNames)}>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          className={cn(
            "overflow-hidden",
            inheritTriggerWidth && "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]",
            overlayStackZClass(overlayMode, "z-[120]"),
            contentClassNames
          )}
        >
          <SelectViewport
            className={cn(
              "z-50 max-h-[500px] overflow-y-auto overscroll-contain rounded-md border border-neutral-50 bg-white py-2 shadow-md",
              inheritTriggerWidth
                ? "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
                : "w-64",
              viewportClassNames
            )}
          >
            <SelectGroup className={cn("z-50", containerClassNames)}>
              {customItems
                ? customItems
                : items?.map((item, index) => (
                    <SelectItem
                      key={index}
                      value={item.value}
                      className={cn(
                        "group w-full cursor-pointer px-4 py-2 hover:bg-neutral-10",
                        item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                      )}
                      data-inner-item={true}
                      disabled={item.disabled}
                    >
                      <div className="flex w-full items-center gap-2 text-body-14 font-normal text-neutral-500">
                        <Check
                          size={14}
                          className={cn(
                            "hidden size-[14px] shrink-0 text-success transition-all duration-300 group-data-[state=checked]:block"
                          )}
                        />
                        <div className="flex min-w-0 flex-col items-start">
                          <div
                            className={cn(
                              "text-body-14 font-normal text-neutral-900",
                              inheritTriggerWidth && "md:whitespace-nowrap"
                            )}
                          >
                            {item.displayName}
                          </div>
                          {item.description && (
                            <div className="hidden text-body-10 font-normal text-neutral-200 group-data-[inner-item=true]:block ">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.icon && (
                          <div className="ml-auto hidden group-data-[inner-item=true]:block">{item.icon}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
            </SelectGroup>
            {!customItems?.length && !items?.length && emptyContent}
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </Select>
  )
}

export default SelectInput
