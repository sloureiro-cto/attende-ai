/**
 * Locale-aware formatting for every Attende-ai screen. Dates and times use the browser's time zone (users have no
 * time zone setting in the API). Money keeps the currency the data came with: changing the language never converts
 * USD to BRL, it only changes how the amount is written.
 */
export type AppLanguage = "english" | "portuguese" | "spanish"

const LOCALES: Record<AppLanguage, string> = { english: "en-US", portuguese: "pt-BR", spanish: "es" }

export const localeOf = (language: string): string => LOCALES[language as AppLanguage] ?? LOCALES.english

const toDate = (value: Date | string | number): Date | null => {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "22 de out. de 2026" / "Oct 22, 2026". Empty string for an invalid date (callers show their own placeholder). */
export function formatDate(value: Date | string | number, language: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
  const date = toDate(value)
  return date ? new Intl.DateTimeFormat(localeOf(language), options).format(date) : ""
}

/** "22/10/2026, 14:05" / "10/22/2026, 2:05 PM". */
export function formatDateTime(value: Date | string | number, language: string): string {
  return formatDate(value, language, { dateStyle: "short", timeStyle: "short" })
}

/** "14:05" / "2:05 PM". */
export function formatTime(value: Date | string | number, language: string): string {
  return formatDate(value, language, { hour: "2-digit", minute: "2-digit" })
}

/** "1.234" / "1,234". */
export function formatNumber(value: number, language: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeOf(language), options).format(value)
}

/** `ratio` in 0..1 -> "42%" / "42 %" as the locale writes it. */
export function formatPercent(ratio: number, language: string, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(localeOf(language), { style: "percent", maximumFractionDigits }).format(ratio)
}

/**
 * Money in its own currency (`amount` in major units, e.g. 197.5). Returns null when the amount is unknown so the
 * caller can say "not set" instead of showing a fake zero; a real 0 is formatted as zero.
 */
export function formatMoney(amount: number | null | undefined, currency: string | null | undefined, language: string): string | null {
  if (amount == null || !Number.isFinite(amount) || !currency) return null
  try {
    return new Intl.NumberFormat(localeOf(language), { style: "currency", currency: currency.toUpperCase() }).format(amount)
  } catch {
    return `${formatNumber(amount, language, { maximumFractionDigits: 2 })} ${currency.toUpperCase()}`
  }
}

/** Picks the plural form for `count` in the language: `plural(n, lang, { one: "1 conversa", other: "{count} conversas" })`. */
export function plural(count: number, language: string, forms: { zero?: string; one: string; other: string }): string {
  if (count === 0 && forms.zero !== undefined) return forms.zero.split("{count}").join(formatNumber(count, language))
  const rule = new Intl.PluralRules(localeOf(language)).select(count)
  const form = rule === "one" ? forms.one : forms.other
  return form.split("{count}").join(formatNumber(count, language))
}

export { formatRelative } from "lib/automations/relativeTime"
