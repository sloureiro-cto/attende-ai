"use server"

import jwt from "jsonwebtoken"
import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"
import { type Login2faProofPayload, LOGIN_2FA_PROOF_PURPOSE } from "lib/auth/loginProof"
import { AUTH_ERROR_CODES, sanitizeAuthActionError } from "lib/auth/publicAuthErrors"
import type { AuthUserLoginResponse } from "types/auth/login"
import { verifyLoginOtpSchema } from "validations/auth/login2fa"

type VerifyLoginOtpSuccess = {
  loginProof: string
}

export async function verifyLoginOtp(data: {
  loginChallengeId: string
  otp: string
}): Promise<ActionOutput<VerifyLoginOtpSuccess>> {
  const validatedFields = verifyLoginOtpSchema.safeParse(data)

  if (validatedFields.error || !validatedFields.data) {
    return { success: false, error: validatedFields.error.issues[0]!.message }
  }

  const { loginChallengeId, otp } = validatedFields.data

  try {
    const user = await FetchClient.post<AuthUserLoginResponse>(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-otp`,
      { loginChallengeId, otp },
      { withoutToken: true }
    )

    const payload: Login2faProofPayload = {
      purpose: LOGIN_2FA_PROOF_PURPOSE,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        onboarded: user.onboarded,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        workspaceId: user.workspaceId,
        stripeCustomerId: user.stripeCustomerId,
      },
    }

    const loginProof = jwt.sign(payload, process.env.AUTH_SECRET!, { expiresIn: "60s" })

    return { success: true, data: { loginProof } }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, ...sanitizeAuthActionError(error, "otp") }
    }

    return {
      success: false,
      error: AUTH_ERROR_CODES.VERIFICATION_FAILED,
    }
  }
}
