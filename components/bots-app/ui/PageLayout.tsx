import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  title: ReactNode
  /** One short line under the title. Leave it out when the title says enough. */
  subtitle?: ReactNode
  /** Buttons on the right of the title bar (primary action last). */
  actions?: ReactNode
  /** Tabs, search or filters that belong to the whole page: a second row of the bar. */
  toolbar?: ReactNode
  /** `wide` for tables and grids, `narrow` for forms and settings. */
  width?: "wide" | "narrow"
  className?: string
  children: ReactNode
}

/**
 * Every page of the app has the same frame as the inbox: an edge-to-edge title bar on the surface (title,
 * optional subtitle, actions, optional toolbar), then the content on the page ground with one padding.
 * The shell renders these routes without its own padding (see EDGE_TO_EDGE_ROUTES in BotsShell).
 */
export function PageLayout({ title, subtitle, actions, toolbar, width = "wide", className, children }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-14 z-30 border-b border-neutral-border bg-white/90 backdrop-blur-md lg:top-0">
        <div className="flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          {/* basis: the title keeps a readable width; when it can't, the actions wrap to the next line. */}
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="truncate text-[18px] font-semibold leading-tight tracking-[-0.01em] text-neutral-900">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-body-13 text-neutral-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {toolbar && <div className="px-4 pb-3 sm:px-6 lg:px-8">{toolbar}</div>}
      </header>
      <div className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
        <div className={cn("mx-auto w-full", width === "narrow" ? "max-w-3xl" : "max-w-[1440px]", className)}>{children}</div>
      </div>
    </div>
  )
}
