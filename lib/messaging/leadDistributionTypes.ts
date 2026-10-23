export type LeadDistributionCrmMode = "keep_linked" | "move_to" | "pick_from_list"

export type LeadDistributionAssignMode =
  | "none"
  | "specific_user"
  | "member_list"
  | "all_crm_members"
  | "by_workspace_role"

export type LeadDistributionPolicy = {
  enabled?: boolean
  crmMode?: LeadDistributionCrmMode
  targetProjectId?: string
  /** CRM tab for `move_to` when `targetColumnId` is omitted. */
  targetBoardId?: string
  targetColumnId?: string
  projectIds?: string[]
  assignMode?: LeadDistributionAssignMode
  userIds?: string[]
  specificUserId?: string
  workspaceRoleId?: string
  onlyWhenUnassigned?: boolean
  syncCardAssignees?: boolean
}

export const DEFAULT_LEAD_DISTRIBUTION_POLICY: LeadDistributionPolicy = {
  enabled: false,
  crmMode: "keep_linked",
  assignMode: "none",
  onlyWhenUnassigned: true,
  syncCardAssignees: true,
}

export function normalizeLeadDistributionPolicy(raw?: LeadDistributionPolicy | null): LeadDistributionPolicy {
  if (!raw) return { ...DEFAULT_LEAD_DISTRIBUTION_POLICY }
  return {
    ...DEFAULT_LEAD_DISTRIBUTION_POLICY,
    ...raw,
    projectIds: Array.isArray(raw.projectIds) ? raw.projectIds.map(String) : [],
    userIds: Array.isArray(raw.userIds) ? raw.userIds.map(String) : [],
    syncCardAssignees: raw.syncCardAssignees !== false,
  }
}

export function validateLeadDistributionPolicy(
  policy: LeadDistributionPolicy,
  t: (key: import("lib/i18n/translations/projects").ProjectsTranslationKey) => string
): string | null {
  if (!policy.enabled) return null
  const crm = policy.crmMode ?? "keep_linked"
  if (crm === "move_to" && !policy.targetProjectId?.trim()) {
    return t("leadDistValidationMoveToProject")
  }
  if (crm === "pick_from_list" && !(policy.projectIds?.length ?? 0)) {
    return t("leadDistValidationPickFromList")
  }
  const assign = policy.assignMode ?? "none"
  if (assign === "specific_user" && !policy.specificUserId?.trim()) {
    return t("leadDistValidationSpecificUser")
  }
  if (assign === "member_list" && !(policy.userIds?.length ?? 0)) {
    return t("leadDistValidationMemberList")
  }
  if (assign === "by_workspace_role" && !policy.workspaceRoleId?.trim()) {
    return t("leadDistValidationWorkspaceRole")
  }
  return null
}
