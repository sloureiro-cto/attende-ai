import type { AuthProofUser } from "lib/auth/authProofUser"

export const SIGNUP_VERIFY_PROOF_PURPOSE = "signup_verify_complete" as const

export type SignupVerifyProofPayload = {
  purpose: typeof SIGNUP_VERIFY_PROOF_PURPOSE
  user: AuthProofUser
}
