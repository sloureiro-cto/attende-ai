import { completeStep, loadProgress, type OnboardingStepId, saveProgress } from "../onboarding/onboardingProgress"

/**
 * Ticks a step of the first-run checklist (/onboarding) when the user does it from the agents pages. Read-only use of
 * the onboarding module: progress lives in the browser, so this is all it takes. Never throws.
 */
export function markOnboardingStep(workspaceId: string, id: Extract<OnboardingStepId, "agent" | "docs" | "live">): void {
  if (!workspaceId) return
  try {
    const progress = loadProgress(workspaceId)
    if (progress.steps[id] === "done") return
    saveProgress(workspaceId, completeStep(progress, id, "done"))
  } catch {
    // The checklist is a convenience; never block the agent flow on it.
  }
}
