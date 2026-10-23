import { agentViewFixture, sdrTemplateFixture } from "../fixtures"
import { activeLines, brokenLines, displayStatus } from "../status"

const valid = { businessName: "Clinic", tone: "friendly", sdr: { qualificationQuestions: ["Budget?"] } }
const on = { channel: "whatsapp" as const, sessionId: "s1", exists: true, connected: true, active: true }

describe("agent display status", () => {
  it("maps the API state to what the user sees", () => {
    expect(displayStatus(agentViewFixture({ status: "draft", lines: [], form: valid }), sdrTemplateFixture)).toBe("no_channels")
    expect(displayStatus(agentViewFixture({ status: "paused", form: valid }), sdrTemplateFixture)).toBe("paused")
    expect(displayStatus(agentViewFixture({ status: "live", lines: [on], form: valid }), sdrTemplateFixture)).toBe("live")
  })

  it("flags answers that no longer pass the model's questions, only when the model is known", () => {
    const agent = agentViewFixture({ status: "paused", form: { businessName: "" } })
    expect(displayStatus(agent, sdrTemplateFixture)).toBe("incomplete")
    expect(displayStatus(agent, null)).toBe("paused")
  })

  it("keeps a dropped channel separate from the state", () => {
    const agent = agentViewFixture({ status: "live", form: valid, lines: [on, { channel: "whatsapp", sessionId: "s2", exists: true, connected: false, active: true }] })
    expect(displayStatus(agent, sdrTemplateFixture)).toBe("live")
    expect(brokenLines(agent)).toHaveLength(1)
    expect(activeLines(agent)).toHaveLength(2)
  })
})
