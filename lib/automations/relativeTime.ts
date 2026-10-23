const LOCALES: Record<string, string> = { english: "en", portuguese: "pt", spanish: "es" }

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
]

/** "2 hours ago" / "há 2 horas" / "hace 2 horas" for an ISO date, in the user's language. */
export function formatRelative(iso: string, language: string, now: Date = new Date()): string {
  const locale = LOCALES[language] ?? "en"
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return ""
  const diffSeconds = Math.round((time - now.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const abs = Math.abs(diffSeconds)
  if (abs < 45) return rtf.format(0, "second")
  for (const [unit, seconds] of UNITS) {
    if (abs >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit)
  }
  return rtf.format(Math.round(diffSeconds / 60) || -1, "minute")
}
