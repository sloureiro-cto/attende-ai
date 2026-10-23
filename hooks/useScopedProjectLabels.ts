"use client"

import { useMemo } from "react"
import { useActiveBoardId } from "context/ActiveBoardContext"
import { useProjects } from "context/ProjectContext"
import { useLabels } from "context/ProjectLabelsContext"
import { filterLabelsForBoard, ProjectLabelSharingMode } from "lib/labels/filterLabelsForBoard"

export function useScopedProjectLabels() {
  const { labels } = useLabels()
  const { currentProject } = useProjects()
  const boardId = useActiveBoardId()
  const sharingMode: ProjectLabelSharingMode = currentProject?.labelSharingMode ?? "shared"
  const allLabels = labels ?? []

  const pickerLabels = useMemo(
    () => filterLabelsForBoard(allLabels, boardId, sharingMode),
    [allLabels, boardId, sharingMode]
  )

  return {
    allLabels,
    pickerLabels,
    sharingMode,
    boardId,
    isScoped: sharingMode === "scoped",
  }
}
