"use client"

import { useCallback } from "react"
import { useVerifyOtpTranslation } from "hooks/useVerifyOtpTranslation"
import { useWorkspaceSettingsTranslation } from "hooks/useWorkspaceSettingsTranslation"
import { AUTH_ERROR_CODES, isAuthErrorCode, PUBLIC_AUTH_ERRORS } from "lib/auth/publicAuthErrors"

type AuthErrorMessageContext = "credentials" | "otp"

export function useAuthErrorMessage() {
  const { t } = useWorkspaceSettingsTranslation()
  const { t: tOtp } = useVerifyOtpTranslation()

  const resolveAuthErrorMessage = useCallback(
    (error: string, status?: number, context: AuthErrorMessageContext = "otp"): string => {
      if (status === PUBLIC_AUTH_ERRORS.RATE_LIMIT) {
        return error
      }

      if (error === AUTH_ERROR_CODES.SERVER_ERROR) {
        return t("somethingWentWrongTryAgain")
      }

      if (error === AUTH_ERROR_CODES.CREDENTIALS_FAILED || context === "credentials") {
        return t("emailOrPasswordInvalid")
      }

      if (error === AUTH_ERROR_CODES.VERIFICATION_FAILED || isAuthErrorCode(error)) {
        return tOtp("authVerificationFailed")
      }

      return error
    },
    [t, tOtp]
  )

  return { resolveAuthErrorMessage }
}
