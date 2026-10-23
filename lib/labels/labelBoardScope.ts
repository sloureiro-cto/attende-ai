import { ILabel } from "app/_types/Label"
import type { ProjectBoardRef } from "lib/projects/projectBoardRefs"

/** Empty boardIds means the label applies to every board in the project. */
export function isProjectWideLabel(label: Pick<ILabel, "boardIds">): boolean {
  return !label.boardIds || label.boardIds.length === 0
}

export function formatLabelBoardScope(
  label: Pick<ILabel, "boardIds">,
  boards: ProjectBoardRef[],
  allBoardsLabel: string
): string {
  if (isProjectWideLabel(label)) return allBoardsLabel
  const names = (label.boardIds ?? [])
    .map((id) => boards.find((board) => board.boardId === String(id))?.title)
    .filter(Boolean) as string[]
  return names.length > 0 ? names.join(", ") : allBoardsLabel
}

export function defaultBoardIdsForNewLabel(
  sharingMode: "shared" | "scoped" | undefined,
  activeBoardId: string | undefined
): string[] | undefined {
  if (sharingMode !== "scoped" || !activeBoardId) return undefined
  return [activeBoardId]
}
