"use client"

import { Moon, Sun1 } from "iconsax-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { type BotsTheme, THEME_STORAGE_KEY } from "./themeScript"

function currentTheme(): BotsTheme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
}

/** The active theme and a setter that applies it to <html> and remembers it on this device. */
export function useBotsTheme() {
  const [theme, setThemeState] = useState<BotsTheme>("light")

  useEffect(() => setThemeState(currentTheme()), [])

  const setTheme = useCallback((next: BotsTheme) => {
    document.documentElement.setAttribute("data-theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private mode or blocked storage: the choice still applies to this page.
    }
    setThemeState(next)
  }, [])

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }
}

/** Sun/moon button. The label names what a click does, so screen readers hear the action. */
export function ThemeToggle({ labels, className }: { labels: { toDark: string; toLight: string }; className?: string }) {
  const { theme, toggle } = useBotsTheme()
  const label = theme === "dark" ? labels.toLight : labels.toDark
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-neutral-50 bg-neutral-10 text-neutral-500 transition-colors hover:text-neutral-900",
        className
      )}
    >
      {theme === "dark" ? <Sun1 size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  )
}
