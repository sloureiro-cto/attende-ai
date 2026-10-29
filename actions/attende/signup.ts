"use server"

import jwt from "jsonwebtoken"
import { type AttendeApiResult, attendeFetch } from "lib/attende/signup/api"
import { BILLING_CURRENCY, DEFAULT_TRIAL, parseSignupPlans, type SignupPlansResponse } from "lib/attende/signup/plans"
import type {
  CreateSignupData,
  CreateSignupInput,
  SetupIntentData,
  SignupActionResult,
  StartTrialData,
  VerifySignupData,
} from "lib/attende/signup/types"
import { SIGNUP_VERIFY_PROOF_PURPOSE, type SignupVerifyProofPayload } from "lib/auth/signupProof"

function toResult<T>(result: AttendeApiResult<T>): SignupActionResult<T> {
  if (result.ok) return { success: true, data: result.data }
  return { success: false, status: result.status, reference: result.reference, message: result.message }
}

/** Public. Never fails: a missing catalog just means prices are shown at checkout. */
export async function getSignupPlansAction(): Promise<SignupPlansResponse> {
  const result = await attendeFetch<unknown>("/attende/signup/plans", {})
  return result.ok ? parseSignupPlans(result.data) : { trial: DEFAULT_TRIAL, currency: BILLING_CURRENCY, plans: [] }
}

/** Public. Creates the (unverified) JSYNQ account; JSYNQ e-mails the code. 409 `USER_EXISTS_UNMANAGED`: sign in instead. */
export async function createSignupAction(input: CreateSignupInput): Promise<SignupActionResult<CreateSignupData>> {
  return toResult(await attendeFetch<CreateSignupData>("/attende/signup", { method: "POST", body: input }))
}

/**
 * Public. Verifies the code with JSYNQ (which marks the account verified) and answers a one-minute `signupProof` the
 * caller passes to `signIn("credentials", { signupProof })`: JSYNQ accounts made by its signup have 2FA on, so a
 * password sign-in right after would ask for another code. The proof is signed with `AUTH_SECRET`, like the login 2FA
 * proof, and only ever made from a verification JSYNQ just accepted.
 */
export async function verifySignupAction(input: {
  email: string
  otp: string
}): Promise<SignupActionResult<VerifySignupData & { signupProof: string }>> {
  const result = toResult(
    await attendeFetch<VerifySignupData & { accessToken?: unknown }>("/attende/signup/verify", {
      method: "POST",
      body: input,
    })
  )
  if (!result.success) return result
  const { accessToken: _token, ...data } = (result.data ?? {}) as VerifySignupData & { accessToken?: unknown }
  const payload: SignupVerifyProofPayload = {
    purpose: SIGNUP_VERIFY_PROOF_PURPOSE,
    user: {
      id: data.id,
      email: data.email,
      name: data.name,
      image: data.image ?? null,
      onboarded: data.onboarded ?? false,
      isVerified: data.isVerified,
      twoFactorEnabled: data.twoFactorEnabled,
      workspaceId: data.workspaceId,
      stripeCustomerId: data.stripeCustomerId,
    },
  }
  const signupProof = jwt.sign(payload, process.env.AUTH_SECRET!, { expiresIn: "60s" })
  return { success: true, data: { ...data, signupProof } }
}

/** Public. Always answers success (the backend never reveals whether the e-mail exists). */
export async function resendSignupAction(input: { email: string }): Promise<SignupActionResult<{ sent: boolean }>> {
  return toResult(await attendeFetch<{ sent: boolean }>("/attende/signup/resend", { method: "POST", body: input }))
}

/** Session. JSYNQ's SetupIntent for the card form (confirmed with JSYNQ's publishable key). */
export async function createSignupSetupIntentAction(): Promise<SignupActionResult<SetupIntentData>> {
  return toResult(await attendeFetch<SetupIntentData>("/attende/signup/setup-intent", { method: "POST", body: {}, session: true }))
}

/**
 * Session. Creates the workspace and its JSYNQ subscription with the 7-day trial (or, with `withoutTrial`, charged at
 * once: offered when the card or e-mail already had a trial). Idempotent on the backend.
 */
export async function startAttendeTrialAction(input: {
  paymentMethodId: string
  planSlug?: string
  withoutTrial?: boolean
}): Promise<SignupActionResult<StartTrialData>> {
  return toResult(
    await attendeFetch<StartTrialData>("/attende/signup/start-trial", { method: "POST", body: input, session: true })
  )
}
