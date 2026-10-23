"use client"

import { ArrowLeft2, ArrowRight2 } from "iconsax-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { SIDEBAR_STORAGE_KEY } from "./themeScript"

const isCollapsed = () => typeof document !== "undefined" && document.documentElement.getAttribute("data-sidebar") === "collapsed"

/**
 * Collapse/expand button of the side menu. The state lives on <html data-sidebar> (restored before first
 * paint by the boot script) so the layout is pure CSS: classes with the `[[data-sidebar=collapsed]_&]:` variant.
 */
export function SidebarToggle({ labels, className }: { labels: { collapse: string; expand: string }; className?: string }) {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => setCollapsed(isCollapsed()), [])

  const toggle = () => {
    const next = !isCollapsed()
    if (next) document.documentElement.setAttribute("data-sidebar", "collapsed")
    else document.documentElement.removeAttribute("data-sidebar")
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded")
    } catch {
      // Blocked storage: the choice still applies to this page.
    }
    setCollapsed(next)
  }

  const label = collapsed ? labels.expand : labels.collapse
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-neutral-50 bg-neutral-10 text-neutral-500 transition-colors hover:text-neutral-900",
        className
      )}
    >
      {collapsed ? <ArrowRight2 size={15} aria-hidden /> : <ArrowLeft2 size={15} aria-hidden />}
    </button>
  )
}
