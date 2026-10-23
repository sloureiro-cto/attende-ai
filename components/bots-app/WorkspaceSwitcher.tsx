"use client"

import { ArrowDown2, Building4, TickCircle } from "iconsax-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { showToast } from "app/utils/showToast"
import { Dropdown, DropdownTrigger } from "components/ui/dropdown-menu"
import { useWorkspace } from "context/WorkspaceContext"
import { BOTS_ROUTES } from "./brand"
import { filterEntitled } from "./entitlement"
import { MenuContent, MenuItem } from "./ui/Menu"
import { useBotsAppT } from "./useBotsAppT"

type Props = {
  /** `block` = full-width card at the top of the side menu; `compact` = the phone header. */
  variant?: "block" | "compact"
  className?: string
}

/** Current workspace + switch between the workspaces that have bots. */
export function WorkspaceSwitcher({ variant = "compact", className }: Props) {
  const { t } = useBotsAppT()
  const router = useRouter()
  const { update } = useSession()
  const { workspaces, selectedWorkspace } = useWorkspace()
  const [switching, setSwitching] = useState(false)
  const entitled = filterEntitled(workspaces)

  const switchTo = async (id: string) => {
    if (switching || id === String(selectedWorkspace?._id)) return
    setSwitching(true)
    try {
      // Re-issues the apiToken for the new workspace (see auth.ts `trigger === "update"`).
      await update({ workspaceId: id })
      router.push(BOTS_ROUTES.bots)
      router.refresh()
    } catch {
      showToast("error", t("workspacesSwitchError"))
    } finally {
      setSwitching(false)
    }
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          disabled={switching}
          aria-label={`${t("workspaceSwitcherLabel")}: ${selectedWorkspace?.name ?? ""}`}
          className={cn(
            "flex min-w-0 items-center gap-2 text-left font-medium text-neutral-900 transition-colors disabled:opacity-60",
            variant === "block"
              ? "w-full rounded-lg px-1.5 py-1.5 hover:bg-neutral-10"
              : "h-10 max-w-full rounded-md px-1.5 hover:bg-neutral-10",
            className
          )}
        >
          {variant === "block" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/bots-assets/logo-mark.svg" alt="" width={30} height={30} className="size-[30px] shrink-0" aria-hidden />
          ) : (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-clean text-primary-dark" aria-hidden>
              <Building4 size={13} variant="Bold" />
            </span>
          )}
          <span className={cn("min-w-0 flex-1 truncate", variant === "block" ? "text-body-13 font-semibold" : "text-body-14 font-semibold")}>
            {switching ? t("workspaceSwitching") : selectedWorkspace?.name ?? t("workspaceSwitcherLabel")}
          </span>
          <ArrowDown2 size={12} className="shrink-0 text-neutral-400" aria-hidden />
        </button>
      </DropdownTrigger>
      <MenuContent align="start" className="max-h-80 overflow-y-auto">
        {entitled.map((workspace) => {
          const current = String(workspace._id) === String(selectedWorkspace?._id)
          return (
            <MenuItem key={String(workspace._id)} onSelect={() => void switchTo(String(workspace._id))}>
              <span className="flex-1 truncate">{workspace.name}</span>
              {current && <TickCircle size={16} variant="Bold" className="shrink-0 text-primary" aria-hidden />}
            </MenuItem>
          )
        })}
        <MenuItem asChild>
          <Link href={BOTS_ROUTES.workspaces} className="border-t border-neutral-50 text-neutral-500">
            {t("workspaceSwitcherAll")}
          </Link>
        </MenuItem>
      </MenuContent>
    </Dropdown>
  )
}
