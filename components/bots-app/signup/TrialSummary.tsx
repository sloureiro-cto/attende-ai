"use client"

import { TickCircle } from "iconsax-react"
import { formatSignupPrice, pickMonthlyPrice, preferredCurrency, SignupPlan, SignupTrial } from "lib/attende/signup/plans"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"
import { PremiumCard } from "../ui/PremiumCard"

const LOCALE = { english: "en-US", portuguese: "pt-BR", spanish: "es-ES" } as const

type Props = { plan: SignupPlan | undefined; planName: string; trial: SignupTrial }

/** "7 days free, then <price> — cancel anytime": the promise shown right above the card form. */
export function TrialSummary({ plan, planName, trial }: Props) {
  const { t, language } = useAcquisitionT()
  const price = pickMonthlyPrice(plan, preferredCurrency(language))
  return (
    <PremiumCard className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-14 font-semibold text-neutral-900">{planName}</span>
        <span className="rounded-full bg-primary-clean px-2.5 py-0.5 text-body-12 font-semibold text-primary-dark">{t("cardTrialDays", { days: trial.days })}</span>
      </div>
      <p className="flex items-start gap-2 text-body-13 text-neutral-700">
        <TickCircle size={16} className="mt-0.5 shrink-0 text-primary" variant="Bold" aria-hidden />
        {price ? t("cardThenPrice", { price: formatSignupPrice(price, LOCALE[language]), interval: t("signupIntervalMonth") }) : t("cardThenPending")}
      </p>
      {trial.outboundCap > 0 && <p className="text-body-12 text-neutral-500">{t("cardCap", { count: trial.outboundCap })}</p>}
    </PremiumCard>
  )
}
