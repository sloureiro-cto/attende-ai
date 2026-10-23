import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import { headers } from "next/headers"
import type { NextAuthConfig, User } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { googleOAuthRedirectProxyUrl } from "lib/auth/authRedirectProxy"
import { botsAuthCookies } from "lib/auth/botsAuthCookies"
import { type Login2faProofPayload, LOGIN_2FA_PROOF_PURPOSE } from "lib/auth/loginProof"
import { SIGNUP_VERIFY_PROOF_PURPOSE, type SignupVerifyProofPayload } from "lib/auth/signupProof"
import { db } from "lib/db"
import type { AuthUserLoginResponse, LoginStep1Response } from "types/auth/login"
import { isLoginChallenge } from "types/auth/login"
import { getDefaultCurrencyForOnboarding } from "utils/getDefaultCurrencyForOnboarding"
import { loginSchema } from "validations/login"

export interface UserResponse extends AuthUserLoginResponse {
  image: string
  workspaceId: string
}

const secret = process.env.AUTH_SECRET

const users = db.collection("users")
const accounts = db.collection("accounts")
const workspaces = db.collection("workspaces")

/** Buffer time before expiry to refresh token (30 minutes in milliseconds) */
const TOKEN_REFRESH_BUFFER_MS = 30 * 60 * 1000

function generateApiToken(token: Record<string, unknown>): string {
  return jwt.sign(
    {
      id: token.id,
      email: token.email,
      name: token.name,
      image: token.image,
      workspaceId: token.workspaceId,
      stripeCustomerId: token.stripeCustomerId,
      currency: token.currency,
    },
    secret!,
    { expiresIn: "1d" }
  )
}

function mapUserResponseToUser(body: UserResponse): User {
  return {
    id: body.id,
    name: body.name,
    email: body.email,
    image: body.image ?? "",
    onboarded: body.onboarded,
    workspaceId: body.workspaceId ?? "",
    isVerified: body.isVerified ?? false,
    stripeCustomerId: body.stripeCustomerId,
  } satisfies User
}

const AUTH_FAILED_MESSAGE = "Authentication failed."
const redirectProxyUrl = googleOAuthRedirectProxyUrl()

function authorizeFromProof(proof: string, expectedPurpose: string, requireVerified: boolean): User {
  try {
    const decoded = jwt.verify(proof, secret!) as Login2faProofPayload | SignupVerifyProofPayload
    if (decoded.purpose !== expectedPurpose) {
      throw new Error(AUTH_FAILED_MESSAGE)
    }
    if (requireVerified && decoded.user.isVerified !== true) {
      throw new Error(AUTH_FAILED_MESSAGE)
    }
    return mapUserResponseToUser({
      ...decoded.user,
      image: decoded.user.image ?? "",
      workspaceId: decoded.user.workspaceId ?? "",
    })
  } catch {
    throw new Error(AUTH_FAILED_MESSAGE)
  }
}

function shouldRefreshToken(token: Record<string, unknown>): boolean {
  if (!token.apiToken || typeof token.apiToken !== "string") return true

  try {
    const decoded = jwt.decode(token.apiToken) as { exp?: number } | null
    if (!decoded?.exp) return true

    const nowMs = Date.now()
    const expiresAtMs = decoded.exp * 1000
    return expiresAtMs - nowMs < TOKEN_REFRESH_BUFFER_MS
  } catch {
    return true
  }
}

export default {
  trustHost: true,
  ...(redirectProxyUrl ? { redirectProxyUrl } : {}),
  session: { strategy: "jwt" },
  // Own sign-in route and own cookie names (see lib/auth/botsAuthCookies.ts).
  pages: { signIn: "/login", error: "/login" },
  cookies: botsAuthCookies(process.env.NODE_ENV !== "development"),
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        loginProof: {},
        signupProof: {},
      },
      async authorize(credentials) {
        const loginProof = credentials?.loginProof as string | undefined
        const signupProof = credentials?.signupProof as string | undefined

        if (loginProof) {
          return authorizeFromProof(loginProof, LOGIN_2FA_PROOF_PURPOSE, false)
        }

        if (signupProof) {
          return authorizeFromProof(signupProof, SIGNUP_VERIFY_PROOF_PURPOSE, true)
        }

        const validatedFields = loginSchema.safeParse(credentials)
        if (validatedFields.error || !validatedFields.data) {
          throw new Error(AUTH_FAILED_MESSAGE)
        }

        const { email, password } = validatedFields.data
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth`, {
          headers: { "Content-Type": "application/json" },
          method: "POST",
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          throw new Error(AUTH_FAILED_MESSAGE)
        }

        const body = (await response.json()) as LoginStep1Response
        if (isLoginChallenge(body)) {
          throw new Error("REQUIRES_OTP")
        }

        return mapUserResponseToUser(body as UserResponse)
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string
        token.email = user.email as string
        token.name = user.name as string
        token.onboarded = user.onboarded
        token.image = user.image as string
        token.stripeCustomerId = user.stripeCustomerId ?? null

        if (!user.workspaceId) {
          // Check for workspaces where user is owner OR member
          const userWorkspace = await workspaces
            .findOne({
              $or: [{ members: { $in: [new ObjectId(user.id)] } }, { owner: new ObjectId(user.id) }],
              deleted: { $ne: true },
            })
            .then((workspace) => workspace?._id.toString())
          token.workspaceId = userWorkspace
        } else {
          token.workspaceId = user.workspaceId
        }

        token.isVerified = user.isVerified ?? false
        token.homePageTourCompleted = user.homePageTourCompleted ?? false

        // Set currency at login (Stripe > Geo) - stored in session for reuse
        const headersList = await headers()
        token.currency = await getDefaultCurrencyForOnboarding(
          { user: { id: user.id, stripeCustomerId: user.stripeCustomerId } },
          headersList
        )

        // Pre-generate initial apiToken on first login
        token.apiToken = generateApiToken(token)
      }

      if (trigger === "update" && session) {
        if (session.onboarded) token.onboarded = session.onboarded
        if (session.workspaceId) token.workspaceId = session.workspaceId
        if (session.stripeCustomerId) token.stripeCustomerId = session.stripeCustomerId
        if (session.name) token.name = session.name
        if (session.email) token.email = session.email
        // `""` removes the photo, so only a missing field means "unchanged".
        if (session.image !== undefined) token.image = session.image
        if (session.isVerified) token.isVerified = session.isVerified
        if (session.homePageTourCompleted !== undefined) {
          token.homePageTourCompleted = session.homePageTourCompleted
        }
        if (session.currency) token.currency = session.currency
        if (session.user?.currency) token.currency = session.user.currency

        // apiToken embeds workspaceId and other claims; must refresh after session.update()
        token.apiToken = generateApiToken(token)
      }

      return token
    },

    async session({ session, token }) {
      // Check if current token needs refresh (expires within 30 minutes)
      let apiToken = token.apiToken as string | undefined
      if (!apiToken || shouldRefreshToken(token)) {
        apiToken = generateApiToken(token)
        // Update the token in the JWT callback for the next session poll
        token.apiToken = apiToken
      }

      session.user.id = token.id as string
      session.user.onboarded = token.onboarded
      session.user.workspaceId = token.workspaceId
      session.user.image = token.image as string
      session.user.isVerified = token.isVerified as boolean
      session.user.stripeCustomerId = token.stripeCustomerId as string
      session.user.homePageTourCompleted = token.homePageTourCompleted as boolean
      session.user.currency = token.currency as "BRL" | "USD" | undefined
      session.apiToken = apiToken

      return session
    },

    async signIn({ user, account }) {
      const existingUser = await users.findOne({ email: user.email })

      if (account?.provider === "google") {
        if (existingUser) {
          const existingAccount = await accounts.findOne({
            userId: existingUser._id,
            provider: "google",
          })

          if (!existingAccount) {
            await accounts.insertOne({
              userId: existingUser._id,
              access_token: account.access_token,
              id_token: account.id_token,
              expires_at: account.expires_at,
              scope: account.scope,
              token_type: account.token_type,
              providerAccountId: account.providerAccountId,
              provider: "google",
              type: "oidc",
            })
          }
        } else {
          const createdUser = await users.insertOne({
            name: user.name!,
            email: user.email!,
            isVerified: true,
            onboarded: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          await accounts.insertOne({
            userId: createdUser.insertedId,
            access_token: account.access_token,
            id_token: account.id_token,
            expires_at: account.expires_at,
            scope: account.scope,
            token_type: account.token_type,
            providerAccountId: account.providerAccountId,
            provider: "google",
            type: "oidc",
          })
        }

        if (!existingUser) {
          await fetch(`${process.env.BACKEND_URL}/invites/accepted/resolve`, {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({ email: user.email! }),
          })
        }
      }

      return true
    },
  },
} satisfies NextAuthConfig
