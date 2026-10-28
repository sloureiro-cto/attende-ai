import { unstable_cache } from "next/cache"
import { parseSignupPlans, type SignupPlan } from "./signup/plans"

const REVALIDATE_S = 300

/** The catalog from this app's own Attende API code, cached like the HTTP read below. */
const localCatalog = unstable_cache(
  async () => {
    const { attendePlanCatalog } = await import("server/local")
    return JSON.parse(JSON.stringify(await attendePlanCatalog())) as unknown
  },
  ["attende-signup-plans"],
  { revalidate: REVALIDATE_S }
)

/**
 * Tiers and prices of `GET /attende/signup/plans` (public). Never throws: a missing/slow/odd answer just means the page
 * shows "price shown at checkout". Cached for five minutes by Next. Read in process, or from `ATTENDE_API_URL` when set.
 */
export async function fetchPricingPlans(): Promise<SignupPlan[]> {
  // Read directly (not through serverApi) so this file does not pull the session code in.
  const base = process.env.ATTENDE_API_URL?.trim().replace(/\/+$/, "")
  try {
    if (!base) return parseSignupPlans(await localCatalog()).plans
    const res = await fetch(`${base}/attende/signup/plans`, { next: { revalidate: REVALIDATE_S }, signal: AbortSignal.timeout(4000) })
    if (!res.ok) return []
    return parseSignupPlans(await res.json()).plans
  } catch {
    return []
  }
}
