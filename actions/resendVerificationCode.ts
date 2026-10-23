"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"
import { AUTH_ERROR_CODES, sanitizeAuthActionError } from "lib/auth/publicAuthErrors"

export async function resendVerificationCode(email: string): Promise<ActionOutput<true>> {
  try {
    await FetchClient.post(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/verification-otps`,
      { identifier: email },
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
