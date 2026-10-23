"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"
import { AUTH_ERROR_CODES, sanitizeAuthActionError } from "lib/auth/publicAuthErrors"
import type { LoginStep1Response } from "types/auth/login"
import { loginSchema } from "validations/login"

export async function loginWithPassword(data: {
  email: string
  password: string
}): Promise<ActionOutput<LoginStep1Response>> {
  const validatedFields = loginSchema.safeParse(data)

  if (validatedFields.error || !validatedFields.data) {
    return { success: false, error: validatedFields.error.issues[0]!.message }
  }

  const { email, password } = validatedFields.data

  try {
    const response = await FetchClient.post<LoginStep1Response>(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth`,
      { email, password },
      { withoutToken: true }
    )

    return { success: true, data: response }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, ...sanitizeAuthActionError(error, "credentials") }
    }

    return {
      success: false,
      error: AUTH_ERROR_CODES.CREDENTIALS_FAILED,
    }
  }
}
