"use client"

import * as Menu from "@radix-ui/react-dropdown-menu"
import { ArrowDown2, TickCircle } from "iconsax-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Dropdown, DropdownTrigger } from "components/ui/dropdown-menu"
import { actionClass } from "../ui/actionStyles"
import { MenuContent } from "../ui/Menu"

export type PickerOption = { id: string; label: string; icon?: ReactNode }

type Props = {
  /** Accessible name of the trigger (the visible value is not enough on its own). */
  label: string
  /** What the closed trigger shows. */
  value: ReactNode
  options: PickerOption[]
  disabled?: boolean
  className?: string
  emptyText?: string
  /** `field` (default) fills its column like an input; `button` is a toolbar action (secondary button look). */
  variant?: "field" | "button"
  /** Leading icon of a `button` trigger. */
  icon?: ReactNode
} & ({ multiple?: false; selected: string | null; onSelect: (id: string) => void } | { multiple: true; selected: string[]; onSelect: (ids: string[]) => void })

const ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-13 text-neutral-900 outline-none transition-colors focus:bg-neutral-10 data-[state=checked]:font-semibold data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

/**
 * A themed single / multi choice menu (Radix dropdown: keyboard, focus and `menuitemradio` / `menuitemcheckbox`
 * semantics). Used instead of a native or listbox select so the open list keeps its contrast in both themes.
 */
export function Picker(props: Props) {
  const { label, value, options, disabled, className, emptyText, variant = "field", icon } = props
  const asButton = variant === "button"
  const isChecked = (id: string) => (props.multiple ? props.selected.includes(id) : props.selected === id)
  const check = (id: string) => (
    <span aria-hidden className="ml-auto flex size-4 shrink-0 items-center justify-center text-primary-dark">
      {isChecked(id) && <TickCircle size={16} variant="Bold" />}
    </span>
  )

  return (
    <Dropdown>
      <DropdownTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={label}
          className={
            asButton
              ? actionClass({ variant: "secondary", size: "sm", className: cn("h-9 data-[state=open]:border-neutral-200 data-[state=open]:bg-neutral-10", className) })
              : cn(
            "inline-flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-neutral-50 bg-white px-3 text-left text-body-13 text-neutral-900 transition-colors hover:bg-neutral-10 disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-neutral-400",
            className
          )
          }
        >
          {asButton && icon}
          <span className={cn("flex min-w-0 items-center gap-2 truncate", !asButton && "flex-1")}>{value}</span>
          <ArrowDown2 size={14} aria-hidden className="shrink-0 text-neutral-500" />
        </button>
      </DropdownTrigger>
      <MenuContent
        align={asButton ? "end" : "start"}
        className={cn("max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] min-w-[220px] overflow-y-auto", !asButton && "w-[var(--radix-dropdown-menu-trigger-width)]")}
      >
        {options.length === 0 && emptyText && <p className="px-2.5 py-2 text-body-13 text-neutral-500">{emptyText}</p>}
        {props.multiple ? (
          options.map((o) => (
            <Menu.CheckboxItem
              key={o.id}
              className={ITEM_CLASS}
              checked={isChecked(o.id)}
              // Keep the menu open: several labels are usually picked in a row.
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) => props.onSelect(on ? [...props.selected, o.id] : props.selected.filter((s) => s !== o.id))}
            >
              {o.icon}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {check(o.id)}
            </Menu.CheckboxItem>
          ))
        ) : (
          <Menu.RadioGroup value={props.selected ?? ""} onValueChange={(v) => v && v !== props.selected && props.onSelect(v)}>
            {options.map((o) => (
              <Menu.RadioItem key={o.id} value={o.id} className={ITEM_CLASS}>
                {o.icon}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {check(o.id)}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        )}
      </MenuContent>
    </Dropdown>
  )
}
