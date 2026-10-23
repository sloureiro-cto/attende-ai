"use client"

import { Lock1 } from "iconsax-react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import Button from "components/Button/Button"
import { BOTS_BRAND, BOTS_ROUTES } from "./brand"
import { PremiumCard } from "./ui/PremiumCard"
import { useBotsAppT } from "./useBotsAppT"

/** Shown when the current workspace does not have the bots add-on. */
export function NotEntitledView() {
  const { t } = useBotsAppT()
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-10">
      <PremiumCard className="bots-rise flex w-full flex-col items-center gap-5 px-8 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-clean text-primary-dark">
          <Lock1 size={26} variant="Bold" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900">{t("notEntitledTitle")}</h1>
          <p className="text-body-14 leading-relaxed text-neutral-500">{t("notEntitledBody")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button
            size="large"
            onClick={() => {
              window.location.href = `mailto:${BOTS_BRAND.contactEmail}?subject=${encodeURIComponent(BOTS_BRAND.name)}`
            }}
          >
            {t("notEntitledContact")}
          </Button>
          <Link href={BOTS_ROUTES.workspaces}>
            <Button size="large" variant="secondary" style="outline">
              {t("notEntitledSwitch")}
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: BOTS_ROUTES.login })}
          className="text-body-13 text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline"
        >
          {t("accountSignOut")}
        </button>
      </PremiumCard>
    </div>
  )
}
