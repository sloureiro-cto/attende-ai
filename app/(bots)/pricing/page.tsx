import { Metadata } from "next"
import { PricingView } from "components/bots-app/pricing/PricingView"
import { fetchPricingPlans } from "lib/attende/fetchPricingPlans"

export const metadata: Metadata = { title: "Pricing" }

/** Public. Prices come from the plans endpoint; without them the page still renders ("price shown at checkout"). */
export default async function PricingPage() {
  const plans = await fetchPricingPlans()
  return <PricingView plans={plans} />
}
