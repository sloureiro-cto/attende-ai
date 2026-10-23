"use client"

import type { ReactNode } from "react"
import { useAttendeT } from "../nav/useAttendeT"
import { PageLayout } from "../ui/PageLayout"

/** Page title block of the team page (strings live in the shell dictionaries). */
export function TeamHeading() {
  const { t } = useAttendeT()
  return (
    <header className="flex max-w-2xl flex-col gap-1.5">
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-neutral-900">{t("teamTitle")}</h1>
      <p className="text-body-14 text-neutral-500">{t("teamSubtitle")}</p>
    </header>
  )
}

/** The team page inside the standard frame (title bar + content padding). */
export function TeamFrame({ children }: { children: ReactNode }) {
  const { t } = useAttendeT()
  return (
    <PageLayout title={t("teamTitle")} subtitle={t("teamSubtitle")}>
      {children}
    </PageLayout>
  )
}
