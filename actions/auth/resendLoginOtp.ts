"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"
import { AUTH_ERROR_CODES, sanitizeAuthActionError } from "lib/auth/publicAuthErrors"
import { resendLoginOtpSchema } from "validations/auth/login2fa"

export async function resendLoginOtp(data: { loginChallengeId: string }): Promise<ActionOutput<true>> {
  const validatedFields = resendLoginOtpSchema.safeParse(data)

  if (validatedFields.error || !validatedFields.data) {
    return { success: false, error: validatedFields.error.issues[0]!.message }
  }

  const { loginChallengeId } = validatedFields.data

  try {
    await FetchClient.post(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/resend-otp`,
      { loginChallengeId },
      { withoutToken: true }
    )

    return { success: true, data: true }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, ...sanitizeAuthActionError(error, "resend") }
    }

    return {
      success: false,
      error: AUTH_ERROR_CODES.VERIFICATION_FAILED,
    }
  }
}
