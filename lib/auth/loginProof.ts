import type { AuthProofUser } from "lib/auth/authProofUser"

export const LOGIN_2FA_PROOF_PURPOSE = "login_2fa_complete" as const

export type Login2faProofPayload = {
  purpose: typeof LOGIN_2FA_PROOF_PURPOSE
  user: AuthProofUser
}
