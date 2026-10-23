"use client"

import type { ReactNode } from "react"
import { PageLayout } from "../ui/PageLayout"
import { type AcquisitionTranslationKey, useAcquisitionT } from "./useAcquisitionT"

type Props = { titleKey: AcquisitionTranslationKey; subtitleKey?: AcquisitionTranslationKey; actions?: ReactNode }

/** Same look as the shell's PageHeading, for pages whose strings live in the signup/onboarding/billing dictionaries. */
export function AcquisitionHeading({ titleKey, subtitleKey, actions }: Props) {
  const { t } = useAcquisitionT()
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-neutral-900">{t(titleKey)}</h1>
        {subtitleKey && <p className="text-body-14 text-neutral-500">{t(subtitleKey)}</p>}
      </div>
      {actions}
    </header>
  )
}

/** A signup/onboarding/billing page inside the standard frame (title bar + content padding). */
export function AcquisitionFrame({ titleKey, subtitleKey, actions, width, children }: Props & { width?: "wide" | "narrow"; children: ReactNode }) {
  const { t } = useAcquisitionT()
  return (
    <PageLayout title={t(titleKey)} subtitle={subtitleKey ? t(subtitleKey) : undefined} actions={actions} width={width}>
      {children}
    </PageLayout>
  )
}
