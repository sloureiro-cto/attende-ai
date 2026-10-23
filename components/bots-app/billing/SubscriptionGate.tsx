"use client"

import { Lock1 } from "iconsax-react"
import Link from "next/link"
import Button from "components/Button/Button"
import { isSubscriptionBlockCode, type SubscriptionBlockCode } from "lib/attende/billing/model"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"
import { BOTS_BRAND, BOTS_ROUTES } from "../brand"
import { PremiumCard } from "../ui/PremiumCard"

type Props = {
  /** Backend error code (`ATTENDE_TRIAL_EXPIRED` | `ATTENDE_SUBSCRIPTION_INACTIVE`). Anything else renders nothing. */
  code: string | null | undefined
  className?: string
}

const COPY = {
  ATTENDE_TRIAL_EXPIRED: { title: "gateTrialExpiredTitle", body: "gateTrialExpiredBody" },
  ATTENDE_SUBSCRIPTION_INACTIVE: { title: "gateInactiveTitle", body: "gateInactiveBody" },
} as const satisfies Record<SubscriptionBlockCode, { title: "gateTrialExpiredTitle" | "gateInactiveTitle"; body: "gateTrialExpiredBody" | "gateInactiveBody" }>

/**
 * Blocking screen for a workspace whose trial ended or whose subscription is not active. Any page can render it when an
 * `/api/attende/*` call fails with one of those codes; conversations, agents and documents are kept, only the work stops.
 */
export function SubscriptionGate({ code, className }: Props) {
  const { t } = useAcquisitionT()
  if (!isSubscriptionBlockCode(code)) return null
  const copy = COPY[code]
  return (
    <PremiumCard role="alert" className={`mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center ${className ?? ""}`}>
      <span className="flex size-12 items-center justify-center rounded-full bg-warning-clean text-warning-darkest">
        <Lock1 size={24} variant="Bold" aria-hidden />
      </span>
      <h2 className="text-[22px] font-semibold tracking-tight text-neutral-900">{t(copy.title)}</h2>
      <p className="max-w-md text-body-14 text-neutral-500">{t(copy.body)}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href={BOTS_ROUTES.billing}>
          <Button type="button" size="large">
            {t("gateChoosePlan")}
          </Button>
        </Link>
        <a href={BOTS_BRAND.bookingUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="secondary" style="outline" size="large">
            {t("gateTalk")}
          </Button>
        </a>
      </div>
    </PremiumCard>
  )
}
