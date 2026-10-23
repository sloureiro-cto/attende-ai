"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DEFAULT_LEAD_DISTRIBUTION_POLICY,
  type LeadDistributionAssignMode,
  type LeadDistributionCrmMode,
  type LeadDistributionPolicy,
} from "@/lib/messaging/leadDistributionTypes"
import { fetchAutomationBoardColumns } from "@/lib/projects/fetchProjectColumns"
import { boardsForColumnPicker, columnBoardId } from "@/lib/projects/projectBoardRefs"
import { getUserDisplayName, userMatchesSearch } from "@/lib/users/userDisplay"
import { cn } from "@/lib/utils"
import { getWorkspaceRoles } from "actions/roles/getWorkspaceRoles"
import type { IColumn } from "app/_types/Column"
import { IProject } from "app/_types/Project"
import { IUser } from "app/_types/User"
import { Checkbox } from "components/Checkbox/Checkbox"
import { ProjectBoardColumnPicker } from "components/Project/Automations/ProjectBoardColumnPicker"
import { SearchOption } from "components/SearchPopover/SearchOption"
import { SearchPopover } from "components/SearchPopover/SearchPopover"
import MultiSelectInput from "components/SelectInput/MultiSelectInput"
import SelectInput from "components/SelectInput/SelectInput"
import { Label } from "components/ui/label"
import UserAvatar from "components/UserAvatar/UserAvatar"
import { useWorkspace } from "context/WorkspaceContext"
import { useProjectsTranslation } from "hooks/useProjectsTranslation"
import { waFieldHintClass, waFieldLabelClass, waSearchPopoverScrollListClass } from "./waSettingsTypography"

export type LeadDistributionFieldsVariant = "full" | "assign_only" | "route_assign"

type Props = {
  policy: LeadDistributionPolicy
  onChange: (next: LeadDistributionPolicy) => void
  crmProjects: IProject[]
  variant?: LeadDistributionFieldsVariant
  disabled?: boolean
}

const leadDistSelectTriggerClassNames =
  "min-h-7 h-auto w-full min-w-0 max-w-full rounded-md border border-neutral-50 bg-white px-3 text-xs font-normal shadow-sm hover:bg-neutral-10"

const leadDistMultiSelectTriggerClassNames =
  "min-h-7 w-full min-w-0 max-w-full overflow-hidden rounded-md border border-neutral-50 bg-white px-2 py-1.5 text-xs font-normal shadow-sm hover:bg-neutral-10"

const leadDistPickerButtonClassNames =
  "flex h-7 min-h-[28px] w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-md border border-neutral-50 bg-white px-2 text-left text-xs text-neutral-700 shadow-sm hover:bg-neutral-10 disabled:opacity-60"

const leadDistSelectViewportClassNames =
  "!w-[var(--radix-select-trigger-width)] max-h-[min(280px,50vh,var(--radix-popper-available-height,9999px))]"

const leadDistSearchPopoverClassNames = {
  content: "z-[500] max-h-[min(360px,var(--radix-popper-available-height))] border border-neutral-100 p-0 shadow-sm",
  container: "flex min-h-0 w-[min(100vw-2rem,320px)] min-w-[260px] flex-col overflow-hidden",
  itemsContainer: waSearchPopoverScrollListClass,
  trigger: "w-full min-w-0",
} as const

export function LeadDistributionActionFields({
  policy,
  onChange,
  crmProjects,
  variant = "full",
  disabled = false,
}: Props) {
  const { t } = useProjectsTranslation()
  const { selectedWorkspace } = useWorkspace()
  const team = (selectedWorkspace?.members ?? []) as IUser[]

  const [memberSearch, setMemberSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [columns, setColumns] = useState<IColumn[]>([])
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [roles, setRoles] = useState<Array<{ _id: string; name: string }>>([])

  const workspaceId = selectedWorkspace?._id ?? ""

  useEffect(() => {
    if (!workspaceId) return
    void getWorkspaceRoles({ workspaceId }).then(({ data }) => {
      if (data) setRoles(data.map((r) => ({ _id: r._id!, name: r.name })))
    })
  }, [workspaceId])

  const loadColumns = useCallback(
    async (projectId: string, boardId?: string) => {
      if (!projectId.trim()) {
        setColumns([])
        return
      }
      setColumnsLoading(true)
      try {
        const loaded = await fetchAutomationBoardColumns(projectId, crmProjects, boardId)
        setColumns(loaded?.columns ?? [])
      } finally {
        setColumnsLoading(false)
      }
    },
    [crmProjects]
  )

  useEffect(() => {
    setColumns([])
  }, [policy.targetProjectId])

  useEffect(() => {
    if (variant !== "full" || policy.crmMode !== "move_to" || !policy.targetProjectId) {
      setColumns([])
      return
    }
    void loadColumns(policy.targetProjectId, policy.targetBoardId)
  }, [loadColumns, policy.crmMode, policy.targetBoardId, policy.targetProjectId, variant])

  const merged = { ...DEFAULT_LEAD_DISTRIBUTION_POLICY, ...policy }
  const patch = (partial: Partial<LeadDistributionPolicy>) => onChange({ ...merged, ...partial })
  const selectedAssignee = team.find((u) => u._id === merged.specificUserId)
  const moveProject = crmProjects.find((p) => p._id === merged.targetProjectId)
  const moveBoards = boardsForColumnPicker(moveProject, columns)
  const soleBoardId = moveBoards.length === 1 ? moveBoards[0]!.boardId : ""

  useEffect(() => {
    if (variant !== "full") return
    if (merged.crmMode !== "move_to") return
    if ((merged.targetBoardId ?? "").trim()) return
    if (!soleBoardId) return
    patch({ targetBoardId: soleBoardId })
    // Seed the only CRM tab from project tabs so we can fetch that board only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, merged.crmMode, merged.targetBoardId, soleBoardId])

  const crmModeItems = useMemo(
    () => [
      { value: "keep_linked", displayName: t("leadDistCrmKeepLinked") },
      { value: "move_to", displayName: t("leadDistCrmMoveTo") },
      { value: "pick_from_list", displayName: t("leadDistCrmPickList") },
    ],
    [t]
  )

  const assignModeItems = useMemo(
    () => [
      { value: "none", displayName: t("leadDistAssignNone") },
      { value: "specific_user", displayName: t("leadDistAssignSpecific") },
      { value: "member_list", displayName: t("leadDistAssignMemberList") },
      { value: "all_crm_members", displayName: t("leadDistAssignAllCrm") },
      { value: "by_workspace_role", displayName: t("leadDistAssignByRole") },
    ],
    [t]
  )

  const projectItems = useMemo(
    () => crmProjects.map((p) => ({ value: p._id!, displayName: p.title ?? "CRM" })),
    [crmProjects]
  )

  const showCrm = variant === "full"
  const showAssign = variant === "full" || variant === "assign_only" || variant === "route_assign"

  return (
    <div className="grid min-w-0 gap-3 overflow-hidden">
      {showCrm ? (
        <>
          <div className="min-w-0">
            <Label className={cn(waFieldLabelClass, "mb-1 block")}>{t("leadDistCrmDestination")}</Label>
            <SelectInput
              size="small"
              inheritTriggerWidth
              portalClassNames="z-[500]"
              value={merged.crmMode ?? "keep_linked"}
              items={crmModeItems}
              disabled={disabled}
              triggerClassNames={leadDistSelectTriggerClassNames}
              viewportClassNames={leadDistSelectViewportClassNames}
              wrapTriggerLabel
              onValueChange={(v) => patch({ crmMode: v as LeadDistributionCrmMode })}
            />
          </div>

          {merged.crmMode === "move_to" ? (
            <>
              <div>
                <Label className={cn(waFieldLabelClass, "mb-1 block")}>CRM</Label>
                <SelectInput
                  size="small"
                  inheritTriggerWidth
                  portalClassNames="z-[500]"
                  value={merged.targetProjectId ?? ""}
                  items={projectItems}
                  disabled={disabled}
                  placeholder={t("leadDistSelectCrm")}
                  triggerClassNames={leadDistSelectTriggerClassNames}
                  viewportClassNames={leadDistSelectViewportClassNames}
                  wrapTriggerLabel
                  onValueChange={(v) =>
                    patch({ targetProjectId: v, targetBoardId: undefined, targetColumnId: undefined })
                  }
                />
              </div>
              {merged.targetProjectId ? (
                <div>
                  <Label className={cn(waFieldLabelClass, "mb-1 block")}>
                    {moveBoards.length > 1 ? t("leadDistBoard") : t("leadDistColumn")}
                  </Label>
                  {moveBoards.length > 0 ? (
                    <ProjectBoardColumnPicker
                      boards={moveBoards}
                      columns={columns}
                      value={merged.targetColumnId ?? ""}
                      boardValue={merged.targetBoardId ?? ""}
                      onChange={(columnId) => {
                        const col = columns.find((c) => c._id === columnId)
                        patch({
                          targetColumnId: columnId || undefined,
                          targetBoardId: columnBoardId(col?.board) || merged.targetBoardId,
                        })
                      }}
                      onBoardChange={(boardId) => {
                        const col = columns.find((c) => c._id === merged.targetColumnId)
                        const keep = Boolean(col && boardId && columnBoardId(col.board) === boardId)
                        patch({
                          targetBoardId: boardId || undefined,
                          targetColumnId: keep ? merged.targetColumnId : undefined,
                        })
                      }}
                      noneLabel={t("leadDistColumn")}
                      boardPlaceholder={t("leadDistBoard")}
                      columnPlaceholder={t("leadDistColumn")}
                      portalClassNames="z-[500]"
                      triggerClassNames={leadDistSelectTriggerClassNames}
                      disabled={disabled}
                    />
                  ) : columnsLoading ? (
                    <p className={waFieldHintClass}>{t("leadDistColumnsLoading")}</p>
                  ) : (
                    <p className={waFieldHintClass}>{t("leadDistColumnsEmpty")}</p>
                  )}
                </div>
              ) : null}
            </>
          ) : null}

          {merged.crmMode === "pick_from_list" ? (
            <div>
              <Label className={cn(waFieldLabelClass, "mb-1 block")}>{t("leadDistCrmList")}</Label>
              {projectItems.length === 0 ? (
                <p className={waFieldHintClass}>{t("leadDistNoCrmProjects")}</p>
              ) : (
                <MultiSelectInput
                  size="small"
                  value={merged.projectIds ?? []}
                  items={projectItems}
                  placeholder={t("leadDistSelectCrms")}
                  disabled={disabled}
                  portalClassNames="z-[500]"
                  triggerClassNames={leadDistMultiSelectTriggerClassNames}
                  viewportClassNames="max-h-[min(280px,50vh)] w-full"
                  onValueChange={(ids) => patch({ projectIds: ids })}
                />
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {showAssign ? (
        <>
          <div className="min-w-0">
            <Label className={cn(waFieldLabelClass, "mb-1 block")}>{t("leadDistAssignMode")}</Label>
            <SelectInput
              size="small"
              inheritTriggerWidth
              portalClassNames="z-[500]"
              value={merged.assignMode ?? "none"}
              items={assignModeItems}
              disabled={disabled}
              triggerClassNames={leadDistSelectTriggerClassNames}
              viewportClassNames={leadDistSelectViewportClassNames}
              wrapTriggerLabel
              onValueChange={(v) => patch({ assignMode: v as LeadDistributionAssignMode })}
            />
          </div>

          {merged.assignMode === "specific_user" ? (
            <div>
              <Label className={cn(waFieldLabelClass, "mb-1 block")}>{t("leadDistAssignee")}</Label>
              <SearchPopover
                modal={false}
                multipleSelect={false}
                searchValue={userSearch}
                setSearchValue={setUserSearch}
                value={merged.specificUserId ?? ""}
                onChange={(v) => patch({ specificUserId: String(Array.isArray(v) ? v[0] : v) })}
                classNames={leadDistSearchPopoverClassNames}
                items={team
                  .filter((u) => userMatchesSearch(u, userSearch))
                  .map((user) => (
                    <SearchOption key={user._id} value={user._id!.toString()} className="w-full">
                      <div className="flex items-center gap-2">
                        <UserAvatar size="small" user={user} />
                        <span className="text-xs">{getUserDisplayName(user)}</span>
                      </div>
                    </SearchOption>
                  ))}
              >
                <button type="button" disabled={disabled} className={leadDistPickerButtonClassNames}>
                  {merged.specificUserId ? (
                    <>
                      <UserAvatar size="small" user={selectedAssignee ?? team[0]!} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">
                        {selectedAssignee ? getUserDisplayName(selectedAssignee) : t("leadDistAssignee")}
                      </span>
                    </>
                  ) : (
                    <span className="min-w-0 truncate text-neutral-500">{t("leadDistPickUser")}</span>
                  )}
                </button>
              </SearchPopover>
            </div>
          ) : null}

          {merged.assignMode === "member_list" ? (
            <div>
              <Label className={cn(waFieldLabelClass, "mb-1 block")}>{t("leadDistMemberList")}</Label>
              <SearchPopover
                modal={false}
                multipleSelect
                searchValue={memberSearch}
                setSearchValue={setMemberSearch}
                value={merged.userIds ?? []}
                onChange={(v) => patch({ userIds: v as string[] })}
                classNames={leadDistSearchPopoverClassNames}
                items={team
                  .filter((u) => userMatchesSearch(u, memberSearch))
                  .map((user) => (
                    <SearchOption key={user._id} value={user._id!.toString()} className="w-full">
                      <div className="flex items-center gap-2">
                        <UserAvatar size="small" user={user} />
                        <span className="text-xs">{getUserDisplayName(user)}</span>
                      </div>
                    </SearchOption>
                  ))}
              >
                <button type="button" disabled={disabled} className={leadDistPickerButtonClassNames}>
                  <span className="min-w-0 flex-1 truncate text-left">
                    {(merged.userIds?.length ?? 0) === 0
                      ? t("leadDistPickMembers")
                      : `${merged.userIds!.length} ${t("leadDistMembersSelected")}`}
                  </span>
                </button>
              </SearchPopover>
            </div>
          ) : null}

          {merged.assignMode === "by_workspace_role" ? (
            <div>
              <Label className={cn(waFieldLabelClass, "mb-1 block")}>{t("leadDistWorkspaceRole")}</Label>
              <SelectInput
                size="small"
                inheritTriggerWidth
                portalClassNames="z-[500]"
                value={merged.workspaceRoleId ?? ""}
                items={roles.map((r) => ({ value: r._id, displayName: r.name }))}
                disabled={disabled}
                triggerClassNames={leadDistSelectTriggerClassNames}
                viewportClassNames={leadDistSelectViewportClassNames}
                wrapTriggerLabel
                onValueChange={(v) => patch({ workspaceRoleId: v })}
              />
            </div>
          ) : null}

          <label className="flex min-w-0 items-start gap-2">
            <Checkbox
              className="mt-0.5 shrink-0"
              checked={merged.onlyWhenUnassigned !== false}
              disabled={disabled}
              onCheckedChange={(v) => patch({ onlyWhenUnassigned: v === true })}
            />
            <span className="min-w-0 flex-1 text-body-11 leading-snug text-neutral-700">
              {t("leadDistOnlyUnassigned")}
            </span>
          </label>
        </>
      ) : null}
    </div>
  )
}
