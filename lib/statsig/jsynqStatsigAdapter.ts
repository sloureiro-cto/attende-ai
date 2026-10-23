import { createStatsigAdapter } from "@flags-sdk/statsig"

/** Statsig environment used for gate `environments` targeting (staging / production / development). */
export function resolveStatsigEnvironmentTier(): string {
  const explicit = process.env.STATSIG_ENVIRONMENT || process.env.NEXT_PUBLIC_STATSIG_ENVIRONMENT
  if (explicit) return explicit
  if (process.env.VERCEL_TARGET_ENV === "staging") return "staging"
  if (process.env.VERCEL_ENV === "production") return "production"
  if (process.env.VERCEL_ENV === "development") return "development"
  return "development"
}

export const statsigAdapter = createStatsigAdapter({
  statsigServerApiKey: process.env.STATSIG_SERVER_API_KEY as string,
  statsigProjectId: process.env.STATSIG_PROJECT_ID,
  statsigOptions: {
    environment: { tier: resolveStatsigEnvironmentTier() },
  },
})
