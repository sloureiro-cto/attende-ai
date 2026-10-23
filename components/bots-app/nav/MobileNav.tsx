"use client"

import { More } from "iconsax-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "components/ui/sheet"
import { BookDemoButton } from "./BookDemoButton"
import { isNavActive, MOBILE_TAB_IDS, NAV_ITEMS } from "./navItems"
import { PrimaryNav } from "./PrimaryNav"
import { useAttendeT } from "./useAttendeT"

type Props = {
  className?: string
  /** Rendered at the bottom of the "More" sheet (usage meters). */
  footer?: ReactNode
}

const TAB = "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-body-11 font-medium no-underline transition-colors"

/** Bottom tab bar for phones: the four main sections plus "More", which opens the full menu in a sheet. */
export function MobileNav({ className, footer }: Props) {
  const { t } = useAttendeT()
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(false)
  const tabs = NAV_ITEMS.filter((item) => MOBILE_TAB_IDS.includes(item.id))
  const moreActive = !tabs.some((item) => isNavActive(pathname, item.href)) && NAV_ITEMS.some((item) => isNavActive(pathname, item.href))

  return (
    <nav
      aria-label={t("navMain")}
      className={cn("fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-border bg-white pb-[env(safe-area-inset-bottom)] shadow-top-sm", className)}
    >
      {tabs.map((item) => {
        const active = isNavActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(TAB, active ? "font-semibold text-primary-dark" : "text-neutral-400")}
          >
            <Icon size={22} variant={active ? "Bold" : "Linear"} aria-hidden />
            {t(item.labelKey)}
          </Link>
        )
      })}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button type="button" aria-label={t("navOpenMenu")} className={cn(TAB, moreActive ? "font-semibold text-primary-dark" : "text-neutral-400")}>
            <More size={22} aria-hidden />
            {t("navMore")}
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-[300px] flex-col gap-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("navMenuTitle")}</SheetTitle>
            <SheetDescription className="sr-only">{t("navMenuDescription")}</SheetDescription>
          </SheetHeader>
          <PrimaryNav variant="list" onNavigate={() => setOpen(false)} />
          <div className="mt-2 flex flex-col gap-2 border-t border-neutral-50 pt-4">
            <p className="text-body-12 text-neutral-400">{t("bookDemoHint")}</p>
            <BookDemoButton appearance="solid" className="h-10 justify-center" />
          </div>
          {footer && <div className="mt-auto flex flex-col gap-3 border-t border-neutral-50 pt-4">{footer}</div>}
        </SheetContent>
      </Sheet>
    </nav>
  )
}
