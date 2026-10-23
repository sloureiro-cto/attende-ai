"use client"

import { useAcquisitionT } from "../acquisition/useAcquisitionT"

/** Outbound messages used during the trial, as a labelled progress bar (not color-only: the numbers are in the text). */
export function TrialMeter({ used, cap }: { used: number; cap: number }) {
  const { t } = useAcquisitionT()
  if (cap <= 0) return null
  const percent = Math.min(100, Math.round((used / cap) * 100))
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-body-13 text-neutral-700">{t("billTrialOutbound", { used, cap })}</span>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={Math.min(used, cap)} aria-label={t("billTrialOutbound", { used, cap })} className="h-2 w-full overflow-hidden rounded-full bg-neutral-10">
        <div className={percent >= 90 ? "h-full rounded-full bg-warning" : "h-full rounded-full bg-primary"} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
