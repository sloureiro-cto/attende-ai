import { cn } from "@/lib/utils"
import { BOTS_BRAND } from "./brand"

type Props = {
  /** Full signature (symbol + lettering). Off = the app icon alone. */
  withName?: boolean
  /** Surface it sits on. "dark" always uses the reverse signature; by default it follows the app theme. */
  tone?: "light" | "dark"
  className?: string
  /** Height in px. The full signature never goes below 36px (≈160px wide, the brandbook minimum). */
  size?: number
}

/** Signature width / height of the official artwork (public/bots-assets, extracted from the brandbook v1.1). */
const LOCKUP_RATIO = 489 / 107.2

/**
 * The Attende-ai signature from the brandbook files (never retyped: the lettering is brand art). Principal on light
 * surfaces, reverse on dark ones; the icon alone from 24px.
 */
export function BrandMark({ withName = true, tone, className, size = 32 }: Props) {
  if (!withName) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/bots-assets/logo-mark.svg" alt={BOTS_BRAND.name} width={Math.max(size, 24)} height={Math.max(size, 24)} className={cn("shrink-0", className)} />
    )
  }
  const height = Math.max(size, 36)
  const width = Math.round(height * LOCKUP_RATIO)
  const img = (src: string, extra?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={BOTS_BRAND.name} width={width} height={height} className={cn("shrink-0", extra)} />
  )
  if (tone === "dark") return <span className={cn("inline-flex", className)}>{img("/bots-assets/logo-dark.svg")}</span>
  if (tone === "light") return <span className={cn("inline-flex", className)}>{img("/bots-assets/logo-light.svg")}</span>
  return (
    <span className={cn("inline-flex", className)}>
      {img("/bots-assets/logo-light.svg", "dark:hidden")}
      {img("/bots-assets/logo-dark.svg", "hidden dark:block")}
    </span>
  )
}
