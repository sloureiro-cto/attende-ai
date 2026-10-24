import type { SignupTranslationKey } from "lib/i18n/translations/attende/signup"

export type SignupAccountValues = { name: string; email: string; password: string; businessName: string; acceptedTerms: boolean }
export type SignupAccountField = keyof SignupAccountValues
export type SignupAccountErrors = Partial<Record<SignupAccountField, SignupTranslationKey>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 200

/** The first rule the password breaks (backend rule: 8 to 200 characters, a digit and a special character), or null. */
export function passwordProblem(password: string): SignupTranslationKey | null {
  if (password.length < PASSWORD_MIN) return "signupPasswordTooShort"
  if (password.length > PASSWORD_MAX) return "signupPasswordTooLong"
  if (!/\d/.test(password)) return "signupPasswordNeedsNumber"
  if (!/[^A-Za-z0-9]/.test(password)) return "signupPasswordNeedsSymbol"
  return null
}

export function isStrongEnoughPassword(password: string): boolean {
  return passwordProblem(password) === null
}

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Mirrors the backend's "password must not contain your name": any name part of 3+ letters found in the password. */
export function passwordContainsName(password: string, name: string): boolean {
  const pass = normalize(password)
  return normalize(name)
    .split(/\s+/)
    .filter((part) => part.length >= 3)
    .some((part) => pass.includes(part))
}

/** Client-side validation of the account step. The backend repeats every check; this only saves a round trip. */
export function validateSignupAccount(values: SignupAccountValues): SignupAccountErrors {
  const errors: SignupAccountErrors = {}
  if (values.name.trim().length < 2) errors.name = "signupFieldRequired"
  if (!values.email.trim()) errors.email = "signupFieldRequired"
  else if (!EMAIL.test(values.email.trim())) errors.email = "signupEmailInvalid"
  if (!values.password) errors.password = "signupFieldRequired"
  else if (passwordProblem(values.password))
    errors.password = passwordProblem(values.password) ?? "signupPasswordInvalid"
  else if (passwordContainsName(values.password, values.name)) errors.password = "errSIGNUP_PASSWORD_CONTAINS_NAME"
  if (values.businessName.trim().length < 2) errors.businessName = "signupFieldRequired"
  if (!values.acceptedTerms) errors.acceptedTerms = "signupTermsRequired"
  return errors
}

export const hasErrors = (errors: SignupAccountErrors): boolean => Object.keys(errors).length > 0

/** Seconds left before the "send a new code" button works again. */
export function resendCooldownLeft(sentAtMs: number, nowMs: number, cooldownSeconds = 60): number {
  return Math.max(0, Math.ceil(cooldownSeconds - (nowMs - sentAtMs) / 1000))
}

/** Keeps only digits, at most six: handles typing, paste with spaces/dashes and autofill. */
export function sanitizeOtp(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6)
}
