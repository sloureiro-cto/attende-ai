"use client"

import { Clock, Danger } from "iconsax-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { SubscriptionStatus, trialDaysLeft } from "./trial"
import { useAttendeT } from "./useAttendeT"
import { BOTS_ROUTES } from "../brand"

export type TrialBannerProps = {
  status?: SubscriptionStatus | null
  trialEndsAt?: string | Date | null
  /** Injected for tests. */
  now?: Date
  className?: string
}

/** Slim strip under the header: trial countdown + upgrade CTA, or a billing warning. Nothing for healthy paid accounts. */
export function TrialBanner({ status, trialEndsAt, now, className }: TrialBannerProps) {
  const { t } = useAttendeT()
  if (!status || status === "active" || status === "none") return null

  let message: string
  let cta: string
  let tone: "info" | "warning" = "info"

  if (status === "trialing") {
    const days = trialDaysLeft(trialEndsAt, now)
    if (days === null) return null
    message = days === 0 ? t("trialEnded") : days === 1 ? t("trialOneDayLeft") : t("trialDaysLeft", { days })
    cta = t("trialUpgrade")
    if (days <= 2) tone = "warning"
  } else if (status === "past_due") {
    message = t("pastDue")
    cta = t("pastDueFix")
    tone = "warning"
  } else {
    message = t("canceled")
    cta = t("canceledReactivate")
    tone = "warning"
  }

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-body-13",
        tone === "info" ? "bg-primary-clean text-primary-darkest" : "bg-warning-clean text-warning-darkest",
        className
      )}
    >
      {tone === "info" ? <Clock size={16} aria-hidden /> : <Danger size={16} aria-hidden />}
      <span className="font-medium">{message}</span>
      <Link href={BOTS_ROUTES.billing} className="font-semibold underline underline-offset-2">
        {cta}
      </Link>
    </div>
  )
}
