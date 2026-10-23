"use client"

import { DocumentDownload, ExportSquare } from "iconsax-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getWorkspaceInvoicesAction, type WorkspaceInvoice } from "actions/plans/getWorkspaceInvoices"
import { formatDate, formatMoney } from "lib/attende/format"
import type { BillingTranslationKey } from "lib/i18n/translations/attende/billing"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"
import { actionClass } from "../ui/actionStyles"

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; invoices: WorkspaceInvoice[] }

const STATUS: Record<string, { key: BillingTranslationKey; tone: string }> = {
  paid: { key: "billInvoiceStatusPaid", tone: "bg-primary-clean text-primary-dark" },
  open: { key: "billInvoiceStatusOpen", tone: "bg-warning-clean text-warning-darkest" },
  void: { key: "billInvoiceStatusVoid", tone: "bg-neutral-10 text-neutral-700" },
  uncollectible: { key: "billInvoiceStatusUncollectible", tone: "bg-error-clean text-error-darkest" },
  draft: { key: "billInvoiceStatusDraft", tone: "bg-neutral-10 text-neutral-700" },
}

/**
 * Workspace invoices (Stripe, via the platform's billing endpoint). Loading, empty and error are separate states; an error
 * offers a retry and is never shown as "no invoices". Amounts keep the invoice's currency (Stripe minor units).
 */
export function BillingInvoices({ workspaceId }: { workspaceId: string }) {
  const { t, language } = useAcquisitionT()
  const [state, setState] = useState<State>({ kind: "loading" })

  const load = useCallback(async () => {
    setState({ kind: "loading" })
    try {
      const result = await getWorkspaceInvoicesAction({ workspaceId })
      setState(result.success ? { kind: "ready", invoices: result.data ?? [] } : { kind: "error" })
    } catch {
      setState({ kind: "error" })
    }
  }, [workspaceId])

  useEffect(() => {
    void load()
  }, [load])

  if (state.kind === "loading") {
    return (
      <p role="status" className="text-body-13 text-neutral-700">
        {t("billInvoicesLoading")}
      </p>
    )
  }
  if (state.kind === "error") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-error-lighter bg-error-clean px-4 py-3 text-body-13 text-error-darkest">
        <span className="flex-1">{t("billInvoicesError")}</span>
        <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} onClick={() => void load()}>
          {t("billRetry")}
        </button>
      </div>
    )
  }
  if (state.invoices.length === 0) return <p className="text-body-13 text-neutral-700">{t("billInvoicesEmpty")}</p>

  return (
    <ul className="flex flex-col divide-y divide-neutral-50">
      {state.invoices.map((invoice) => {
        const status = invoice.status ? STATUS[invoice.status] : undefined
        const number = invoice.number ?? t("billInvoiceNoNumber")
        return (
          <li key={invoice.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-body-14">
            <span className="min-w-28 text-neutral-900">{formatDate(invoice.created * 1000, language)}</span>
            <span className="min-w-24 font-semibold text-neutral-900">{formatMoney(invoice.amountPaid / 100, invoice.currency, language) ?? "—"}</span>
            {status && <span className={cn("rounded-full px-2.5 py-0.5 text-body-12 font-medium", status.tone)}>{t(status.key)}</span>}
            <span className="ml-auto flex items-center gap-1">
              {invoice.hostedInvoiceUrl && (
                <a
                  href={invoice.hostedInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("billInvoiceView", { number })}
                  title={t("billInvoiceView", { number })}
                  className={actionClass({ variant: "ghost", size: "sm" })}
                >
                  <ExportSquare size={16} aria-hidden />
                </a>
              )}
              {invoice.invoicePdf && (
                <a
                  href={invoice.invoicePdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("billInvoiceDownload", { number })}
                  title={t("billInvoiceDownload", { number })}
                  className={actionClass({ variant: "ghost", size: "sm" })}
                >
                  <DocumentDownload size={16} aria-hidden />
                </a>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
