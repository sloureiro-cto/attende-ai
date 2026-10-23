/**
 * @deprecated Browser-only progress of the old setup wizard. The home and /setup now read every step from the API
 * (lib/attende/activation.ts) and nothing reads this anymore. Kept only because components/bots-app/agents/onboardingSync.ts
 * still writes it; remove both together.
 */
export const ONBOARDING_STEPS = ["line", "agent", "docs", "live"] as const
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]
export type StepStatus = "todo" | "done" | "skipped"

export type OnboardingProgress = {
  version: 1
  steps: Record<OnboardingStepId, StepStatus>
  current: OnboardingStepId
  finished: boolean
}

export const initialProgress = (): OnboardingProgress => ({
  version: 1,
  steps: { line: "todo", agent: "todo", docs: "todo", live: "todo" },
  current: "line",
  finished: false,
})

const isStatus = (value: unknown): value is StepStatus => value === "todo" || value === "done" || value === "skipped"
const isStep = (value: unknown): value is OnboardingStepId => (ONBOARDING_STEPS as readonly unknown[]).includes(value)

/** Tolerant parse of what is stored in the browser: anything odd falls back to a fresh wizard instead of breaking the page. */
export function parseProgress(raw: string | null | undefined): OnboardingProgress {
  if (!raw) return initialProgress()
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress> | null
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) return initialProgress()
    const base = initialProgress()
    for (const id of ONBOARDING_STEPS) {
      const status = (parsed.steps as Record<string, unknown> | undefined)?.[id]
      if (isStatus(status)) base.steps[id] = status
    }
    if (isStep(parsed.current)) base.current = parsed.current
    base.finished = parsed.finished === true
    return base
  } catch {
    return initialProgress()
  }
}

export const progressStorageKey = (workspaceId: string): string => `attende:onboarding:${workspaceId}`

/** Sets one step and moves to the next one that is still open (or stays on the last). */
export function completeStep(progress: OnboardingProgress, id: OnboardingStepId, status: Exclude<StepStatus, "todo">): OnboardingProgress {
  const steps = { ...progress.steps, [id]: status }
  const index = ONBOARDING_STEPS.indexOf(id)
  const nextOpen = ONBOARDING_STEPS.slice(index + 1).find((step) => steps[step] === "todo")
  return { ...progress, steps, current: nextOpen ?? id }
}

export const goToStep = (progress: OnboardingProgress, id: OnboardingStepId): OnboardingProgress => ({ ...progress, current: id })

export const finishOnboarding = (progress: OnboardingProgress): OnboardingProgress => ({ ...progress, finished: true })
export const restartOnboarding = (progress: OnboardingProgress): OnboardingProgress => ({ ...progress, finished: false, current: "line" })

/** Steps the person actually did (skipped ones do not count as done). */
export const doneCount = (progress: OnboardingProgress): number => ONBOARDING_STEPS.filter((id) => progress.steps[id] === "done").length

export function loadProgress(workspaceId: string, storage: Pick<Storage, "getItem"> | null = safeStorage()): OnboardingProgress {
  try {
    return parseProgress(storage?.getItem(progressStorageKey(workspaceId)))
  } catch {
    return initialProgress()
  }
}

export function saveProgress(workspaceId: string, progress: OnboardingProgress, storage: Pick<Storage, "setItem"> | null = safeStorage()): void {
  try {
    storage?.setItem(progressStorageKey(workspaceId), JSON.stringify(progress))
  } catch {
    // Private mode / quota: the wizard keeps working, it just will not resume.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}
