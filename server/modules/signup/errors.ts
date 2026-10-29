import 'server-only';
import { AppError } from '../../lib/errors';

/** Stable `reference` codes of `/api/attende/signup`. The frontend branches on these, never on the message. */
export const SIGNUP_ERRORS = {
  INVALID_BODY: [422, 'SIGNUP_INVALID_BODY'],
  DISPOSABLE_EMAIL: [422, 'SIGNUP_DISPOSABLE_EMAIL'],
  PASSWORD_CONTAINS_NAME: [422, 'SIGNUP_PASSWORD_CONTAINS_NAME'],
  EMAIL_IN_USE: [409, 'SIGNUP_EMAIL_IN_USE'],
  USER_EXISTS_UNMANAGED: [409, 'USER_EXISTS_UNMANAGED'],
  OTP_NOT_FOUND: [404, 'SIGNUP_OTP_NOT_FOUND'],
  OTP_EXPIRED: [400, 'SIGNUP_OTP_EXPIRED'],
  OTP_INVALID: [400, 'SIGNUP_OTP_INVALID'],
  NOT_VERIFIED: [403, 'SIGNUP_NOT_VERIFIED'],
  NO_SIGNUP: [404, 'SIGNUP_NOT_FOUND'],
  PLAN_NOT_AVAILABLE: [422, 'SIGNUP_PLAN_NOT_AVAILABLE'],
  TRIAL_IN_PROGRESS: [409, 'SIGNUP_TRIAL_IN_PROGRESS'],
  TRIAL_ALREADY_USED: [409, 'SIGNUP_TRIAL_ALREADY_USED'],
  PAYMENT_METHOD_INVALID: [422, 'SIGNUP_PAYMENT_METHOD_INVALID'],
  PAYMENT_FAILED: [402, 'SIGNUP_PAYMENT_FAILED'],
  RATE_LIMITED: [429, 'SIGNUP_RATE_LIMITED'],
} as const;

export type SignupErrorKey = keyof typeof SIGNUP_ERRORS;

export const signupError = (key: SignupErrorKey, message: string, details?: Record<string, unknown>) =>
  new AppError(SIGNUP_ERRORS[key][0], message, SIGNUP_ERRORS[key][1], details);
