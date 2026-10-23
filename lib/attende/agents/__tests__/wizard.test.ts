import { receptionistTemplateFixture as receptionist, sdrTemplateFixture as sdr } from "../fixtures"
import { initialForm, setAt } from "../form"
import { buildFlow, clampStep, firstInvalidStep, issuesForStep, stepForServerError, stepIndexForPath } from "../wizard"

const flow = buildFlow(sdr)

describe("wizard flow", () => {
  it("puts the schema steps first, then lines, documents, review and try", () => {
    expect(flow.map((s) => (s.kind === "schema" ? s.key : s.kind))).toEqual(["business", "qualify", "lines", "documents", "review", "try"])
  })

  it("validates only the fields of the current step", () => {
    const form = initialForm(sdr, "en")
    expect(issuesForStep(flow[0]!, sdr, form)).toEqual([{ path: "businessName", code: "required" }])
    expect(issuesForStep(flow[1]!, sdr, form)).toEqual([{ path: "sdr.qualificationQuestions", code: "required" }])
    expect(issuesForStep(flow[2]!, sdr, form)).toEqual([])
    const ok = setAt(form, "businessName", "Clinic")
    expect(issuesForStep(flow[0]!, sdr, ok)).toEqual([])
  })

  it("finds the first step with a problem", () => {
    const form = setAt(initialForm(sdr, "en"), "businessName", "Clinic")
    expect(firstInvalidStep(flow, sdr, form)).toBe(1)
    expect(firstInvalidStep(flow, sdr, setAt(form, "sdr.qualificationQuestions", ["Budget?"]))).toBe(-1)
  })

  it("puts the receptionist content rule on the step that asks for the questions", () => {
    const rflow = buildFlow(receptionist)
    const form = { businessName: "Clinic" }
    expect(issuesForStep(rflow[0]!, receptionist, form)).toEqual([])
    expect(issuesForStep(rflow[1]!, receptionist, form)).toEqual([{ path: "receptionist.faqs", code: "receptionistContent" }])
    expect(issuesForStep(rflow[1]!, receptionist, { ...form, businessDescription: "We clean teeth" })).toEqual([])
  })

  it("maps a server error to the step it belongs to", () => {
    expect(stepIndexForPath(flow, sdr, "form.sdr.qualificationQuestions.0")).toBe(1)
    expect(stepForServerError(flow, sdr, { code: "ATTENDE_AGENT_VALIDATION", details: { issues: [{ path: "businessName", message: "x" }] } })).toBe(0)
    expect(stepForServerError(flow, sdr, { code: "ATTENDE_AGENT_VALIDATION", details: { issues: [{ path: "unknown", message: "x" }] } })).toBe(0)
    expect(stepForServerError(flow, sdr, { code: "ATTENDE_AGENT_VALIDATION", details: { issues: [{ path: "lines.0", message: "dup" }] } })).toBe(2)
    expect(stepForServerError(flow, sdr, { code: "ATTENDE_AGENT_LINE_NOT_FOUND" })).toBe(2)
    expect(stepForServerError(flow, sdr, { code: "ATTENDE_QUOTA_EXCEEDED" })).toBeNull()
  })

  it("keeps a restored step inside the flow", () => {
    expect(clampStep(flow, 99, false)).toBe(4)
    expect(clampStep(flow, -3, false)).toBe(0)
    expect(clampStep(flow, Number.NaN, false)).toBe(0)
    expect(clampStep(flow, 1, true)).toBe(5)
  })
})
