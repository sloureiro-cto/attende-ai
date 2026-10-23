export type WorkspaceWithEntitlements = {
  _id: string
  entitlements?: { bots?: boolean } | null
}

/**
 * Whether a workspace may use the bots app. The backend sets `entitlements.bots`; while the field is
 * absent (older backend) the shell stays permissive and the server-side gate is the enforcement.
 */
export function isWorkspaceEntitled(workspace: WorkspaceWithEntitlements | null | undefined): boolean {
  if (!workspace) return false
  if (workspace.entitlements && typeof workspace.entitlements === "object") {
    return workspace.entitlements.bots === true
  }
  return true
}

export function filterEntitled<T extends WorkspaceWithEntitlements>(workspaces: T[]): T[] {
  return workspaces.filter((workspace) => isWorkspaceEntitled(workspace))
}
