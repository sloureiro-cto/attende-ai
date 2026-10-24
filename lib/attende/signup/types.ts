/** Shapes of `/api/attende/signup` on the Attende backend (`ATTENDE_API_URL`; README of attend-ai-backend). */
export type SignupActionError = { success: false; status: number; reference?: string; message?: string }
export type SignupActionResult<T> = { success: true; data: T } | SignupActionError

export type CreateSignupInput = {
  name: string
  email: string
  password: string
  businessName: string
  locale: "pt" | "en" | "es"
  planSlug?: string
}
export type CreateSignupData = { email: string; nextStep: "verify_email" }

/** JSYNQ login summary of the new account (the backend's `accessToken` is dropped on the server), plus the signup. */
export type VerifySignupData = {
  id: string
  email: string
  name: string
  isVerified: boolean
  twoFactorEnabled: boolean
  workspaceId: string | null
  signup?: { businessName: string; planSlug: string | null; state: string }
}

export type SetupIntentData = { clientSecret: string }

export type StartTrialData = {
  workspaceId: string
  subscriptionStatus: string
  trialEndsAt: string
  plan: { slug: string; name: string }
  alreadyStarted: boolean
  entitlements?: { tier: string; status: string; trialOutboundCap?: number; trialOutboundUsed?: number }
}
