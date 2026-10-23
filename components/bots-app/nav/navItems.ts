import { Card, Chart2, Cpu, Filter, Hierarchy, Home2, MessageText1, Mobile, People } from "iconsax-react"
import type { NavTranslationKey } from "lib/i18n/translations/attende/nav"
import { BOTS_ROUTES } from "../brand"

export type NavGroupId = "main" | "more"
export type NavIcon = typeof Home2
export type NavItem = { id: string; href: string; labelKey: NavTranslationKey; group: NavGroupId; icon: NavIcon }

/** Day-to-day sections first, setup and admin after a divider. */
export const NAV_GROUPS: readonly NavGroupId[] = ["main", "more"] as const

/** Primary navigation of the self-serve product, in display order (grouped in the sidebar). */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", href: BOTS_ROUTES.start, labelKey: "navHome", group: "main", icon: Home2 },
  { id: "inbox", href: BOTS_ROUTES.inbox, labelKey: "navInbox", group: "main", icon: MessageText1 },
  { id: "funnel", href: BOTS_ROUTES.funnel, labelKey: "navFunnel", group: "main", icon: Filter },
  { id: "agents", href: BOTS_ROUTES.agents, labelKey: "navAgents", group: "main", icon: Cpu },
  { id: "lines", href: BOTS_ROUTES.lines, labelKey: "navLines", group: "more", icon: Mobile },
  { id: "bots", href: BOTS_ROUTES.bots, labelKey: "navBots", group: "more", icon: Hierarchy },
  { id: "reports", href: BOTS_ROUTES.reports, labelKey: "navReports", group: "more", icon: Chart2 },
  { id: "team", href: BOTS_ROUTES.team, labelKey: "navTeam", group: "more", icon: People },
  { id: "billing", href: BOTS_ROUTES.billing, labelKey: "navBilling", group: "more", icon: Card },
] as const

/** The sections that get their own tab in the mobile bottom bar; the rest live behind "More". */
export const MOBILE_TAB_IDS: readonly string[] = ["home", "inbox", "funnel", "agents"]

/** A section is active for its own path and every path below it (`/bots/abc/stats` keeps "Bots" active). */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
