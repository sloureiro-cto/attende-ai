/** Shapes of `/api/attende/signup` on the Attende API (`server/modules/signup`). */
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

/** JSYNQ login summary of the newly verified account (JSYNQ's `PATCH /users/verify-otp`), plus the signup. */
export type VerifySignupData = {
  id: string
  email: string
  name: string
  image?: string | null
  onboarded?: boolean
  isVerified: boolean
  twoFactorEnabled: boolean
  workspaceId: string | null
  stripeCustomerId?: string
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
