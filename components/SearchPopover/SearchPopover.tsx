"use client"

import { PopoverProps } from "@radix-ui/react-popover"
import { LoaderCircle } from "lucide-react"
import React, { ReactNode, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { debounce } from "app/utils/debounce"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "components/ui/popover"
import { overlayStackZClass, useOverlayStackMode } from "context/OverlayStackContext"
import { useProjectsTranslation } from "hooks/useProjectsTranslation"
import { SearchPopoverItem } from "./SearchPopoverItem"

interface PropTypes extends PopoverProps {
  onSearch?: (value: string) => void
  value?: string | string[]
  isLoading?: boolean
  onChange?: (value: string | string[]) => void
  searchValue?: string
  setSearchValue?: (value: string) => void
  multipleSelect?: boolean
  items?: ReactNode[]
  inputPlaceholder?: string
  debounceTime?: number
  emptyContent?: ReactNode
  /** Ref to the scrollable list container (for infinite scroll observers). */
  itemsContainerRef?: React.Ref<HTMLDivElement>
  itemsContainerStyle?: React.CSSProperties
  classNames?: {
    trigger?: string
    content?: string
    container?: string
    inputContainer?: string
    input?: string
    itemsContainer?: string
    itemContainer?: string
    itemIcon?: string
    itemContent?: string
  }
  showSearchInput?: boolean
  removePortal?: boolean
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  subHeaderComponent?: ReactNode
  /** When true, renders `subHeaderComponent` above the search field (title row → search → list). */
  subHeaderFirst?: boolean
  footerComponent?: ReactNode
  keepEmptyContent?: boolean
  onEnter?: (searchValue: string) => void
  /** Position relative to this element when the trigger is not the visual control (e.g. lead +). */
  virtualAnchorRef?: React.RefObject<HTMLElement | null>
}

export function SearchPopover({
  children,
  onSearch,
  isLoading,
  value,
  onChange,
  searchValue,
  setSearchValue,
  multipleSelect,
  inputPlaceholder,
  items,
  debounceTime = 0,
  emptyContent,
  itemsContainerRef,
  itemsContainerStyle,
  classNames,
  removePortal,
  side,
  align,
  showSearchInput = true,
  subHeaderComponent: bottomHeaderComponent,
  subHeaderFirst = false,
  footerComponent,
  keepEmptyContent = false,
  onEnter,
  virtualAnchorRef,
  ...props
}: PropTypes) {
  const { t } = useProjectsTranslation()
  const overlayMode = useOverlayStackMode()
  const debouncedRef = useRef<(value: string) => void>()

  const handleOnChange = (nValue: string) => {
    if (multipleSelect) {
      const currentValue = Array.isArray(value) ? value : []
      const isAlreadySelected = currentValue.includes(nValue)

      const newValue = isAlreadySelected ? currentValue.filter((v) => v !== nValue) : [...currentValue, nValue]

      onChange?.(newValue)
    } else {
      onChange?.(nValue === value ? "" : nValue)
    }
  }

  const handleOnSearch = (value: string) => {
    setSearchValue?.(value)

    if (!onSearch) return

    if (!debounceTime) {
      onSearch(value)
      return
    }

    debouncedRef.current?.(value)
  }

  const showSearch = Boolean(showSearchInput && !keepEmptyContent)
  const headerBlockBeforeSearch = subHeaderFirst && bottomHeaderComponent ? bottomHeaderComponent : null
  const headerBlockAfterSearch = !subHeaderFirst && bottomHeaderComponent ? bottomHeaderComponent : null
  const shouldShowHeaderDivider = () => Boolean(headerBlockBeforeSearch || showSearch || headerBlockAfterSearch)

  useEffect(() => {
    if (!onSearch || !debounceTime) return

    debouncedRef.current = debounce((val: string) => {
      onSearch(val)
    }, debounceTime)
  }, [onSearch, debounceTime])

  return (
    <Popover {...props} modal={false}>
      {virtualAnchorRef ? (
        <PopoverAnchor virtualRef={virtualAnchorRef as React.RefObject<{ getBoundingClientRect(): DOMRect }>} />
      ) : (
        <PopoverTrigger className={classNames?.trigger} asChild>
          {children}
        </PopoverTrigger>
      )}
      <PopoverContent
        className={cn(
          overlayStackZClass(overlayMode, "z-[120]"),
          "pointer-events-auto flex max-h-[min(var(--radix-popper-available-height),100vh)] min-h-0 w-auto flex-col overflow-hidden p-0",
          classNames?.content
        )}
        removePortal={removePortal}
        sideOffset={8}
        avoidCollisions
        collisionPadding={12}
        sticky="partial"
        side={side}
        align={align}
      >
        <div className={cn("flex max-h-full min-h-0 flex-1 flex-col overflow-hidden", classNames?.container)}>
          {headerBlockBeforeSearch}

          {showSearch && (
            <div
              className={cn(
                "sticky top-0 shrink-0 bg-white px-2 pt-2",
                headerBlockAfterSearch ? "pb-0" : "pb-2",
                headerBlockBeforeSearch && "pt-1",
                classNames?.inputContainer
              )}
            >
              <input
                value={searchValue}
                onChange={(e) => handleOnSearch(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  event.stopPropagation()

                  const nextValue = searchValue?.trim()
                  if (!nextValue) return

                  onEnter?.(nextValue)
                }}
                placeholder={inputPlaceholder ?? t("search")}
                className={cn(
                  "border-border-neutral w-full rounded border px-3 py-1 text-xs font-normal text-black placeholder:text-neutral-100 focus:outline-none",
                  classNames?.input
                )}
                autoFocus={false}
              />
            </div>
          )}

          {headerBlockAfterSearch}

          {shouldShowHeaderDivider() && <div className="border-border-neutral w-full shrink-0 border-b"></div>}

          <div
            ref={itemsContainerRef}
            style={itemsContainerStyle}
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-2 [-webkit-overflow-scrolling:touch] [&>*]:shrink-0",
              classNames?.itemsContainer
            )}
            onWheel={(event) => {
              event.stopPropagation()
            }}
          >
            {!items && isLoading && (
              <div className="flex size-full items-center justify-center">
                <LoaderCircle className="animate-spin" size={14} />
              </div>
            )}
            {(items?.length === 0 || keepEmptyContent) &&
              (emptyContent ? (
                emptyContent
              ) : (
                <span className="w-full px-2 pb-2 text-center text-xs text-black">No item found.</span>
              ))}
            {!keepEmptyContent &&
              items?.map((item, index) => {
                if (!React.isValidElement(item)) return null
                const isExtraContent =
                  !!item.props?.["data-extra-content"] || (item.type as any).displayName === "SearchExtraContent"
                const isSearchPopoverItem = (item.type as { displayName?: string })?.displayName === "SearchPopoverItem"

                if (isExtraContent || isSearchPopoverItem) {
                  return item
                }

                const itemValue = item.props?.value ?? item.props?.["data-search-value"]

                return (
                  <SearchPopoverItem
                    key={itemValue ?? index.toString()}
                    value={itemValue ?? index.toString()}
                    selected={multipleSelect ? Array.isArray(value) && value.includes(itemValue) : value === itemValue}
                    onClick={(value) => handleOnChange(value)}
                    classNames={{
                      container: classNames?.itemContainer,
                      icon: classNames?.itemIcon,
                      content: classNames?.itemContent,
                    }}
                  >
                    {item}
                  </SearchPopoverItem>
                )
              })}
          </div>
          {footerComponent ? <div className="shrink-0">{footerComponent}</div> : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

SearchPopover.displayName = "SearchPopover"
export type { PropTypes as SearchPopoverProps }
