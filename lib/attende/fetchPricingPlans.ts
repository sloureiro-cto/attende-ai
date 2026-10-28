import { unstable_cache } from "next/cache"
import { parseSignupPlans, type SignupPlan } from "./signup/plans"

const REVALIDATE_S = 300

/** The catalog from this app's own Attende API code. */
const localCatalog = unstable_cache(
  async () => {
    const { attendePlanCatalog } = await import("server/local")
    return JSON.parse(JSON.stringify(await attendePlanCatalog())) as unknown
  },
  ["attende-signup-plans"],
  { revalidate: REVALIDATE_S }
)

/**
 * Tiers and prices of `GET /attende/signup/plans` (public), read in process. Never throws: a missing/odd answer just
 * means the page shows "price shown at checkout". Cached for five minutes by Next.
 */
export async function fetchPricingPlans(): Promise<SignupPlan[]> {
  // Read directly (not through serverApi) so this file does not pull the session code in.
  try {
    return parseSignupPlans(await localCatalog()).plans
  } catch {
    return []
  }
}
