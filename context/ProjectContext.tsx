"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import React, { createContext, useContext, useEffect, useState } from "react"

import { getCardFieldDefinitionsAction, ICardFieldDefinition } from "actions/projects/cardFieldDefinitions"
import { asArray } from "lib/blockNote/parseBlockNoteInitialContent"
import { IInvite } from "app/_types/Invite"
import { IProject } from "app/_types/Project"
import { IUser } from "app/_types/User"
import {
  DEFAULT_PROJECTS_SORT_BY,
  DEFAULT_PROJECTS_SORT_ORDER,
  EMPTY_PROJECTS_LIST_FILTER,
  type ProjectsListFilter,
  type ProjectsSortBy,
} from "app/projects/components/filters/projectsFilterTypes"

interface ProjectContextType {
  currentProject: IProject | null
  setCurrentProject: React.Dispatch<React.SetStateAction<IProject | null>>
  /** Prefetched once per CRM project (not per card-modal-open) — see CustomFields components in CardDetails/LeadDetails. */
  cardFieldDefinitions: ICardFieldDefinition[]
  cardFieldDefinitionsLoading: boolean
  refetchCardFieldDefinitions: () => Promise<void>
  /** Seeds cardFieldDefinitions from a server-fetched value (see crm/layout.tsx) so the first card modal opened in a session doesn't wait on a client round-trip that only starts after hydration. */
  hydrateCardFieldDefinitions: (fields: ICardFieldDefinition[], boardId?: string) => void
  cardFieldDefinitionsBoardId?: string
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  isLoadingMore: boolean
  setIsLoadingMore: React.Dispatch<React.SetStateAction<boolean>>
  projects: IProject[]
  setProjects: React.Dispatch<React.SetStateAction<IProject[]>>
  view: "board" | "list"
  setView: React.Dispatch<React.SetStateAction<"board" | "list">>
  usersFromProjectLoading: boolean
  setUsersFromProjectLoading: React.Dispatch<React.SetStateAction<boolean>>
  projectUsers: Array<{ included: Array<IUser>; pending: Array<IInvite> }>
  setProjectUsers: React.Dispatch<React.SetStateAction<Array<{ included: Array<IUser>; pending: Array<IInvite> }>>>
  titleSearch: string
  setTitleSearch: React.Dispatch<React.SetStateAction<string>>
  totalProjects: number
  setTotalProjects: React.Dispatch<React.SetStateAction<number>>
  projectsListFilter: ProjectsListFilter
  setProjectsListFilter: React.Dispatch<React.SetStateAction<ProjectsListFilter>>
  sortBy: ProjectsSortBy
  setSortBy: React.Dispatch<React.SetStateAction<ProjectsSortBy>>
  sortOrder: "asc" | "desc"
  setSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider")
  }
  return context
}

/** Use inside the project subtree to render board-style filter UI for a CRM project preview (workspace settings blast, etc.). */
export function ProjectPreviewProvider({
  previewProject,
  children,
}: {
  previewProject: IProject | null | undefined
  children: React.ReactNode
}) {
  const parent = useProjects()

  const value = React.useMemo(
    (): ProjectContextType => ({
      ...parent,
      currentProject: previewProject ?? parent.currentProject,
    }),
    [parent, previewProject]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<IProject | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [projectUsers, setProjectUsers] = useState<Array<{ included: Array<IUser>; pending: Array<IInvite> }>>([])
  const [titleSearch, setTitleSearch] = useState<string>("")
  const [totalProjects, setTotalProjects] = useState<number>(0)
  const [usersFromProjectLoading, setUsersFromProjectLoading] = useState<boolean>(false)
  const [projects, setProjects] = useState<IProject[]>([])
  const [view, setView] = useState<"board" | "list">("list")
  const [projectsListFilter, setProjectsListFilter] = useState<ProjectsListFilter>(EMPTY_PROJECTS_LIST_FILTER)
  const [sortBy, setSortBy] = useState<ProjectsSortBy>(DEFAULT_PROJECTS_SORT_BY)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(DEFAULT_PROJECTS_SORT_ORDER)

  const [cardFieldDefinitions, setCardFieldDefinitions] = useState<ICardFieldDefinition[]>([])
  const [cardFieldDefinitionsLoading, setCardFieldDefinitionsLoading] = useState<boolean>(false)
  const [cardFieldDefinitionsBoardId, setCardFieldDefinitionsBoardId] = useState<string | undefined>()
  const cardFieldDefinitionsBoardIdRef = React.useRef<string | undefined>(undefined)
  const lastFieldDefinitionsProjectIdRef = React.useRef<string | undefined>(undefined)

  const { data: session } = useSession()
  const router = useRouter()

  const fetchCardFieldDefinitions = React.useCallback(
    async (projectId: string, options?: { silent?: boolean; boardId?: string }) => {
    // `silent` skips the loading flag: callers like refetchCardFieldDefinitions
    // use this purely to resync the shared cache after a mutation that already
    // applied its own optimistic update — flipping the shared loading flag here
    // would blank out CustomFieldsContent's whole panel (it renders a spinner
    // in place of the fields list while loading) on every add/edit/delete/reorder,
    // which reads to the user as the settings page refreshing itself.
    if (!options?.silent) setCardFieldDefinitionsLoading(true)
    const boardId = options?.boardId ?? cardFieldDefinitionsBoardIdRef.current
    const result = await getCardFieldDefinitionsAction({ projectId, boardId })
    if (result.success) {
      setCardFieldDefinitions(asArray(result.data))
      if (boardId) {
        cardFieldDefinitionsBoardIdRef.current = boardId
        setCardFieldDefinitionsBoardId(boardId)
      }
    }
    if (!options?.silent) setCardFieldDefinitionsLoading(false)
  }, [])

  const hydrateCardFieldDefinitions = React.useCallback((fields: ICardFieldDefinition[], boardId?: string) => {
    setCardFieldDefinitions(asArray(fields))
    setCardFieldDefinitionsLoading(false)
    if (boardId) {
      cardFieldDefinitionsBoardIdRef.current = boardId
      setCardFieldDefinitionsBoardId(boardId)
    }
  }, [])

  useEffect(() => {
    // Custom fields are available for every project type now, not just CRM
    // — only requirement is a resolved project id. No state reset here on
    // the "not ready yet" branch: a descendant layout (e.g. crm/ClientLayout)
    // may have already hydrated cardFieldDefinitions from its own
    // server-side fetch in this same effect flush (its effect runs before
    // this one, since it's a child), and clearing it back to `[]` here would
    // just undo that and reintroduce the loading flash this was meant to fix.
    if (!currentProject?._id) return
    if (
      lastFieldDefinitionsProjectIdRef.current &&
      lastFieldDefinitionsProjectIdRef.current !== currentProject._id
    ) {
      cardFieldDefinitionsBoardIdRef.current = undefined
      setCardFieldDefinitionsBoardId(undefined)
      setCardFieldDefinitions([])
    }
    lastFieldDefinitionsProjectIdRef.current = currentProject._id
    let cancelled = false
    setCardFieldDefinitionsLoading(true)
    getCardFieldDefinitionsAction({
      projectId: currentProject._id,
      boardId: cardFieldDefinitionsBoardIdRef.current,
    }).then((result) => {
      if (cancelled) return
      if (result.success) setCardFieldDefinitions(asArray(result.data))
      setCardFieldDefinitionsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [currentProject?._id])

  useEffect(() => {
    if (!currentProject || !session) return

    const includedUsers = currentProject.includedUsers ?? []
    const removedUsers = currentProject.removedUsers ?? []

    const userNotIncluded = currentProject.private && !includedUsers.some((user: IUser) => user._id === session.user.id)
    const removedUser = !currentProject.private && removedUsers.some((user: IUser) => user._id === session.user.id)

    if (userNotIncluded || removedUser) {
      router.push(`/projects/${currentProject._id}/unauthorized`)
      return
    }
  }, [currentProject, session])

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        cardFieldDefinitions,
        cardFieldDefinitionsLoading,
        refetchCardFieldDefinitions: () =>
          currentProject?._id ? fetchCardFieldDefinitions(currentProject._id, { silent: true }) : Promise.resolve(),
        hydrateCardFieldDefinitions,
        cardFieldDefinitionsBoardId,
        isLoading,
        setIsLoading,
        isLoadingMore,
        setIsLoadingMore,
        projects,
        setProjects,
        view,
        setView,
        usersFromProjectLoading,
        setUsersFromProjectLoading,
        projectUsers,
        setProjectUsers,
        titleSearch,
        setTitleSearch,
        totalProjects,
        setTotalProjects,
        projectsListFilter,
        setProjectsListFilter,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
