"use client"

import { useSession } from "next-auth/react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { IUserRole } from "app/_types/UserRole"
import { getUserPermissions, type InitialPermissions } from "app/api/permissions"

interface UsePermissionsContextType {
  userRoles: IUserRole[] | null
  entityByPass: string[] | null
  revalidatePermissions: () => Promise<void>
}

const PermissionsContext = createContext<UsePermissionsContextType | undefined>(undefined)

export const usePermissions = (): UsePermissionsContextType => {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider")
  }
  return context
}

export const PermissionsProvider: React.FC<{
  children: React.ReactNode
  initialPermissions?: InitialPermissions
}> = ({ children, initialPermissions = null }) => {
  const [userRoles, setUserRoles] = useState<IUserRole[] | null>(initialPermissions?.roles ?? null)
  const [entityByPass, setEntityByPass] = useState<string[] | null>(initialPermissions?.entityByPass ?? null)
  const { data: session, status } = useSession()

  const revalidatePermissions = useCallback(async () => {
    const data = await getUserPermissions()

    if (!data) {
      return
    }

    setUserRoles(data.roles)
    setEntityByPass(data.entityByPass ?? null)
  }, [])

  useEffect(() => {
    if (status !== "authenticated") {
      return
    }

    void revalidatePermissions()
  }, [status, session?.user?.workspaceId, revalidatePermissions])

  return (
    <PermissionsContext.Provider
      value={{
        userRoles,
        entityByPass,
        revalidatePermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  )
}
