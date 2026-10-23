import { completeStep, doneCount, finishOnboarding, goToStep, initialProgress, loadProgress, parseProgress, progressStorageKey, restartOnboarding, saveProgress } from "./onboardingProgress"

describe("onboardingProgress", () => {
  it("starts on the first step with everything open", () => {
    expect(initialProgress()).toEqual({ version: 1, steps: { line: "todo", agent: "todo", docs: "todo", live: "todo" }, current: "line", finished: false })
  })

  it("moves to the next open step when one is completed or skipped", () => {
    const afterLine = completeStep(initialProgress(), "line", "done")
    expect(afterLine.current).toBe("agent")
    const afterSkip = completeStep(afterLine, "agent", "skipped")
    expect(afterSkip.current).toBe("docs")
    expect(doneCount(afterSkip)).toBe(1)
  })

  it("skips over steps that are already settled and stays on the last step", () => {
    let progress = completeStep(initialProgress(), "docs", "done")
    progress = completeStep(progress, "line", "done")
    expect(progress.current).toBe("agent")
    expect(completeStep(progress, "live", "done").current).toBe("live")
  })

  it("lets the user jump back to a step, finish and restart", () => {
    const progress = completeStep(initialProgress(), "line", "done")
    expect(goToStep(progress, "line").current).toBe("line")
    expect(finishOnboarding(progress).finished).toBe(true)
    expect(restartOnboarding(finishOnboarding(progress))).toMatchObject({ finished: false, current: "line" })
  })

  it("parses stored progress and ignores anything malformed", () => {
    const stored = JSON.stringify(completeStep(initialProgress(), "line", "done"))
    expect(parseProgress(stored).steps.line).toBe("done")
    expect(parseProgress("not json")).toEqual(initialProgress())
    expect(parseProgress(JSON.stringify({ version: 9 }))).toEqual(initialProgress())
    expect(parseProgress(JSON.stringify({ version: 1, steps: { line: "weird", agent: "done" }, current: "nope" }))).toMatchObject({
      steps: { line: "todo", agent: "done" },
      current: "line",
    })
    expect(parseProgress(null)).toEqual(initialProgress())
  })

  it("keeps progress per workspace and survives a storage that throws", () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    saveProgress("w1", completeStep(initialProgress(), "line", "done"), storage)
    expect(store.has(progressStorageKey("w1"))).toBe(true)
    expect(loadProgress("w1", storage).steps.line).toBe("done")
    expect(loadProgress("w2", storage)).toEqual(initialProgress())

    const broken = { getItem: () => { throw new Error("denied") }, setItem: () => { throw new Error("full") } }
    expect(loadProgress("w1", broken)).toEqual(initialProgress())
    expect(() => saveProgress("w1", initialProgress(), broken)).not.toThrow()
  })
})
