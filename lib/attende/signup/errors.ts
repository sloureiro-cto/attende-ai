import { serviceErrorKey } from "lib/attende/result"
import type { SignupTranslationKey } from "lib/i18n/translations/attende/signup"

/** Stable `reference` values of `/api/attende/signup` (see the backend contract). The UI branches on these, never on messages. */
export const SIGNUP_ERROR_REFERENCES = [
  "SIGNUP_INVALID_BODY",
  "SIGNUP_DISPOSABLE_EMAIL",
  "SIGNUP_PASSWORD_CONTAINS_NAME",
  "SIGNUP_EMAIL_IN_USE",
  "SIGNUP_OTP_NOT_FOUND",
  "SIGNUP_OTP_EXPIRED",
  "SIGNUP_OTP_INVALID",
  "SIGNUP_NOT_VERIFIED",
  "SIGNUP_NOT_FOUND",
  "SIGNUP_PLAN_NOT_AVAILABLE",
  "SIGNUP_PAYMENT_METHOD_INVALID",
  "SIGNUP_TRIAL_ALREADY_USED",
  "SIGNUP_TRIAL_IN_PROGRESS",
  "SIGNUP_PAYMENT_FAILED",
  "SIGNUP_RATE_LIMITED",
  "USER_EXISTS_UNMANAGED",
] as const

export type SignupErrorReference = (typeof SIGNUP_ERROR_REFERENCES)[number]

const KNOWN = new Set<string>(SIGNUP_ERROR_REFERENCES)

export const isSignupErrorReference = (value: unknown): value is SignupErrorReference => typeof value === "string" && KNOWN.has(value)

/** Friendly message key for a failed call. Unknown references fall back on the HTTP status, then on a generic message. */
export function signupErrorKey(reference: string | undefined, status?: number): SignupTranslationKey {
  if (isSignupErrorReference(reference)) return `err${reference}` as SignupTranslationKey
  const service = serviceErrorKey(reference)
  if (service) return service
  if (status === 429) return "errSIGNUP_RATE_LIMITED"
  if (status === 0 || status === 502 || status === 503 || status === 504) return "errSIGNUP_NETWORK"
  return "errSIGNUP_GENERIC"
}

/** Errors the user fixes by going back one step (as opposed to retrying the same step). */
export function sendsBackToAccountStep(reference: string | undefined): boolean {
  return reference === "SIGNUP_OTP_NOT_FOUND" || reference === "SIGNUP_NOT_FOUND"
}

/** The card step may retry with another card; these never succeed on a retry with the same input. */
export function isTerminalTrialError(reference: string | undefined): boolean {
  return reference === "SIGNUP_TRIAL_ALREADY_USED" || reference === "SIGNUP_PLAN_NOT_AVAILABLE"
}

/**
 * The e-mail already belongs to a JSYNQ account this signup did not create (409 `USER_EXISTS_UNMANAGED`): the person signs
 * in with it, then comes back to the card step, where `start-trial` runs with that session.
 */
export const isExistingAccount = (reference: string | undefined): boolean => reference === "USER_EXISTS_UNMANAGED"

/** Where the "sign in to continue" link sends an existing account: the login page, then back to the card step. */
export function existingAccountSignInUrl(planSlug: string): string {
  const back = `/signup?existing=1&plan=${encodeURIComponent(planSlug)}`
  return `/login?callbackUrl=${encodeURIComponent(back)}`
}
