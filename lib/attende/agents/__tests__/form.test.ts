import { cleanForm } from "../form"

describe("handoff target", () => {
  it("drops the plain string the old select stored, which the API refuses", () => {
    const form = cleanForm({ handoff: { keywords: ["atendente"], target: "team" } } as never)
    expect((form.handoff as Record<string, unknown>).target).toBeUndefined()
    expect((form.handoff as Record<string, unknown>).keywords).toEqual(["atendente"])
  })
  it("keeps a target object already saved on an agent", () => {
    const form = cleanForm({ handoff: { target: { kind: "user", userId: "a".repeat(24) } } } as never)
    expect((form.handoff as Record<string, unknown>).target).toEqual({ kind: "user", userId: "a".repeat(24) })
  })
})
