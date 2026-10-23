"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { OFFERING_LIMITS } from "lib/attende/agents/form"
import { draftFromText, draftToText, isPriceDraft, parseAmountInput, PRICE_CURRENCIES, PRICE_MAX, type PriceDraft, type PriceProblem, type PriceUnit } from "lib/attende/agents/price"
import type { AgentLanguage } from "lib/attende/agents/types"
import { formatMoney, formatNumber, localeOf } from "lib/attende/format"
import { controlClass, fieldId } from "./classes"
import { actionClass } from "../../ui/actionStyles"
import { ConfirmDialog } from "../ConfirmDialog"
import type { AttendeAgentsT } from "../useAttendeAgentsT"

type Row = Record<string, unknown> & { name?: string; description?: string; price?: string; __price?: PriceDraft }

type Props = {
  path: string
  rows: Row[]
  onChange: (rows: Row[]) => void
  /** The language the agent writes in: the price sentence is written in it. */
  agentLanguage: AgentLanguage
  /** The screen's language: how amounts are typed and labels shown. */
  appLanguage: string
  t: AttendeAgentsT
  max?: number
  /** The step was validated: show what is still missing in each row. */
  invalid?: boolean
  /** Agent page: a compact list (name, price type, value, period) with Edit/Remove; the full form only for one item. */
  compact?: boolean
}

const MODES: Array<{ value: PriceDraft["mode"]; key: Parameters<AttendeAgentsT>[0] }> = [
  { value: "none", key: "priceModeNone" },
  { value: "fixed", key: "priceModeFixed" },
  { value: "from", key: "priceModeFrom" },
  { value: "on_request", key: "priceModeOnRequest" },
  { value: "custom", key: "priceModeCustom" },
]

const UNITS: Array<{ value: PriceUnit; key: Parameters<AttendeAgentsT>[0] }> = [
  { value: "none", key: "priceUnitNone" },
  { value: "month", key: "priceUnitMonth" },
  { value: "year", key: "priceUnitYear" },
  { value: "service", key: "priceUnitService" },
  { value: "unit", key: "priceUnitUnit" },
  { value: "initial", key: "priceUnitInitial" },
]

function currencyName(code: string, appLanguage: string): string {
  try {
    return new Intl.DisplayNames([localeOf(appLanguage)], { type: "currency" }).of(code) ?? code
  } catch {
    return code
  }
}

/**
 * Products and services, each with a structured price: type (fixed, starting at, on request, free text), currency
 * (always chosen, never guessed from the language), amount typed the way the user's language writes numbers, and the
 * period. The API keeps one text per price, so the row stores the sentence the agent will read (`price`) and the parts
 * being edited (`__price`, never sent). Prices saved in another format stay as free text, untouched.
 */
export function OfferingsField({ path, rows, onChange, agentLanguage, appLanguage, t, max, invalid = false, compact = false }: Props) {
  const [editing, setEditing] = useState<number | null>(null)
  const [toRemove, setToRemove] = useState<number | null>(null)
  const atLimit = max !== undefined && rows.length >= max
  const example = formatNumber(1234.56, appLanguage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const draftOf = (row: Row): PriceDraft => (isPriceDraft(row.__price) ? row.__price : draftFromText(row.price, agentLanguage, appLanguage))
  /** The currency already used in this list, so a new price does not ask again. Never the UI language's currency. */
  const knownCurrency = rows.map(draftOf).find((d) => d.currency)?.currency ?? ""

  const setRow = (index: number, patch: Partial<Row>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const setPrice = (index: number, change: Partial<PriceDraft>) => {
    const current = draftOf(rows[index]!)
    let next: PriceDraft = { ...current, ...change }
    if ((next.mode === "fixed" || next.mode === "from") && !next.currency) next = { ...next, currency: knownCurrency }
    if (change.mode === "custom" && !next.custom) next = { ...next, custom: rows[index]?.price ?? "" }
    const { text, problem } = draftToText(next, agentLanguage, appLanguage)
    setRow(index, { price: text, __price: { ...next, problem } })
  }

  /** "Starting at · US$ 39.00 · Monthly", "On request", "No value" (≠ R$ 0,00), or the free text as saved. */
  const priceLine = (draft: PriceDraft): string => {
    if (draft.mode === "none") return t("reviewPriceNone")
    if (draft.mode === "on_request") return t("priceModeOnRequest")
    if (draft.mode === "custom") return draft.custom
    const amount = parseAmountInput(draft.amount, appLanguage)
    const money = amount === null ? t("reviewPriceNone") : (formatMoney(amount, draft.currency, appLanguage) ?? t("reviewPriceNone"))
    const parts = [t(draft.mode === "from" ? "priceModeFrom" : "priceModeFixed"), money]
    if (draft.unit !== "none") parts.push(t(UNITS.find((u) => u.value === draft.unit)!.key))
    return parts.join(" · ")
  }

  const problemText = (problem: PriceProblem): string | null => {
    if (problem === "currency") return t("priceProblemCurrency")
    if (problem === "amount") return t("priceProblemAmount", { example })
    if (problem === "length") return t("priceProblemLength", { limit: PRICE_MAX })
    return null
  }

  const fullRow = (row: Row, index: number, footer: ReactNode) => {
        const base = `${fieldId(path)}-${index}`
        const draft = draftOf(row)
        const { text, problem } = draftToText(draft, agentLanguage, appLanguage)
        // Show a missing part once the user typed something, or after Continue was pressed.
        const visibleProblem = problem && (invalid || problem === "length" || (problem === "amount" && draft.amount.trim() !== "")) ? problem : null
        const priced = draft.mode === "fixed" || draft.mode === "from"
        const nameMissing = invalid && !(row.name ?? "").trim()
        return (
          <div key={index} className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-neutral-10/60 p-4" role="group" aria-label={t("rowItem", { number: index + 1 })}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                <label htmlFor={`${base}-name`} className="text-body-12 font-medium text-neutral-600">
                  {t("offeringName")}
                </label>
                <input id={`${base}-name`} type="text" value={row.name ?? ""} maxLength={OFFERING_LIMITS.name} aria-invalid={nameMissing || undefined} onChange={(e) => setRow(index, { name: e.target.value })} className={controlClass} />
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                <label htmlFor={`${base}-description`} className="text-body-12 font-medium text-neutral-600">
                  {t("offeringDescription")}
                  <span className="ml-1.5 font-normal text-neutral-400">({t("optional")})</span>
                </label>
                <input id={`${base}-description`} type="text" value={row.description ?? ""} maxLength={OFFERING_LIMITS.description} onChange={(e) => setRow(index, { description: e.target.value })} className={controlClass} />
              </div>
            </div>

            <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border border-neutral-border bg-white p-3">
              <legend className="px-1 text-body-12 font-semibold text-neutral-700">{t("priceLabel")}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`${base}-mode`} className="text-body-12 font-medium text-neutral-600">
                    {t("priceType")}
                  </label>
                  <select id={`${base}-mode`} value={draft.mode} onChange={(e) => setPrice(index, { mode: e.target.value as PriceDraft["mode"] })} className={controlClass}>
                    {MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {t(m.key)}
                      </option>
                    ))}
                  </select>
                </div>
                {priced && (
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={`${base}-currency`} className="text-body-12 font-medium text-neutral-600">
                      {t("priceCurrency")}
                    </label>
                    <select
                      id={`${base}-currency`}
                      value={draft.currency}
                      aria-invalid={visibleProblem === "currency" || undefined}
                      aria-describedby={visibleProblem === "currency" ? `${base}-problem` : undefined}
                      onChange={(e) => setPrice(index, { currency: e.target.value })}
                      className={controlClass}
                    >
                      <option value="">{t("priceCurrencyPlaceholder")}</option>
                      {PRICE_CURRENCIES.map((code) => (
                        <option key={code} value={code}>
                          {t("priceCurrencyOption", { code, name: currencyName(code, appLanguage) })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {priced && (
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={`${base}-amount`} className="text-body-12 font-medium text-neutral-600">
                      {t("priceAmount")}
                    </label>
                    <input
                      id={`${base}-amount`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={draft.amount}
                      placeholder={t("priceAmountExample", { example })}
                      aria-invalid={visibleProblem === "amount" || undefined}
                      aria-describedby={visibleProblem === "amount" ? `${base}-problem` : undefined}
                      onChange={(e) => setPrice(index, { amount: e.target.value })}
                      className={controlClass}
                    />
                  </div>
                )}
                {priced && (
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={`${base}-unit`} className="text-body-12 font-medium text-neutral-600">
                      {t("priceUnit")}
                    </label>
                    <select id={`${base}-unit`} value={draft.unit} onChange={(e) => setPrice(index, { unit: e.target.value as PriceUnit })} className={controlClass}>
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {t(u.key)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {draft.mode === "custom" && (
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={`${base}-custom`} className="text-body-12 font-medium text-neutral-600">
                      {t("priceCustomText")}
                    </label>
                    <input
                      id={`${base}-custom`}
                      type="text"
                      value={draft.custom}
                      maxLength={PRICE_MAX}
                      aria-invalid={visibleProblem === "length" || undefined}
                      onChange={(e) => setPrice(index, { custom: e.target.value })}
                      className={controlClass}
                    />
                  </div>
                )}
              </div>
              {visibleProblem ? (
                <p id={`${base}-problem`} className="text-body-13 font-medium text-error-dark">
                  {problemText(visibleProblem)}
                </p>
              ) : (
                <p className="text-body-13 text-neutral-600" aria-live="polite">
                  {draft.mode === "none" ? t("priceNoneNote") : text ? t("pricePreview", { text }) : null}
                  {draft.mode === "custom" && text ? <span className="block text-body-12 text-neutral-500">{t("priceCustomNote")}</span> : null}
                </p>
              )}
            </fieldset>

            {footer}
          </div>
        )
  }

  return (
    <div className="flex flex-col gap-3">
      {compact ? (
        rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-border p-4 text-body-14 text-neutral-600">{t("productsZero")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-50 rounded-2xl border border-neutral-border bg-white" aria-label={t("productsListAria")}>
            {rows.map((row, index) =>
              editing === index ? (
                <li key={index} className="p-2">
                  {fullRow(row, index, (
                    <button type="button" onClick={() => setEditing(null)} className={actionClass({ variant: "secondary", size: "md", className: "w-fit" })}>
                      {t("offeringDone")}
                    </button>
                  ))}
                </li>
              ) : (
                <li key={index} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  {/* basis: on a phone the text keeps the full width and the actions go to the next line. */}
                  <span className="flex min-w-0 flex-1 basis-48 flex-col">
                    <span className="break-words text-body-14 font-medium text-neutral-900">{(row.name ?? "").trim() || t("offeringUnnamed")}</span>
                    <span className="text-body-13 text-neutral-600">{priceLine(draftOf(row))}</span>
                  </span>
                  <button type="button" onClick={() => setEditing(index)} aria-label={t("offeringEditNamed", { name: (row.name ?? "").trim() || t("offeringUnnamed") })} className={actionClass({ variant: "ghost", size: "sm" })}>
                    <Pencil className="size-3.5" aria-hidden />
                    {t("actionEdit")}
                  </button>
                  <button type="button" onClick={() => setToRemove(index)} aria-label={t("offeringRemoveNamed", { name: (row.name ?? "").trim() || t("offeringUnnamed") })} className={actionClass({ variant: "ghost", size: "sm" })}>
                    <Trash2 className="size-3.5" aria-hidden />
                    {t("removeItem")}
                  </button>
                </li>
              )
            )}
          </ul>
        )
      ) : (
        rows.map((row, index) =>
          fullRow(row, index, (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-body-13 font-medium text-neutral-600 hover:text-error-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Trash2 className="size-4" aria-hidden />
              {t("removeItem")}
              <span className="sr-only">: {t("rowItem", { number: index + 1 })}</span>
            </button>
          ))
        )
      )}
      <button
        type="button"
        disabled={atLimit}
        onClick={() => {
          onChange([...rows, { name: "", description: "", price: "" }])
          if (compact) setEditing(rows.length)
        }}
        className={cn(
          "inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-dashed border-primary px-4 text-body-14 font-semibold text-primary-dark transition-colors hover:bg-primary-clean",
          "disabled:cursor-not-allowed disabled:border-neutral-border disabled:text-neutral-400"
        )}
      >
        <Plus className="size-4" aria-hidden />
        {t("addOffering")}
      </button>
      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={t("offeringRemoveTitle")}
        description={t("offeringRemoveBody", { name: toRemove !== null ? (rows[toRemove]?.name ?? "").trim() || t("offeringUnnamed") : "" })}
        confirmLabel={t("removeItem")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          if (toRemove !== null) onChange(rows.filter((_, i) => i !== toRemove))
          setEditing(null)
          setToRemove(null)
        }}
        tone="danger"
      />
    </div>
  )
}
