"use server"

import { type AttendeApiResult, attendeFetch } from "lib/attende/signup/api"
import { DEFAULT_TRIAL, parseSignupPlans, type SignupPlansResponse } from "lib/attende/signup/plans"
import type {
  CreateSignupData,
  CreateSignupInput,
  SetupIntentData,
  SignupActionResult,
  StartTrialData,
  VerifySignupData,
} from "lib/attende/signup/types"

function toResult<T>(result: AttendeApiResult<T>): SignupActionResult<T> {
  if (result.ok) return { success: true, data: result.data }
  return { success: false, status: result.status, reference: result.reference, message: result.message }
}

/** Public. Never fails: a missing catalog just means prices are shown at checkout. */
export async function getSignupPlansAction(): Promise<SignupPlansResponse> {
  const result = await attendeFetch<unknown>("/attende/signup/plans", { timeoutMs: 6000 })
  return result.ok ? parseSignupPlans(result.data) : { trial: DEFAULT_TRIAL, plans: [] }
}

/** Public. Creates the unverified user and sends the e-mail code. */
export async function createSignupAction(input: CreateSignupInput): Promise<SignupActionResult<CreateSignupData>> {
  return toResult(await attendeFetch<CreateSignupData>("/attende/signup", { method: "POST", body: input }))
}

/** Public. Verifies the code. The caller signs in with the e-mail and password afterwards. */
export async function verifySignupAction(input: { email: string; otp: string }): Promise<SignupActionResult<VerifySignupData>> {
  return toResult(await attendeFetch<VerifySignupData>("/attende/signup/verify", { method: "POST", body: input }))
}

/** Public. Always answers success (the backend never reveals whether the e-mail exists). */
export async function resendSignupAction(input: { email: string }): Promise<SignupActionResult<{ sent: boolean }>> {
  return toResult(await attendeFetch<{ sent: boolean }>("/attende/signup/resend", { method: "POST", body: input }))
}

/** Session. A SetupIntent for the card form. */
export async function createSignupSetupIntentAction(): Promise<SignupActionResult<SetupIntentData>> {
  return toResult(await attendeFetch<SetupIntentData>("/attende/signup/setup-intent", { method: "POST", body: {}, session: true }))
}

/** Session. Creates the workspace and the 7-day trial subscription. Idempotent on the backend. */
export async function startAttendeTrialAction(input: { paymentMethodId: string; planSlug?: string }): Promise<SignupActionResult<StartTrialData>> {
  return toResult(
    await attendeFetch<StartTrialData>("/attende/signup/start-trial", { method: "POST", body: input, session: true, timeoutMs: 60_000 })
  )
}
