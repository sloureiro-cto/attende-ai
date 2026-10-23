"use client"

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from "react"
import { IRole } from "app/_types/Role"

export type RolesContextProps = {
  selectedRoleToDelete: IRole | null
  setSelectedRoleToDelete: Dispatch<SetStateAction<IRole | null>>
}

export const RolesContext = createContext<RolesContextProps>({
  selectedRoleToDelete: null,
  setSelectedRoleToDelete: () => {},
})

export const useRolesContext = (): RolesContextProps => {
  const context = useContext(RolesContext)
  if (!context) {
    throw new Error("useRolesContext must be used within a RolesProvider")
  }
  return context
}

interface RolesProviderProps {
  children: ReactNode
}

export const RolesProvider = ({ children }: RolesProviderProps) => {
  const [selectedRoleToDelete, setSelectedRoleToDelete] = useState<IRole | null>(null)

  return (
    <RolesContext.Provider value={{ selectedRoleToDelete, setSelectedRoleToDelete }}>{children}</RolesContext.Provider>
  )
}
