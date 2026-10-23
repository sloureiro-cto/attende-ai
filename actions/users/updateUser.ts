"use server"

import { z } from "zod"
import { ActionOutput } from "app/_types/Action"
import { IUser } from "app/_types/User"
import { FetchClient, HttpError } from "lib/api"
import { updateUserSchema } from "validations/register"

type UpdateUserResponse = {
  status: boolean
  user: IUser
}

export const updateUserAction = async (data: z.infer<typeof updateUserSchema>): Promise<ActionOutput<IUser>> => {
  const validatedFields = updateUserSchema.safeParse(data)

  if (validatedFields.error || !validatedFields.data) {
    return { success: false, error: validatedFields.error.issues[0]!.message }
  }

  const {
    name,
    email,
    username,
    password,
    image,
    aboutMe,
    role,
    pronouns,
    genericRole,
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    country,
    phone,
    birthDate,
    language,
    twoFactorEnabled,
  } = validatedFields.data

  try {
    const data = await FetchClient.patch<UpdateUserResponse>(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/me`, {
      name,
      email,
      username,
      password,
      image,
      aboutMe,
      pronouns,
      genericRole,
      role,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      phoneNumber: phone,
      birthDate,
      language,
      twoFactorEnabled,
    })

    return { success: true, data: data.user }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching time tracker tags",
    }
  }
}
