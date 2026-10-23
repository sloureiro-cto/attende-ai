"use server"

import { IUserRole } from "app/_types/UserRole"
import { auth } from "auth"
import { FetchClient } from "lib/api"

interface IPermissionsResponse {
  roles: IUserRole[]
  entityByPass?: string[]
}

export type InitialPermissions = {
  roles: IUserRole[]
  entityByPass: string[] | null
} | null

export const getUserPermissions = async () => {
  const session = await auth()

  if (!session || !session.apiToken) {
    return null
  }

  try {
    const data = await FetchClient.get<IPermissionsResponse>(`${process.env.BACKEND_URL}/user-role/me`, {
      cache: "no-store",
    })

    return data
  } catch (error: unknown) {
    if (error instanceof Error) {
      return null
    }

    return null
  }
}
