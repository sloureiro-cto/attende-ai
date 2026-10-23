"use client"

import { InfoCircle } from "iconsax-react"
import type { AttendeReportsKey } from "lib/i18n/translations/attende/reports"
import type { AttendeReportsT } from "./useAttendeReportsT"
import { PremiumCard } from "../ui/PremiumCard"

const LABEL: Record<string, AttendeReportsKey> = {
  opt_outs: "notMeasuredOptOuts",
  customer_satisfaction: "notMeasuredCsat",
  ai_resolution_confirmed: "notMeasuredConfirmed",
  after_hours_share: "notMeasuredAfterHours",
}

/**
 * Lists what the product does not measure (from the backend's `notAvailable`), so a gap is explained instead of
 * hidden or faked. Sales are always listed: no sale or revenue is ever linked to an AI reply in the data.
 */
export function NotMeasured({ keys, t }: { keys: string[]; t: AttendeReportsT }) {
  const known: AttendeReportsKey[] = [...keys.filter((k) => k in LABEL).map((k) => LABEL[k] as AttendeReportsKey), "notMeasuredSales"]
  return (
    <PremiumCard className="flex flex-col gap-3 p-4 sm:p-5" data-testid="not-measured">
      <div className="flex flex-col gap-1">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("notMeasuredTitle")}</h2>
        <p className="text-body-13 text-neutral-700">{t("notMeasuredHint")}</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {known.map((k) => (
          <li key={k} className="flex items-start gap-2 text-body-13 text-neutral-700">
            <InfoCircle size={15} className="mt-0.5 shrink-0 text-neutral-500" aria-hidden />
            {t(k)}
          </li>
        ))}
      </ul>
    </PremiumCard>
  )
}

export function HonestyNote({ t }: { t: AttendeReportsT }) {
  return (
    <aside className="rounded-[14px] border border-dashed border-neutral-100 px-5 py-4 text-body-13 leading-relaxed text-neutral-700">
      <strong className="mb-1 block font-semibold text-neutral-900">{t("honestyTitle")}</strong>
      {t("honestyBody")}
    </aside>
  )
}
