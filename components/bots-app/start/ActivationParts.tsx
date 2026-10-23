"use client"

import { InfoCircle, Refresh2, TickCircle, Warning2 } from "iconsax-react"
import { useRouter } from "next/navigation"
import { useCallback, useTransition } from "react"
import { cn } from "@/lib/utils"
import type { StepState } from "lib/attende/activation"
import { formatPercent } from "lib/attende/format"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"
import { actionClass } from "../ui/actionStyles"
import { PremiumCard } from "../ui/PremiumCard"

/** Re-reads the server data of the page (channels, agents, inbox) without a full reload. */
export function useRefresh() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const refresh = useCallback(() => start(() => router.refresh()), [router])
  return { refresh, pending }
}

/** Number while to do, a check when done, an info mark when it could not be checked. The state is always also written in text by the caller. */
export function StepBadge({ state, index, active = false }: { state: StepState; index: number; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-body-13 font-semibold",
        state === "done" && "bg-primary-dark text-white",
        state === "unknown" && "bg-warning-clean text-warning-darkest ring-1 ring-inset ring-warning-lighter",
        state === "todo" && (active ? "bg-neutral-900 text-white" : "bg-neutral-10 text-neutral-700 ring-1 ring-inset ring-neutral-50")
      )}
    >
      {state === "done" ? <TickCircle size={18} variant="Bold" /> : state === "unknown" ? <InfoCircle size={18} /> : index + 1}
    </span>
  )
}

export function StateLabel({ state, children }: { state: StepState; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-body-12 font-semibold",
        state === "done" && "bg-primary-clean text-primary-darkest",
        state === "unknown" && "bg-warning-clean text-warning-darkest",
        state === "todo" && "bg-neutral-10 text-neutral-700"
      )}
    >
      {children}
    </span>
  )
}

export function ActivationProgress({ done, total, className }: { done: number; total: number; className?: string }) {
  const { t, language } = useAcquisitionT()
  const ratio = total > 0 ? done / total : 0
  const label = t("actProgress", { done, total })
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-body-13">
        <span className="font-medium text-neutral-900">{label}</span>
        <span className="tabular-nums text-neutral-700">{formatPercent(ratio, language)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={t("actProgressAria")}
        aria-valuetext={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-neutral-50"
      >
        <div
          className="h-full rounded-full bg-primary-dark transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

/** Yellow notice for partially loaded data, with a retry. */
export function PartialNotice({ message }: { message: string }) {
  const { t } = useAcquisitionT()
  const { refresh, pending } = useRefresh()
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning-lighter bg-warning-clean px-4 py-3 text-body-13 text-warning-darkest">
      <Warning2 size={18} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <button type="button" onClick={refresh} disabled={pending} className={actionClass({ variant: "secondary", size: "sm" })}>
        <Refresh2 size={14} aria-hidden />
        {pending ? t("actRetrying") : t("actRetry")}
      </button>
    </div>
  )
}

/** Nothing could be read: say so and offer a retry, instead of an all-to-do checklist. */
export function ActivationError() {
  const { t } = useAcquisitionT()
  const { refresh, pending } = useRefresh()
  return (
    <PremiumCard role="alert" className="flex flex-col items-start gap-4 p-6 sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-full bg-error-clean text-error-darkest">
        <Warning2 size={22} aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("actErrorTitle")}</h2>
        <p className="max-w-xl text-body-14 text-neutral-700">{t("actErrorText")}</p>
      </div>
      <button type="button" onClick={refresh} disabled={pending} className={actionClass()}>
        <Refresh2 size={16} aria-hidden />
        {pending ? t("actRetrying") : t("actRetry")}
      </button>
    </PremiumCard>
  )
}
