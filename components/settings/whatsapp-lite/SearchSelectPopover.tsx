"use client"

import { ArrowDown2 } from "iconsax-react"
import { useCallback, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { SearchOption } from "components/SearchPopover/SearchOption"
import { SearchPopover } from "components/SearchPopover/SearchPopover"
import { waSearchPopoverScrollListClass } from "./waSettingsTypography"

const triggerClass =
  "w-full min-w-0 max-w-full overflow-hidden rounded-md border border-neutral-50 bg-white font-normal shadow-sm hover:bg-neutral-10"

const popoverClassNames = {
  content: "z-[500] max-h-[min(360px,var(--radix-popper-available-height))] border border-neutral-100 p-0 shadow-sm",
  container: "flex min-h-0 w-[min(100vw-2rem,320px)] min-w-[260px] flex-col overflow-hidden",
  itemsContainer: waSearchPopoverScrollListClass,
  trigger: "w-full min-w-0",
} as const

export type SearchSelectItem = { value: string; label: string }

export function SearchSelectPopover({
  value,
  onChange,
  items,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  triggerClassNames,
}: {
  value: string
  onChange: (value: string) => void
  items: SearchSelectItem[]
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  disabled?: boolean
  triggerClassNames?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const setSearchCb = useCallback((v: string) => setSearch(v), [])

  const query = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!query) return items
    return items.filter((item) => item.label.toLowerCase().includes(query) || item.value.toLowerCase().includes(query))
  }, [items, query])

  const selected = items.find((item) => item.value === value)

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch("")
      }}
      value={value}
      onChange={(v) => {
        const raw = typeof v === "string" ? v : String(Array.isArray(v) ? v[0] ?? "" : v)
        // SearchPopover toggles the current value off (""). Nested in a dialog that
        // re-fires the click after the selection, which cleared board/column picks.
        if (!raw) {
          setOpen(false)
          setSearch("")
          return
        }
        onChange(raw)
        setOpen(false)
        setSearch("")
      }}
      searchValue={search}
      setSearchValue={setSearchCb}
      inputPlaceholder={searchPlaceholder}
      items={filtered.map((item) => (
        <SearchOption key={item.value} value={item.value} className="w-full">
          <span className="block truncate text-left text-body-14 text-neutral-900">{item.label}</span>
        </SearchOption>
      ))}
      multipleSelect={false}
      showSearchInput
      emptyContent={<div className="px-3 py-4 text-center text-body-12 text-neutral-500">{emptyLabel}</div>}
      classNames={popoverClassNames}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(
          triggerClassNames ?? triggerClass,
          "flex h-8 min-h-8 items-center gap-2 px-2.5 text-body-12 disabled:opacity-60"
        )}
        aria-haspopup="listbox"
      >
        <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-neutral-500")}>
          {selected?.label ?? (value && value !== "" ? value : placeholder)}
        </span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0", open && "rotate-180")} aria-hidden />
      </button>
    </SearchPopover>
  )
}
