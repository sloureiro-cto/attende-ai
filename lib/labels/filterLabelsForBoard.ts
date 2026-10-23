import { ILabel } from "app/_types/Label"

export type ProjectLabelSharingMode = "shared" | "scoped"

export function isLabelVisibleOnBoard(
  label: Pick<ILabel, "boardIds">,
  boardId: string | null | undefined,
  sharingMode: ProjectLabelSharingMode | null | undefined
): boolean {
  if (sharingMode !== "scoped") return true
  if (!boardId) return true

  const scopedBoardIds = (label.boardIds ?? []).map(String).filter(Boolean)
  if (scopedBoardIds.length === 0) return true

  return scopedBoardIds.includes(String(boardId))
}

export function filterLabelsForBoard<T extends Pick<ILabel, "boardIds">>(
  labels: T[],
  boardId: string | null | undefined,
  sharingMode: ProjectLabelSharingMode | null | undefined
): T[] {
  if (sharingMode !== "scoped" || !boardId) return labels
  return labels.filter((label) => isLabelVisibleOnBoard(label, boardId, sharingMode))
}
