"use client"

import { cn } from "@/lib/utils"
import { ATTENDE_PLAN_SLUGS, AttendePlanSlug, formatSignupPrice, pickMonthlyPrice, preferredCurrency, SignupPlan } from "lib/attende/signup/plans"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"

const NAME_KEY = { "attende-essencial": "signupPlanEssencial", "attende-profissional": "signupPlanProfissional", "attende-escala": "signupPlanEscala" } as const
const LOCALE = { english: "en-US", portuguese: "pt-BR", spanish: "es-ES" } as const

type Props = {
  value: AttendePlanSlug
  onChange: (slug: AttendePlanSlug) => void
  /** Synced catalog. Empty means "not synced yet": every tier is shown and prices read "at checkout". */
  plans: SignupPlan[]
}

/** Radio cards for the three tiers; the prices come from the synced Stripe plans, never from the code. */
export function PlanChoice({ value, onChange, plans }: Props) {
  const { t, language } = useAcquisitionT()
  const slugs = plans.length > 0 ? ATTENDE_PLAN_SLUGS.filter((slug) => plans.some((p) => p.slug === slug)) : ATTENDE_PLAN_SLUGS
  const currency = preferredCurrency(language)

  return (
    <div role="radiogroup" aria-label={t("signupPlan")} className="grid gap-2 sm:grid-cols-3">
      {slugs.map((slug) => {
        const selected = slug === value
        const price = pickMonthlyPrice(
          plans.find((p) => p.slug === slug),
          currency
        )
        return (
          <button
            key={slug}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(slug)}
            className={cn(
              "flex flex-col gap-0.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
              selected ? "border-primary bg-primary-clean" : "border-neutral-50 bg-white hover:border-neutral-100"
            )}
          >
            <span className="text-body-14 font-semibold text-neutral-900">{t(NAME_KEY[slug])}</span>
            <span className="text-body-12 text-neutral-500">
              {price
                ? t("signupPlanPrice", { price: formatSignupPrice(price, LOCALE[language]), interval: t("signupIntervalMonth") })
                : t("cardThenPending")}
            </span>
          </button>
        )
      })}
    </div>
  )
}
