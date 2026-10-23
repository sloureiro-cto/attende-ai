export type AuthUserLoginResponse = {
  id: string
  email: string
  name: string
  image: string | null
  onboarded: boolean
  isVerified?: boolean
  twoFactorEnabled?: boolean
  workspaceId: string | null
  stripeCustomerId?: string
}

export type LoginChallengeResponse = {
  requiresOtp: true
  loginChallengeId: string
  expiresIn: number
}

export type LoginStep1Response = AuthUserLoginResponse | LoginChallengeResponse

export function isLoginChallenge(res: LoginStep1Response): res is LoginChallengeResponse {
  return "requiresOtp" in res && res.requiresOtp === true
}
