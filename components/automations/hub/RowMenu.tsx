"use client"

import { More } from "iconsax-react"
import { MenuContent, MenuItem } from "components/automations/ui/Menu"
import IconButton from "components/IconButton/IconButton"
import { Dropdown, DropdownSeparator, DropdownTrigger } from "components/ui/dropdown-menu"

type RowMenuItem = { id: string; label: string; onSelect: () => void; danger?: boolean }

/** The "more" menu of a hub row / card. */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <IconButton type="button" size="medium" variant="ghost" aria-label={label} icon={<More size={16} />} />
      </DropdownTrigger>
      <MenuContent align="end">
        {items.map((item, i) => (
          <div key={item.id}>
            {item.danger && i > 0 && <DropdownSeparator className="my-1 h-px bg-neutral-50" />}
            <MenuItem danger={item.danger} onSelect={item.onSelect}>
              {item.label}
            </MenuItem>
          </div>
        ))}
      </MenuContent>
    </Dropdown>
  )
}
