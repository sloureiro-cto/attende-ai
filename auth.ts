import { MongoDBAdapter } from "@auth/mongodb-adapter"
import NextAuth from "next-auth"
import authConfig from "auth.config"
import client from "./lib/db"
import "next-auth/jwt"

declare module "next-auth" {
  export interface User {
    onboarded: boolean
    workspaceId?: string
    aboutMe?: string
    pronouns?: string
    genericRole?: string
    isVerified?: boolean
    stripeCustomerId?: string
    homePageTourCompleted?: boolean
  }

  export interface Session {
    user: {
      id: string
      email: string
      name: string
      image: string
      onboarded: boolean
      isVerified: boolean
      workspaceId?: string
      stripeCustomerId?: string
      homePageTourCompleted?: boolean
      currency?: "BRL" | "USD"
    }
    apiToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    image: string
    onboarded: boolean
    workspaceId?: string
    aboutMe?: string
    pronouns?: string
    isVerified: boolean
    genericRole?: string
    stripeCustomerId?: string | null
    homePageTourCompleted?: boolean
    currency?: "BRL" | "USD"
  }
}

if (!process.env.AUTH_SECRET) {
  throw Error("missing AUTH_SECRET environment variable")
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(client),
  secret: process.env.AUTH_SECRET,
  ...authConfig,
})
