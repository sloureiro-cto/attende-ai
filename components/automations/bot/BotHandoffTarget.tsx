"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { IUser } from "app/_types/User"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import Button from "components/Button/Button"
import { SearchOption } from "components/SearchPopover/SearchOption"
import { SearchPopover } from "components/SearchPopover/SearchPopover"
import {
  waTemplateSearchPopoverClassNames,
  waTemplateSelectInputTriggerClassNames,
} from "components/settings/whatsapp-lite/template-rule-forms"
import UserAvatar from "components/UserAvatar/UserAvatar"
import { useWorkspace } from "context/WorkspaceContext"
import { membersFromWorkspaceUsers, unknownIds } from "lib/automations/botAssignees"
import type { SalesBotHandoffAssignMode } from "lib/automations/types"
import { getUserDisplayName, sortForPicker, userMatchesSearch } from "lib/users/userDisplay"
import { BotSelect } from "./BotSelect"
import type { BotLookups } from "./useBotLookups"

const MODES: SalesBotHandoffAssignMode[] = ["all_crm_members", "specific_user", "member_list", "by_workspace_role"]
const pickerButton = cn(waTemplateSelectInputTriggerClassNames, "flex h-8 items-center gap-2 px-2.5 text-left text-body-12")

type Value = {
  assignMode?: SalesBotHandoffAssignMode
  userIds?: string[]
  specificUserId?: string
  workspaceRoleId?: string
}

/**
 * Who receives the conversation. Members come from the workspace context (the list lead distribution
 * and "assign conversation" use, ids included), falling back to the members endpoint when the context
 * has none. Roles load as soon as the mode needs them, also for a bot that is reopened in that mode.
 */
export const BotHandoffTarget = memo(function BotHandoffTarget({
  value,
  lookups,
  onChange,
  t,
}: {
  value: Value
  lookups: BotLookups
  onChange: (patch: Value) => void
  t: AutomationsTFn
}) {
  const mode = value.assignMode ?? "all_crm_members"
  const { selectedWorkspace } = useWorkspace()
  const { loadUsers, loadRoles } = lookups
  const contextMembers = useMemo(() => (selectedWorkspace?.members ?? []) as IUser[], [selectedWorkspace?.members])
  const needsMembers = mode === "specific_user" || mode === "member_list"

  useEffect(() => {
    if (needsMembers && contextMembers.length === 0) loadUsers()
  }, [needsMembers, contextMembers.length, loadUsers])
  useEffect(() => {
    if (mode === "by_workspace_role") loadRoles()
  }, [mode, loadRoles])

  const fallbackMembers = useMemo(() => membersFromWorkspaceUsers(lookups.users.data), [lookups.users.data])
  const members = contextMembers.length > 0 ? contextMembers : fallbackMembers
  const membersStatus = contextMembers.length > 0 ? "ready" : lookups.users.status

  const [search, setSearch] = useState("")
  const selectedIds = mode === "member_list" ? (value.userIds ?? []) : value.specificUserId ? [value.specificUserId] : []
  const items = useMemo(
    () =>
      sortForPicker(
        members.filter((u) => userMatchesSearch(u, search)),
        (u) => getUserDisplayName(u),
        (u) => selectedIds.includes(String(u._id))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedIds is derived from value
    [members, search, value.userIds, value.specificUserId, mode]
  )

  const memberOptions = items.map((user) => (
    <SearchOption key={String(user._id)} value={String(user._id)} className="w-full">
      <div className="flex items-center gap-2">
        <UserAvatar size="small" user={user} />
        <span className="truncate text-body-13 text-neutral-900">{getUserDisplayName(user)}</span>
      </div>
    </SearchOption>
  ))

  const selectedUser = members.find((u) => String(u._id) === value.specificUserId)
  const missing = unknownIds(selectedIds, members)

  const membersHint =
    membersStatus === "loading" ? (
      <p className="text-body-12 text-neutral-500">{t("salesBotMembersLoading")}</p>
    ) : membersStatus === "error" ? (
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-12 text-error-dark">{t("salesBotMembersError")}</span>
        <Button size="small" variant="secondary" style="outline" onClick={() => loadUsers()}>
          {t("salesBotRetry")}
        </Button>
      </div>
    ) : members.length === 0 ? (
      <p className="text-body-12 text-neutral-500">{t("salesBotMembersEmpty")}</p>
    ) : null

  const roles = lookups.roles
  const roleItems = roles.data.map((r) => ({ value: r._id!, displayName: r.name }))

  return (
    <div className="flex flex-col gap-2">
      <BotSelect
        value={mode}
        onValueChange={(next) =>
          onChange({ assignMode: next as SalesBotHandoffAssignMode, userIds: undefined, specificUserId: undefined, workspaceRoleId: undefined })
        }
        items={MODES.map((m) => ({ value: m, displayName: t(`salesBotAssign_${m}`) }))}
      />

      {needsMembers ? (
        <>
          <SearchPopover
            modal={false}
            multipleSelect={mode === "member_list"}
            searchValue={search}
            setSearchValue={setSearch}
            value={mode === "member_list" ? (value.userIds ?? []) : (value.specificUserId ?? "")}
            onChange={(v) => {
              if (mode === "member_list") onChange({ userIds: (v as string[]) ?? [] })
              else onChange({ specificUserId: String(Array.isArray(v) ? v[0] : v) })
            }}
            classNames={waTemplateSearchPopoverClassNames}
            inputPlaceholder={t("salesBotSearch")}
            showSearchInput
            items={memberOptions}
          >
            <button type="button" className={pickerButton} disabled={members.length === 0}>
              {mode === "member_list" ? (
                <span className="min-w-0 flex-1 truncate">
                  {(value.userIds?.length ?? 0) === 0 ? t("salesBotPickMembers") : t("salesBotMembersSelected", { count: value.userIds!.length })}
                </span>
              ) : selectedUser ? (
                <>
                  <UserAvatar size="small" user={selectedUser} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{getUserDisplayName(selectedUser)}</span>
                </>
              ) : (
                <span className="min-w-0 flex-1 truncate text-neutral-500">{t("salesBotPickUser")}</span>
              )}
            </button>
          </SearchPopover>
          {membersHint}
          {missing.length > 0 && membersStatus === "ready" ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-12 text-warning-darkest">{t("salesBotMembersMissing", { count: missing.length })}</span>
              <Button
                size="small"
                variant="secondary"
                style="outline"
                onClick={() =>
                  mode === "member_list"
                    ? onChange({ userIds: selectedIds.filter((id) => !missing.includes(id)) })
                    : onChange({ specificUserId: undefined })
                }
              >
                {t("salesBotClear")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {mode === "by_workspace_role" ? (
        <>
          <BotSelect
            value={value.workspaceRoleId ?? ""}
            onValueChange={(workspaceRoleId) => onChange({ workspaceRoleId })}
            placeholder={roles.status === "loading" ? t("salesBotLoading") : t("salesBotPickRole")}
            items={roleItems}
            emptyContent={<p className="px-3 py-2 text-body-12 text-neutral-500">{t("salesBotRolesEmpty")}</p>}
          />
          {roles.status === "error" ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-12 text-error-dark">{t("salesBotRolesError")}</span>
              <Button size="small" variant="secondary" style="outline" onClick={() => loadRoles()}>
                {t("salesBotRetry")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
})
