"use client"

import { ArrowRight2, Building4, Danger } from "iconsax-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { showToast } from "app/utils/showToast"
import Button from "components/Button/Button"
import { plural } from "lib/attende/format"
import { BOTS_ROUTES } from "./brand"
import { filterEntitled, WorkspaceWithEntitlements } from "./entitlement"
import { EmptyState } from "./ui/EmptyState"
import { PremiumCard } from "./ui/PremiumCard"
import { useBotsAppT } from "./useBotsAppT"

export type PickerWorkspace = WorkspaceWithEntitlements & {
  name: string
  logo?: string | null
  members?: unknown[] | null
}

type Props = {
  workspaces: PickerWorkspace[]
  currentWorkspaceId?: string | null
  /** The workspaces could not be loaded (server read failed). */
  loadFailed?: boolean
}

/** Grid of the workspaces that have bots. Selecting one re-issues the session apiToken for it. */
export function WorkspacePicker({ workspaces, currentWorkspaceId, loadFailed = false }: Props) {
  const { t, language } = useBotsAppT()
  const router = useRouter()
  const { update } = useSession()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const entitled = filterEntitled(workspaces)

  const choose = async (id: string) => {
    if (pendingId) return
    setPendingId(id)
    try {
      if (id !== currentWorkspaceId) await update({ workspaceId: id })
      router.push(BOTS_ROUTES.bots)
      router.refresh()
    } catch {
      showToast("error", t("workspacesSwitchError"))
      setPendingId(null)
    }
  }

  if (loadFailed) {
    return (
      <EmptyState
        icon={<Danger size={22} />}
        title={t("workspacesLoadError")}
        action={
          <Button variant="secondary" style="outline" size="medium" onClick={() => router.refresh()}>
            {t("workspacesRetry")}
          </Button>
        }
      />
    )
  }

  if (entitled.length === 0) {
    return (
      <EmptyState
        icon={<Building4 size={22} />}
        title={t("workspacesEmpty")}
        description={t("workspacesEmptyHint")}
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entitled.map((workspace) => {
        const id = String(workspace._id)
        const current = id === String(currentWorkspaceId)
        const pending = pendingId === id
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => void choose(id)}
              disabled={Boolean(pendingId)}
              aria-current={current ? "true" : undefined}
              aria-label={`${t("workspacesOpen")}: ${workspace.name}`}
              className="group block w-full rounded-[14px] text-left disabled:cursor-wait"
            >
              <PremiumCard
                interactive
                className={cn("flex items-center gap-4 p-5", current && "border-primary-lighter", pending && "opacity-70")}
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-clean text-primary-dark">
                  {workspace.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={workspace.logo} alt="" className="size-full object-cover" />
                  ) : (
                    <Building4 size={22} variant="Bold" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body-16 font-semibold text-neutral-900">{workspace.name}</span>
                  <span className="text-body-12 text-neutral-400">
                    {plural(workspace.members?.length ?? 0, language, {
                      one: t("workspacesMembersOne", { count: workspace.members?.length ?? 0 }),
                      other: t("workspacesMembers", { count: workspace.members?.length ?? 0 }),
                    })}
                  </span>
                </span>
                {current ? (
                  <span className="rounded-full bg-primary-clean px-2 py-0.5 text-body-12 font-semibold text-primary-dark">
                    {t("workspacesCurrent")}
                  </span>
                ) : (
                  <ArrowRight2
                    size={16}
                    className="text-neutral-200 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden
                  />
                )}
              </PremiumCard>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
