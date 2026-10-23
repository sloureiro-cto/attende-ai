import Stripe from "stripe"
import { STRIPE_SECRET_KEY } from "constants/stripeKey"

const initializeStripe = () => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is not defined. Please set STRIPE_SECRET_KEY in your environment variables.")
  }
  try {
    return new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20" as any,
      typescript: true,
    })
  } catch (error) {
    console.error("Failed to initialize Stripe:", error)
    throw error
  }
}

export const stripe = initializeStripe()
