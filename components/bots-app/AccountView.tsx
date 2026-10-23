"use client"

import { Export, LogoutCurve } from "iconsax-react"
import { signOut, useSession } from "next-auth/react"
import { useWorkspace } from "context/WorkspaceContext"
import { ProfilePhotoField } from "./account/ProfilePhotoField"
import { BOTS_BRAND, BOTS_ROUTES } from "./brand"
import { actionClass } from "./ui/actionStyles"
import { PageLayout } from "./ui/PageLayout"
import { PremiumCard } from "./ui/PremiumCard"
import { useBotsAppT } from "./useBotsAppT"

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-body-12 font-medium text-neutral-500">{label}</dt>
      <dd className="truncate text-body-14 text-neutral-900">{value || "—"}</dd>
    </div>
  )
}

/** /me: profile photo (shared with JSYNQ), who is signed in, which workspace, and sign out. */
export function AccountView() {
  const { t } = useBotsAppT()
  const { data } = useSession()
  const { selectedWorkspace } = useWorkspace()
  const user = data?.user

  return (
    <PageLayout title={t("meTitle")} subtitle={t("meSubtitle")} width="narrow" className="flex flex-col gap-6">
      <PremiumCard className="flex flex-col gap-6 p-4 sm:p-6">
        <ProfilePhotoField />
        <dl className="grid gap-5 border-t border-neutral-50 pt-5 sm:grid-cols-2">
          <Field label={t("meName")} value={user?.name} />
          <Field label={t("meEmail")} value={user?.email} />
          <Field label={t("meWorkspace")} value={selectedWorkspace?.name} />
        </dl>
        <a
          href={BOTS_BRAND.jsynqUrl}
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-body-13 font-semibold text-primary-dark hover:underline"
        >
          {t("meManageInJsynq")}
          <Export size={14} aria-hidden />
        </a>
      </PremiumCard>

      <PremiumCard className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-body-16 font-semibold text-neutral-900">{t("meSession")}</h2>
          <p className="text-body-13 text-neutral-500">{t("meSignOutHint")}</p>
        </div>
        <button
          type="button"
          className={actionClass({ variant: "secondary" })}
          onClick={() => void signOut({ callbackUrl: BOTS_ROUTES.login })}
        >
          <LogoutCurve size={16} aria-hidden />
          {t("accountSignOut")}
        </button>
      </PremiumCard>
    </PageLayout>
  )
}
