import { parseSignupPlans, type SignupPlan } from "./signup/plans"

/**
 * Tiers and prices from `GET /attende/signup/plans` (public). Never throws: a missing/slow/odd endpoint just means
 * the page shows "price shown at checkout". Cached for five minutes by Next.
 */
export async function fetchPricingPlans(): Promise<SignupPlan[]> {
  const base = process.env.BACKEND_URL
  if (!base) return []
  try {
    const res = await fetch(`${base}/attende/signup/plans`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) })
    if (!res.ok) return []
    return parseSignupPlans(await res.json()).plans
  } catch {
    return []
  }
}
