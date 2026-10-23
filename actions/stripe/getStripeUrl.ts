"use server"

import { ObjectId } from "mongodb"
import { IUser } from "app/_types/User"
import { auth } from "auth"
import { db } from "lib/db"
import { stripe } from "lib/stripe"

const users = db.collection("users")

interface ReturnType {
  data?: string
  error?: string
}

type StripePortalFlow = { type: "payment_method_update" } | { type: "subscription_update"; subscriptionId: string }

const getStripeUrlAction = async (callbackUrl: string, flow?: StripePortalFlow): Promise<ReturnType> => {
  const session = await auth()

  if (!session) {
    return {
      error: "Unauthorized",
    }
  }

  let url = ""
  try {
    const user = (await users.findOne({
      _id: new ObjectId(session.user.id),
    })) as IUser | null

    if (!user) {
      return {
        error: "User not found",
      }
    }

    if (!user.stripeCustomerId) {
      return {
        error: "User does not have a Stripe customer ID",
      }
    }

    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: callbackUrl,
      ...(flow?.type === "payment_method_update"
        ? { flow_data: { type: "payment_method_update" as const } }
        : flow?.type === "subscription_update"
        ? {
            flow_data: {
              type: "subscription_update" as const,
              subscription_update: { subscription: flow.subscriptionId },
            },
          }
        : {}),
    })

    url = stripeSession.url
    return {
      data: url,
    }
  } catch (error) {
    return {
      error: "Something went wrong!",
    }
  }
}

export { getStripeUrlAction }
