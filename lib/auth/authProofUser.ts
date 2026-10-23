export type AuthProofUser = {
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
