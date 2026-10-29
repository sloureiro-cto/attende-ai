"use client"

import { TickCircle } from "iconsax-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ATTENDE_TIERS, AttendeTier } from "lib/attende/plans"
import { formatSignupPrice, pickMonthlyPrice, preferredCurrency, type SignupPlan } from "lib/attende/signup/plans"
import { BOTS_BRAND, BOTS_ROUTES } from "../brand"
import { BrandMark } from "../BrandMark"
import { BookDemoButton } from "../nav/BookDemoButton"
import { AttendeTranslationKey, useAttendeT } from "../nav/useAttendeT"

const LOCALES = { english: "en-US", portuguese: "pt-BR", spanish: "es" } as const

const TIER_KEYS = {
  essencial: { name: "tierEssencial", forWho: "tierEssencialFor" },
  profissional: { name: "tierProfissional", forWho: "tierProfissionalFor" },
  escala: { name: "tierEscala", forWho: "tierEscalaFor" },
} as const satisfies Record<AttendeTier["id"], { name: AttendeTranslationKey; forWho: AttendeTranslationKey }>

const FAQ: { q: AttendeTranslationKey; a: AttendeTranslationKey }[] = [
  { q: "faqTrialQ", a: "faqTrialA" },
  { q: "faqLinesQ", a: "faqLinesA" },
  { q: "faqAiQ", a: "faqAiA" },
  { q: "faqHumanQ", a: "faqHumanA" },
  { q: "faqChangeQ", a: "faqChangeA" },
]

type Props = { plans?: SignupPlan[] }

/** Public marketing page: three tiers, the free trial, a FAQ and the two CTAs (start trial / book a demo). */
export function PricingView({ plans = [] }: Props) {
  const { t, language } = useAttendeT()
  const locale = LOCALES[language] ?? "en-US"
  const n = (value: number) => value.toLocaleString(locale)

  const limitLines = (tier: AttendeTier): string[] => {
    const { lines, agents, aiRepliesPerMonth, seats, docs } = tier.limits
    return [
      lines === 1 ? t("limitLine") : t("limitLines", { count: n(lines) }),
      agents === 1 ? t("limitAgent") : t("limitAgents", { count: n(agents) }),
      t("limitReplies", { count: n(aiRepliesPerMonth) }),
      t("limitSeats", { count: n(seats) }),
      t("limitDocs", { count: n(docs) }),
    ]
  }

  return (
    <div className="min-h-screen bg-neutral-10">
      <header className="border-b border-neutral-50 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={BOTS_ROUTES.pricing} className="flex items-center gap-2.5 no-underline" aria-label={BOTS_BRAND.name}>
            <BrandMark size={30} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href={BOTS_ROUTES.login} className="text-body-14 font-medium text-neutral-500 hover:text-neutral-900">
              {t("pricingSignIn")}
            </Link>
            <Link
              href={BOTS_ROUTES.signup}
              className="hidden h-9 items-center rounded-lg bg-primary px-3.5 text-body-14 font-semibold text-white no-underline hover:bg-primary-dark sm:inline-flex"
            >
              {t("startTrial")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-16 px-4 pb-24 pt-14 sm:px-6">
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="inline-flex h-7 items-center rounded-full bg-primary-clean px-3 text-body-12 font-semibold text-primary-dark">
            {t("pricingTrialBadge")}
          </span>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-[42px]">{t("pricingTitle")}</h1>
          <p className="text-body-16 text-neutral-500">{t("pricingSubtitle")}</p>
        </section>

        <section aria-label={t("pricingTitle")} className="grid gap-5 md:grid-cols-3">
          {ATTENDE_TIERS.map((tier) => {
            const price = pickMonthlyPrice(
              plans.find((plan) => plan.tier === tier.id),
              preferredCurrency(language)
            )
            const keys = TIER_KEYS[tier.id]
            return (
              <article
                key={tier.id}
                data-tier={tier.id}
                className={cn(
                  "relative flex flex-col gap-5 rounded-[18px] border bg-white p-6",
                  tier.popular ? "border-primary shadow-[0_24px_48px_-24px_rgb(31_122_90/0.45)]" : "border-neutral-50 shadow-[var(--bots-shadow-card)]"
                )}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-6 inline-flex h-6 items-center rounded-full bg-primary px-3 text-body-12 font-semibold text-white">
                    {t("tierPopular")}
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  <h2 className="text-body-18 font-semibold text-neutral-900">{t(keys.name)}</h2>
                  <p className="text-body-13 text-neutral-500">{t(keys.forWho)}</p>
                </div>

                <div className="min-h-[52px]" data-testid={`price-${tier.id}`}>
                  {price ? (
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-[32px] font-semibold tracking-tight text-neutral-900">{formatSignupPrice(price, locale)}</span>
                      <span className="text-body-14 text-neutral-500">{t("perMonth")}</span>
                    </p>
                  ) : (
                    <p className="pt-2 text-body-14 font-medium text-neutral-500">{t("pricePending")}</p>
                  )}
                </div>

                <Link
                  href={`${BOTS_ROUTES.signup}?plan=${tier.id}`}
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-xl px-4 text-body-14 font-semibold no-underline transition-colors",
                    tier.popular ? "bg-primary text-white hover:bg-primary-dark" : "border border-neutral-100 bg-white text-neutral-900 hover:bg-neutral-10"
                  )}
                >
                  {t("startTrial")}
                </Link>

                <ul className="flex flex-col gap-2.5 border-t border-neutral-50 pt-5">
                  {limitLines(tier).map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-body-14 text-neutral-900">
                      <TickCircle size={18} variant="Bold" className="mt-0.5 shrink-0 text-primary" aria-hidden />
                      {line}
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5 text-body-13 text-neutral-500">
                    <TickCircle size={18} className="mt-0.5 shrink-0 text-neutral-300" aria-hidden />
                    {t("includedAll")}
                  </li>
                </ul>
              </article>
            )
          })}
        </section>

        <p className="-mt-8 text-center text-body-13 text-neutral-500">{t("pricingTrialNote")}</p>

        <section className="flex flex-col items-center gap-4 rounded-[18px] border border-neutral-50 bg-white px-6 py-10 text-center shadow-[var(--bots-shadow-card)]">
          <h2 className="text-body-18 font-semibold text-neutral-900">{t("bookDemo")}</h2>
          <p className="max-w-md text-body-14 text-neutral-500">{t("bookDemoHint")}</p>
          <BookDemoButton appearance="solid" className="h-11 px-5" />
        </section>

        <section aria-labelledby="pricing-faq" className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <h2 id="pricing-faq" className="text-center text-body-18 font-semibold text-neutral-900">
            {t("faqTitle")}
          </h2>
          <div className="divide-y divide-neutral-50 rounded-[14px] border border-neutral-50 bg-white">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body-14 font-semibold text-neutral-900 marker:hidden">
                  {t(item.q)}
                  <span aria-hidden className="text-neutral-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-body-14 leading-relaxed text-neutral-500">{t(item.a)}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="flex flex-col items-center gap-2 text-body-13 text-neutral-500">
          <p>
            {t("pricingHaveAccount")}{" "}
            <Link href={BOTS_ROUTES.login} className="font-semibold text-primary-dark underline underline-offset-2">
              {t("pricingSignIn")}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
