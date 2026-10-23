import "server-only"
import { ObjectId } from "mongodb"
import { db } from "lib/db"
import { determineCurrency, getCustomerCurrency, getUserCountry, type SessionWithUser } from "utils/currency"

/**
 * Get default currency for onboarding flow (plan, review, payment).
 * Priority: 1) Stripe customer currency > 2) Geo country
 * Server-side only - uses Stripe SDK and DB. Do NOT import in client components.
 */
export async function getDefaultCurrencyForOnboarding(
  session: SessionWithUser,
  headers: Headers
): Promise<"BRL" | "USD"> {
  const userCountry = getUserCountry(headers)
  let customerCurrency: "brl" | "usd" | null = null

  if (session?.user?.id) {
    const user = await db.collection("users").findOne({ _id: new ObjectId(session.user.id) })
    const stripeCustomerId = user?.stripeCustomerId || session.user.stripeCustomerId
    if (stripeCustomerId) {
      customerCurrency = await getCustomerCurrency(stripeCustomerId)
    }
  }

  return determineCurrency(customerCurrency, userCountry).toUpperCase() as "BRL" | "USD"
}
