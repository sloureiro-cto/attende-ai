"use server"

import { ActionOutput } from "app/_types/Action"
import { IUser } from "app/_types/User"
import { FetchClient, HttpError } from "lib/api"

export interface GetMeActionResponse {
  user: IUser
  hasPassword: boolean
}

export const getMeAction = async (): Promise<ActionOutput<GetMeActionResponse>> => {
  try {
    const data = await FetchClient.get<GetMeActionResponse>(`${process.env.BACKEND_URL}/users/me`)
    return { success: true, data: data }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching users from workspace",
    }
  }
}
