/** Shapes of `/api/attende/signup` (docs/attende/signup-and-trial.md in the backend repo). */
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

export type VerifySignupData = {
  id: string
  email: string
  name: string
  isVerified: boolean
  twoFactorEnabled: boolean
  workspaceId: string | null
  signup?: { businessName: string; planSlug: string; state: string }
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
