import { formatDate, formatNumber, formatPercent } from "lib/attende/format"

/** Whole percent of a 0-1 share (e.g. 0.426 -> 43). Only for bar widths; text uses `formatShare`. */
export const pct = (share: number): number => Math.round(Math.max(0, Math.min(1, share)) * 100)

/** "43%" / "43 %" as the user's language writes it, for a 0-1 share. */
export const formatShare = (share: number, language: string): string => formatPercent(Math.max(0, Math.min(1, share)), language)

export const formatCount = (n: number, language: string): string => formatNumber(n, language)

/** `2026-10-22` -> "Oct 22" (UTC, so a day bucket never shifts with the viewer's timezone). */
export function formatDay(day: string, language: string, long = false): string {
  return formatDate(`${day}T00:00:00.000Z`, language, {
    day: "numeric",
    month: "short",
    ...(long ? { year: "numeric", weekday: "short" } : {}),
    timeZone: "UTC",
  })
}
