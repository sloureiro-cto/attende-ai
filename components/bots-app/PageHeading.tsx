"use client"

import type { ReactNode } from "react"
import type { BotsAppTranslationKey } from "lib/i18n/translations/botsApp"
import { useBotsAppT } from "./useBotsAppT"

type Props = {
  titleKey: BotsAppTranslationKey
  subtitleKey?: BotsAppTranslationKey
  actions?: ReactNode
}

/** Page title block (translated), with an optional action area on the right. */
export function PageHeading({ titleKey, subtitleKey, actions }: Props) {
  const { t } = useBotsAppT()
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
