import { HttpError } from "lib/api"

export const PUBLIC_AUTH_ERRORS = {
  RATE_LIMIT: 429,
} as const

export const AUTH_ERROR_CODES = {
  CREDENTIALS_FAILED: "AUTH_CREDENTIALS_FAILED",
  VERIFICATION_FAILED: "AUTH_VERIFICATION_FAILED",
  SERVER_ERROR: "AUTH_SERVER_ERROR",
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

export type AuthErrorContext = "credentials" | "otp" | "resend"

const EXPIRED_LOGIN_CHALLENGE_PATTERNS = [
  "invalid or expired login challenge",
  "verification otp has expired",
  "verification otp not found",
]

export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return Object.values(AUTH_ERROR_CODES).includes(value as AuthErrorCode)
}

export function isExpiredLoginChallenge(backendMessage: string): boolean {
  const normalized = backendMessage.toLowerCase()
  return EXPIRED_LOGIN_CHALLENGE_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export function getPublicAuthErrorCode(options: {
  status?: number
  context: AuthErrorContext
}): AuthErrorCode | string {
  const { status, context } = options

  if (status != null && status >= 500) {
    return AUTH_ERROR_CODES.SERVER_ERROR
  }

  if (context === "credentials") {
    return AUTH_ERROR_CODES.CREDENTIALS_FAILED
  }

  return AUTH_ERROR_CODES.VERIFICATION_FAILED
}

export function sanitizeAuthActionError(
  error: HttpError,
  context: AuthErrorContext
): {
  error: AuthErrorCode | string
  status?: number
  expiredChallenge?: boolean
} {
  const expiredChallenge = context !== "credentials" && isExpiredLoginChallenge(error.message)

  if (error.status === PUBLIC_AUTH_ERRORS.RATE_LIMIT) {
    return {
      error: error.message,
      status: error.status,
      expiredChallenge: expiredChallenge || undefined,
    }
  }

  return {
    error: getPublicAuthErrorCode({ status: error.status, context }),
    status: error.status,
    expiredChallenge: expiredChallenge || undefined,
  }
}
