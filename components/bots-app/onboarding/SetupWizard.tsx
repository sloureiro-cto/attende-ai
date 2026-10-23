"use client"

import { ArrowLeft2, ArrowRight2, Refresh2, TickCircle } from "iconsax-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { ACTIVATION_STEPS, type ActivationStepId, activationUnreadable, computeActivation } from "lib/attende/activation"
import type { ActivationData } from "lib/attende/activationData"
import { BOTS_ROUTES } from "../brand"
import { useActivationCopy } from "../start/activationCopy"
import { ActivationError, ActivationProgress, PartialNotice, StateLabel, StepBadge, useRefresh } from "../start/ActivationParts"
import { actionClass } from "../ui/actionStyles"
import { PageLayout } from "../ui/PageLayout"
import { PremiumCard } from "../ui/PremiumCard"

const WhatsAppConnect = dynamic(() => import("../lines/WhatsAppConnect").then((m) => m.WhatsAppConnect), { ssr: false })

type Props = { data: ActivationData }

/**
 * Guided setup: the same five steps, states and wording as the home checklist, one step at a time. Nothing is stored in
 * the browser and nothing can be ticked by hand: every state is read from the API, and "Check again" re-reads it.
 */
export function SetupWizard({ data }: Props) {
  const activation = computeActivation(data)
  const { t, describe } = useActivationCopy(activation)
  const { refresh, pending } = useRefresh()
  const [chosen, setChosen] = useState<ActivationStepId | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)

  if (activationUnreadable(data)) {
    return (
      <PageLayout title={t("onbTitle")} width="narrow">
        <ActivationError />
      </PageLayout>
    )
  }

  const currentId: ActivationStepId = chosen ?? activation.next?.id ?? "activate"
  const index = ACTIVATION_STEPS.indexOf(currentId)
  const step = activation.steps[index]!
  const copy = describe(step)
  const nextId = activation.next?.id
  const primary = !activation.activated && step.state !== "done"
  const offerWhatsApp = step.id === "channel" && step.state !== "done"

  return (
    <PageLayout title={t("onbTitle")} subtitle={t("onbSubtitle")}>
      <div className="flex flex-col gap-6">
        {activation.partial && <PartialNotice message={t("actPartial")} />}

        {activation.activated && (
          <PremiumCard className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-clean text-primary-dark">
              <TickCircle size={24} variant="Bold" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-body-16 font-semibold text-neutral-900">{t("onbActivatedTitle")}</h2>
              <p className="text-body-14 text-neutral-700">{t("onbActivatedText")}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={BOTS_ROUTES.inbox} className={actionClass()}>
                {t("dailyOpenConversations")}
              </Link>
              <Link href={BOTS_ROUTES.start} className={actionClass({ variant: "secondary" })}>
                {t("onbGoHome")}
              </Link>
            </div>
          </PremiumCard>
        )}

        <ActivationProgress done={activation.done} total={activation.total} className="max-w-2xl" />

        <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8">
          <ol className="-mx-1 flex flex-row gap-2 overflow-x-auto p-1 md:mx-0 md:flex-col md:overflow-visible md:p-0" aria-label={t("onbStepsAria")}>
            {activation.steps.map((s, i) => {
              const active = s.id === currentId
              const sCopy = describe(s)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setChosen(s.id)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full min-w-[200px] items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-[background-color,border-color,box-shadow] duration-150",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active
                        ? "border-primary-dark bg-primary-clean ring-1 ring-inset ring-primary-dark"
                        : "border-neutral-50 bg-white hover:border-neutral-200 hover:bg-neutral-10"
                    )}
                  >
                    <StepBadge state={s.state} index={i} active={s.id === nextId} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("text-body-14", active ? "font-semibold text-neutral-900" : "font-medium text-neutral-800")}>{sCopy.title}</span>
                      <span className="text-body-12 text-neutral-700">{sCopy.state}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <PremiumCard className="flex min-h-[340px] flex-col gap-6 p-5 sm:p-8">
            <div className="flex flex-col gap-2">
              <span className="text-body-13 font-medium text-neutral-700">{t("actStepOf", { current: index + 1, total: activation.total })}</span>
              <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-neutral-900">{copy.title}</h2>
              <p className="max-w-xl text-body-14 leading-relaxed text-neutral-700">{copy.text}</p>
            </div>

            <div className="flex flex-col items-start gap-2">
              <StateLabel state={step.state}>{copy.state}</StateLabel>
              <p className="text-body-14 font-medium text-neutral-900">{copy.reason}</p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              {offerWhatsApp ? (
                <>
                  <button type="button" className={actionClass({ size: "lg", variant: primary ? "primary" : "secondary" })} onClick={() => setConnectOpen(true)}>
                    {t("onbConnectWhatsapp")}
                  </button>
                  <Link href={BOTS_ROUTES.lines} className={actionClass({ size: "lg", variant: "secondary" })}>
                    {t("onbOtherChannels")}
                  </Link>
                </>
              ) : (
                copy.cta && (
                  <Link href={step.href} className={actionClass({ size: "lg", variant: primary ? "primary" : "secondary" })}>
                    {copy.cta}
                  </Link>
                )
              )}
              <button type="button" onClick={refresh} disabled={pending} className={actionClass({ size: "lg", variant: "ghost" })}>
                <Refresh2 size={16} aria-hidden />
                {pending ? t("actRetrying") : t("onbCheckAgain")}
              </button>
            </div>

            <p className="text-body-13 text-neutral-700">{t("onbFromAccount")}</p>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-neutral-50 pt-5">
              <button
                type="button"
                className={actionClass({ variant: "ghost" })}
                disabled={index === 0}
                onClick={() => setChosen(ACTIVATION_STEPS[Math.max(0, index - 1)]!)}
              >
                <ArrowLeft2 size={16} aria-hidden />
                {t("onbBack")}
              </button>
              <button
                type="button"
                className={actionClass({ variant: "ghost" })}
                disabled={index === ACTIVATION_STEPS.length - 1}
                onClick={() => setChosen(ACTIVATION_STEPS[Math.min(ACTIVATION_STEPS.length - 1, index + 1)]!)}
              >
                {t("onbNext")}
                <ArrowRight2 size={16} aria-hidden />
              </button>
            </div>
          </PremiumCard>
        </div>
      </div>

      <WhatsAppConnect open={connectOpen} onOpenChange={setConnectOpen} onSessionUpsert={refresh} />
    </PageLayout>
  )
}
