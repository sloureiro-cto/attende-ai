import { createBotNode, nodeIssues, sanitizeNodePreset } from "../botGraph"
import type { AdvancedAutomationNode } from "../types"

const AGENT = "65f0c0ffee0000000000abcd"

describe("handoff step to an AI agent", () => {
  const base = createBotNode("handoff", 0, 0) as Extract<AdvancedAutomationNode, { kind: "handoff" }>

  it("needs the AI agent that takes the conversation", () => {
    expect(nodeIssues({ ...base, to: "ai" })).toEqual(["handoff_target_missing"])
    expect(nodeIssues({ ...base, to: "ai", agentId: "not-an-id" })).toEqual(["handoff_target_missing"])
    expect(nodeIssues({ ...base, to: "ai", agentId: AGENT })).toEqual([])
  })

  it("ignores the people fields when an AI agent takes over", () => {
    expect(nodeIssues({ ...base, to: "ai", agentId: AGENT, assignMode: "specific_user" })).toEqual([])
  })

  it("keeps the person rules for a handoff to the team", () => {
    expect(nodeIssues({ ...base, assignMode: "specific_user" })).toEqual(["handoff_target_missing"])
    expect(nodeIssues(base)).toEqual([])
  })

  it("lets the palette preset start a handoff to an AI agent", () => {
    expect(sanitizeNodePreset("handoff", { to: "ai", agentId: AGENT, id: "x" })).toEqual({ to: "ai", agentId: AGENT })
  })
})
