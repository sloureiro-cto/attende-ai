"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { isNavActive, NAV_GROUPS, NAV_ITEMS } from "./navItems"
import { useAttendeT } from "./useAttendeT"

type Props = {
  className?: string
  /** `sidebar` = desktop side menu; `list` = the mobile "More" sheet (larger touch targets). */
  variant?: "sidebar" | "list"
  /** Called after a link is chosen (the sheet closes itself). */
  onNavigate?: () => void
}

/** Primary navigation, grouped. The active item is derived from the pathname and exposed through `aria-current`. */
export function PrimaryNav({ className, variant = "sidebar", onNavigate }: Props) {
  const { t } = useAttendeT()
  const pathname = usePathname() ?? ""

  return (
    <nav aria-label={t("navMain")} className={cn("flex flex-col", className)}>
      {NAV_GROUPS.map((group, index) => (
        <div key={group} className="flex flex-col gap-0.5">
          {index > 0 && <div className="mx-2.5 my-2 h-px bg-neutral-50 [[data-sidebar=collapsed]_&]:mx-1" role="separator" />}
          {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
            const active = isNavActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                title={t(item.labelKey)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 font-medium no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                  variant === "sidebar" ? "h-[34px] text-body-14" : "h-11 text-body-16",
                  active ? "bg-primary-clean font-semibold text-primary-dark" : "text-neutral-400 hover:bg-neutral-10 hover:text-neutral-900"
                )}
              >
                <Icon size={17} variant={active ? "Bold" : "Linear"} aria-hidden className="shrink-0" />
                {/* Only the desktop rail collapses; the phone sheet always shows labels. */}
                <span className={cn("truncate", variant === "sidebar" && "[[data-sidebar=collapsed]_&]:sr-only")}>{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
