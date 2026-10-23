import { sdrTemplateFixture } from "../fixtures"
import { cleanForm } from "../form"
import { applySection, handoffTargetOf, sectionConflict, sectionFields, sectionOf, summarizeSection } from "../sections"

describe("setup sections", () => {
  it("groups every template answer in one section", () => {
    expect(sectionOf("businessName")).toBe("business")
    expect(sectionOf("sdr.qualificationQuestions")).toBe("goal")
    expect(sectionOf("handoff.target")).toBe("handoff")
    expect(sectionOf("handoff.keywords")).toBe("advanced")
    expect(sectionFields(sdrTemplateFixture, "identity").map((f) => f.path)).toEqual(["assistantName", "language", "tone", "disclosure"])
  })

  it("writes only the section's answers over the latest form", () => {
    const latest = { businessName: "Old", tone: "formal", handoff: { triggers: ["a"], keywords: ["k"] } }
    const edited = { businessName: "New", tone: "friendly", handoff: { triggers: ["b"], keywords: ["changed"] } }
    expect(applySection(latest, edited, ["businessName", "handoff.triggers"])).toEqual({ businessName: "New", tone: "formal", handoff: { triggers: ["b"], keywords: ["k"] } })
  })

  it("is a conflict only when another save changed this section", () => {
    const base = { form: { businessName: "A", tone: "friendly" }, updatedAt: "1" }
    expect(sectionConflict(base, { form: { businessName: "A", tone: "formal" }, updatedAt: "2" }, ["businessName"])).toBe(false)
    expect(sectionConflict(base, { form: { businessName: "B", tone: "friendly" }, updatedAt: "2" }, ["businessName"])).toBe(true)
    expect(sectionConflict(base, base, ["businessName"])).toBe(false)
  })

  it("summarizes real values", () => {
    expect(summarizeSection("business", "sdr", { businessName: "Clinic", offerings: [{ name: "A" }, { name: "" }] })).toMatchObject({ businessName: "Clinic", offerings: 1, hasDescription: false })
    expect(summarizeSection("advanced", "sdr", { handoff: { keywords: ["x"] } })).toMatchObject({ keywords: ["x"], maxReplies: null })
  })

  it("reads the handoff target and keeps the legacy string out of the request", () => {
    expect(handoffTargetOf({ handoff: { target: { kind: "user", userId: "u1" } } })).toEqual({ kind: "user", userId: "u1" })
    expect(handoffTargetOf({ handoff: { target: "team" } })).toEqual({ kind: "team" })
    expect((cleanForm({ handoff: { target: "user" } }).handoff as Record<string, unknown>).target).toBeUndefined()
    expect((cleanForm({ handoff: { target: { kind: "user", userId: "u1" } } }).handoff as Record<string, unknown>).target).toEqual({ kind: "user", userId: "u1" })
  })
})
