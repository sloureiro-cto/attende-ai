"use client"

import { createContext, useContext } from "react"
import type { IProject } from "app/_types/Project"
import { isActiveBoardCrm } from "lib/projects/projectBoardRefs"

export type ActiveBoardType = "kanban" | "scrum" | "crm"

type ActiveBoardValue = {
  boardId?: string
  boardType?: ActiveBoardType
}

/**
 * The board currently being viewed — independent of `ProjectContext.currentProject`, which stays
 * pinned to the *project* (needed by the navbar's tab bar) even when viewing a non-default board
 * tab. Defaults to empty outside a provider so existing pages that don't set it explicitly
 * fall back to the project's own default board.
 */
const ActiveBoardContext = createContext<ActiveBoardValue>({})

export const useActiveBoardId = (): string | undefined => useContext(ActiveBoardContext).boardId

export const useActiveBoardType = (): ActiveBoardType | undefined => useContext(ActiveBoardContext).boardType

export function useIsCrmBoard(project?: IProject | null): boolean {
  const { boardId, boardType } = useContext(ActiveBoardContext)
  if (boardType) return boardType === "crm"
  if (project) return isActiveBoardCrm(project, boardId)
  return false
}

export const ActiveBoardProvider: React.FC<{
  boardId?: string
  boardType?: ActiveBoardType
  children: React.ReactNode
}> = ({ boardId, boardType, children }) => (
  <ActiveBoardContext.Provider value={{ boardId, boardType }}>{children}</ActiveBoardContext.Provider>
)
