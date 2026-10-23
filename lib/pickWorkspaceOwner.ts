export function pickWorkspaceOwner(
  explicit?: string | null,
  sessionWorkspaceId?: string | null
): string | undefined {
  const fromArg = explicit?.trim()
  if (fromArg) return fromArg
  return typeof sessionWorkspaceId === "string" && sessionWorkspaceId.trim()
    ? sessionWorkspaceId.trim()
    : undefined
}
