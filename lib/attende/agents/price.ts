import { formatMoney } from "lib/attende/format"
import type { AgentLanguage } from "./types"

/**
 * The API stores `offerings[].price` as free text (≤ 60 characters) and the agent quotes it as written. The UI edits
 * it as structured parts (kind, currency, amount, unit) and writes one unambiguous sentence in the AGENT's language:
 * "R$ 150,00 por serviço", "a partir de US$ 39,00/mês", "sob consulta". Text that does not round-trip exactly is kept
 * as free text, untouched. The currency is always chosen by the user: it is never inferred from the UI language.
 */

export const PRICE_MAX = 60

export type PriceKind = "fixed" | "from" | "on_request"
export type PriceUnit = "none" | "month" | "year" | "service" | "unit" | "initial"
export const PRICE_KINDS: readonly PriceKind[] = ["fixed", "from", "on_request"]
export const PRICE_UNITS: readonly PriceUnit[] = ["none", "month", "year", "service", "unit", "initial"]

/** Currencies offered in the select (all with 2 decimals, so the amount never gets rounded). */
export const PRICE_CURRENCIES = ["BRL", "USD", "EUR", "GBP", "ARS", "MXN", "COP", "PEN", "UYU", "CAD"] as const

export type StructuredPrice = { kind: PriceKind; currency: string; amount: number | null; unit: PriceUnit }

/**
 * What the editor keeps for one offering while the user types (stored in the form as `__price`, stripped before
 * sending). `amount` is the text as typed in the UI language; `custom` is free text kept as is.
 */
export type PriceDraft = { mode: "none" | "custom" | PriceKind; currency: string; amount: string; unit: PriceUnit; custom: string; problem?: PriceProblem }

const APP_LANGUAGE: Record<AgentLanguage, string> = { pt: "portuguese", en: "english", es: "spanish" }

const WORDS: Record<AgentLanguage, { onRequest: string; from: string; unit: Record<Exclude<PriceUnit, "none">, string> }> = {
  pt: { onRequest: "sob consulta", from: "a partir de ", unit: { month: "/mês", year: "/ano", service: " por serviço", unit: " por unidade", initial: " (valor inicial)" } },
  en: { onRequest: "on request", from: "from ", unit: { month: "/month", year: "/year", service: " per service", unit: " per unit", initial: " (initial fee)" } },
  es: { onRequest: "a consultar", from: "desde ", unit: { month: "/mes", year: "/año", service: " por servicio", unit: " por unidad", initial: " (valor inicial)" } },
}

/** Intl puts (narrow) no-break spaces in money; the agent gets plain spaces. */
const plainSpaces = (text: string) => text.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim()

export function serializePrice(price: StructuredPrice, language: AgentLanguage): string | null {
  const words = WORDS[language]
  if (price.kind === "on_request") return words.onRequest
  if (price.amount === null || !Number.isFinite(price.amount) || price.amount < 0 || !price.currency) return null
  const money = formatMoney(price.amount, price.currency, APP_LANGUAGE[language])
  if (!money) return null
  const unit = price.unit === "none" ? "" : words.unit[price.unit]
  return plainSpaces(`${price.kind === "from" ? words.from : ""}${money}`) + unit
}

const LANGS: AgentLanguage[] = ["pt", "en", "es"]

/** Reads a price written by `serializePrice` (in any language). Anything else returns null and stays free text. */
export function parsePrice(text: string, preferred: AgentLanguage = "pt"): StructuredPrice | null {
  const source = plainSpaces(text ?? "")
  if (!source) return null
  for (const language of [preferred, ...LANGS.filter((l) => l !== preferred)]) {
    const parsed = parseIn(source, language)
    if (parsed) return parsed
  }
  return null
}

function parseIn(source: string, language: AgentLanguage): StructuredPrice | null {
  const words = WORDS[language]
  if (source.toLowerCase() === words.onRequest) return { kind: "on_request", currency: "", amount: null, unit: "none" }
  let rest = source
  let kind: PriceKind = "fixed"
  if (rest.toLowerCase().startsWith(words.from)) {
    kind = "from"
    rest = rest.slice(words.from.length)
  }
  let unit: PriceUnit = "none"
  for (const [key, suffix] of Object.entries(words.unit) as Array<[Exclude<PriceUnit, "none">, string]>) {
    if (rest.endsWith(suffix)) {
      unit = key
      rest = rest.slice(0, -suffix.length)
      break
    }
  }
  const digits = rest.replace(/[^\d.,]/g, "")
  if (!/\d/.test(digits)) return null
  for (const currency of PRICE_CURRENCIES) {
    for (const amount of candidateAmounts(digits)) {
      const candidate: StructuredPrice = { kind, currency, amount, unit }
      if (serializePrice(candidate, language) === source) return candidate
    }
  }
  return null
}

/** "1.234,50" or "1,234.50": both readings, the exact round trip picks the right one. */
function candidateAmounts(digits: string): number[] {
  const commaDecimal = Number(digits.replace(/\./g, "").replace(",", "."))
  const dotDecimal = Number(digits.replace(/,/g, ""))
  return [...new Set([commaDecimal, dotDecimal].filter((n) => Number.isFinite(n)))]
}

/**
 * Reads an amount typed in the UI language. The decimal separator of that language always wins; the other one is
 * accepted as a decimal only when it cannot be a thousands separator ("150.5" in Portuguese is 150,5; "1.500" is 1500).
 * Returns null for anything that is not a non-negative number with at most 2 decimals. Empty stays empty (≠ 0).
 */
export function parseAmountInput(input: string, appLanguage: string): number | null {
  const raw = (input ?? "").replace(/[\s  ]/g, "")
  if (!raw) return null
  const decimal = appLanguage === "english" ? "." : ","
  const group = decimal === "." ? "," : "."
  const grouped = new RegExp(`^\\d{1,3}(\\${group}\\d{3})+$`)
  let normalized: string
  if (raw.includes(decimal)) {
    const parts = raw.split(decimal)
    if (parts.length !== 2) return null
    const [int = "", frac = ""] = parts
    if (int.includes(group) && !grouped.test(int)) return null
    normalized = `${int.split(group).join("")}.${frac}`
  } else if (raw.includes(group)) {
    if (grouped.test(raw)) normalized = raw.split(group).join("")
    else if (raw.split(group).length === 2) normalized = raw.replace(group, ".")
    else return null
  } else normalized = raw
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Number(normalized)
}

/** The draft the editor starts from: the saved text read back, or free text when it does not match the format. */
export function draftFromText(text: string | undefined, preferred: AgentLanguage, appLanguage: string): PriceDraft {
  const value = (text ?? "").trim()
  const empty: PriceDraft = { mode: "none", currency: "", amount: "", unit: "none", custom: "" }
  if (!value) return empty
  const parsed = parsePrice(value, preferred)
  if (!parsed) return { ...empty, mode: "custom", custom: value }
  return {
    mode: parsed.kind,
    currency: parsed.currency,
    amount: parsed.amount === null ? "" : formatAmountInput(parsed.amount, appLanguage),
    unit: parsed.unit,
    custom: "",
  }
}

/** The amount as the user would type it (no grouping, the language's decimal separator). */
export function formatAmountInput(amount: number, appLanguage: string): string {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return appLanguage === "english" ? fixed : fixed.replace(".", ",")
}

export type PriceProblem = "currency" | "amount" | "length" | null

/** The text sent to the API for a draft (empty when there is no price), plus what is still missing. */
export function draftToText(draft: PriceDraft, language: AgentLanguage, appLanguage: string): { text: string; problem: PriceProblem } {
  if (draft.mode === "none") return { text: "", problem: null }
  if (draft.mode === "custom") {
    const text = draft.custom.trim()
    return { text, problem: text.length > PRICE_MAX ? "length" : null }
  }
  if (draft.mode === "on_request") return { text: WORDS[language].onRequest, problem: null }
  if (!draft.currency) return { text: "", problem: "currency" }
  const amount = parseAmountInput(draft.amount, appLanguage)
  if (amount === null) return { text: "", problem: "amount" }
  const text = serializePrice({ kind: draft.mode, currency: draft.currency, amount, unit: draft.unit }, language) ?? ""
  return { text, problem: !text ? "amount" : text.length > PRICE_MAX ? "length" : null }
}

/** `__price` is UI state only. */
export const isPriceDraft = (value: unknown): value is PriceDraft => !!value && typeof value === "object" && typeof (value as PriceDraft).mode === "string"
