import jwt from "jsonwebtoken"

/** Claims of the JSYNQ API token. JSYNQ reads `id` (the user) and `workspaceId` (the workspace its routes act on). */
export type ApiTokenClaims = {
  id: unknown
  email?: unknown
  name?: unknown
  image?: unknown
  workspaceId?: unknown
  stripeCustomerId?: unknown
  currency?: unknown
}

/**
 * The bearer token the app sends to JSYNQ: HS256 with `AUTH_SECRET`, the same secret JSYNQ verifies user JWTs with.
 * NextAuth mints it for the session; the Attende server mints the same token to act as a member when no user is
 * signed in (signup, Stripe webhooks, crons). The token is a credential: never log it or send it to a browser.
 */
export function generateApiToken(claims: ApiTokenClaims, secret: string, expiresIn: jwt.SignOptions["expiresIn"] = "1d"): string {
  return jwt.sign(
    {
      id: claims.id,
      email: claims.email,
      name: claims.name,
      image: claims.image,
      workspaceId: claims.workspaceId,
      stripeCustomerId: claims.stripeCustomerId,
      currency: claims.currency,
    },
    secret,
    { expiresIn }
  )
}
