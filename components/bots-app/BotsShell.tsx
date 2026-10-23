"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import { AccountMenu } from "./AccountMenu"
import { BOTS_ROUTES } from "./brand"
import { BrandMark } from "./BrandMark"
import { LinesStatus, LinesStatusPill } from "./LinesStatusPill"
import { BookDemoButton } from "./nav/BookDemoButton"
import { MobileNav } from "./nav/MobileNav"
import { PrimaryNav } from "./nav/PrimaryNav"
import { TrialBanner, TrialBannerProps } from "./nav/TrialBanner"
import { useAttendeT } from "./nav/useAttendeT"
import { SidebarToggle } from "./sidebar"
import { ThemeToggle } from "./theme"
import { useBotsAppT } from "./useBotsAppT"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"

/** Routes rendered without the shell's padding: they use PageLayout (or fill the screen, like the inbox). */
export const EDGE_TO_EDGE_ROUTES: readonly string[] = [
  BOTS_ROUTES.inbox,
  BOTS_ROUTES.funnel,
  BOTS_ROUTES.lines,
  BOTS_ROUTES.reports,
  BOTS_ROUTES.team,
  BOTS_ROUTES.billing,
  BOTS_ROUTES.me,
  BOTS_ROUTES.start,
  BOTS_ROUTES.onboarding,
  BOTS_ROUTES.agents,
]
/** Same, but only the list page itself (its sub-pages still bring their own heading). */
export const EDGE_TO_EDGE_EXACT_ROUTES: readonly string[] = [BOTS_ROUTES.bots]

type Props = {
  children: ReactNode
  /** Lines health (static). Omit to hide it (the lines feature provides it). */
  lines?: LinesStatus
  /** Live lines health for the side menu (self-fetching). Takes precedence over `lines`. Kept as a slot so the shell stays free of server-action imports. */
  linesSlot?: ReactNode
  /** Live lines health for the phone header (the `icon` variant of the same component). */
  linesCompactSlot?: ReactNode
  /** Pages that own their full canvas (the bot builder) can opt out of the padded container. */
  bleed?: boolean
  /** Subscription state for the trial/billing strip above the content. Omit to hide it. */
  trial?: TrialBannerProps
  /** Usage meters (lines, replies, seats). Shown at the foot of the side menu and of the mobile "More" sheet. */
  usageSlot?: ReactNode
}

/**
 * Chrome of every signed-in page. Desktop: a side menu (brand, workspace, grouped sections, lines health, demo CTA,
 * account). Phone: a slim header (brand, workspace, lines, account) and a bottom tab bar.
 */
export function BotsShell({ children, lines, linesSlot, linesCompactSlot, bleed = false, trial, usageSlot }: Props) {
  const { t } = useBotsAppT()
  const { t: tNav } = useAttendeT()
  /** Pages that draw their own frame (PageLayout, or the full-height inbox) run edge to edge next to the menu. */
  const pathname = usePathname() ?? ""
  const edgeToEdge =
    EDGE_TO_EDGE_EXACT_ROUTES.includes(pathname) || EDGE_TO_EDGE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  const sidebarLines = linesSlot ?? (lines && <LinesStatusPill status={lines} />)
  const compactLines = linesCompactSlot ?? (lines && <LinesStatusPill status={lines} variant="icon" />)

  return (
    <div className="min-h-screen bg-[rgb(var(--bots-surface))] lg:flex">
      <a
        href="#bots-main"
        className="sr-only z-[500] rounded-md bg-white px-3 py-2 text-body-13 font-semibold text-neutral-900 shadow-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t("skipToContent")}
      </a>

      {/* Collapsed (html[data-sidebar=collapsed]): 64px rail with icons only; labels stay for screen readers. */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col gap-4 border-r border-neutral-border bg-white px-2.5 py-3.5 transition-[width] duration-200 lg:flex [[data-sidebar=collapsed]_&]:w-16">
        <div className="overflow-hidden [[data-sidebar=collapsed]_&]:w-11">
          <WorkspaceSwitcher variant="block" />
        </div>
        <PrimaryNav variant="sidebar" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden" />
        <div className="flex flex-col gap-1.5">
          <div className="[[data-sidebar=collapsed]_&]:hidden">{sidebarLines}</div>
          <div className="hidden justify-center [[data-sidebar=collapsed]_&]:flex">{compactLines}</div>
          {usageSlot && <div className="flex flex-col gap-3 rounded-lg border border-neutral-50 p-3 [[data-sidebar=collapsed]_&]:hidden">{usageSlot}</div>}
          <BookDemoButton appearance="ghost" short rail className="w-full [[data-sidebar=collapsed]_&]:mx-auto" />
          <div className="flex items-center gap-1.5 border-t border-neutral-50 pt-2 [[data-sidebar=collapsed]_&]:flex-col">
            <div className="min-w-0 flex-1 overflow-hidden [[data-sidebar=collapsed]_&]:w-11 [[data-sidebar=collapsed]_&]:flex-none">
              <AccountMenu variant="row" />
            </div>
            <ThemeToggle labels={{ toDark: tNav("themeToDark"), toLight: tNav("themeToLight") }} />
            <SidebarToggle labels={{ collapse: tNav("sidebarCollapse"), expand: tNav("sidebarExpand") }} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-neutral-border bg-white/90 px-3 backdrop-blur-md lg:hidden">
          <Link href={BOTS_ROUTES.start} aria-label={tNav("navHome")} className="shrink-0 rounded-lg">
            <BrandMark size={28} withName={false} />
          </Link>
          <WorkspaceSwitcher variant="compact" className="flex-1" />
          {compactLines}
          <ThemeToggle labels={{ toDark: tNav("themeToDark"), toLight: tNav("themeToLight") }} className="size-10 border-0 bg-transparent" />
          <AccountMenu />
        </header>
        {trial && <TrialBanner {...trial} />}
        <main
          id="bots-main"
          className={
            edgeToEdge
              ? "min-w-0 flex-1"
              : bleed
                ? "flex-1 pb-16 lg:pb-0"
                : "mx-auto w-full max-w-screen-xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8"
          }
        >
          {children}
        </main>
      </div>

      <MobileNav className="lg:hidden" footer={usageSlot} />
    </div>
  )
}
