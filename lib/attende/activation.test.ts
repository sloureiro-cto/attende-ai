import { agentViewFixture as agent } from "lib/attende/agents/fixtures"
import type { BotsLine } from "lib/bots-app/lines"
import { activationUnreadable, agentStage, computeActivation, computeDailySummary, pickFocusAgent } from "./activation"

const connected = [{ status: "connected" as const }]
const doc = { documentId: "d1", name: "prices.pdf", mimeType: "application/pdf", sizeBytes: 10, uploadedAt: "2026-10-20T10:00:00Z" }
const live = (over = {}) =>
  agent({ status: "live", lines: [{ channel: "whatsapp", sessionId: "s1", exists: true, connected: true, active: true }], ...over })

/** Only the business name: not enough for the "business information" step. */
const nameOnly = { businessName: "Clinic" }

const states = (a: ReturnType<typeof computeActivation>) => Object.fromEntries(a.steps.map((s) => [s.id, `${s.state}:${s.code}`]))

describe("computeActivation", () => {
  it("brand-new workspace: everything to do, the channel is the next step, nothing unknown", () => {
    const a = computeActivation({ lines: [], failedChannels: [], agents: [] })
    expect(states(a)).toEqual({
      channel: "todo:channel_none",
      agent: "todo:agent_none",
      knowledge: "todo:knowledge_needs_agent",
      test: "todo:test_needs_agent",
      activate: "todo:activate_needs_agent",
    })
    expect(a.done).toBe(0)
    expect(a.total).toBe(5)
    expect(a.next?.id).toBe("channel")
    expect(a.next?.href).toBe("/lines")
    expect(a.activated).toBe(false)
    expect(a.partial).toBe(false)
  })

  it("says the channels are disconnected when some exist but none is connected", () => {
    expect(computeActivation({ lines: [{ status: "disconnected" }], failedChannels: [], agents: [] }).steps[0]!.code).toBe("channel_offline")
  })

  it("never shows unreadable data as done or to do", () => {
    const a = computeActivation({ lines: [], failedChannels: ["whatsapp", "instagram", "sms"], agents: null })
    expect(a.steps.every((s) => s.state === "unknown")).toBe(true)
    expect(a.done).toBe(0)
    expect(a.partial).toBe(true)
    expect(activationUnreadable({ failedChannels: ["whatsapp", "instagram", "sms"], agents: null })).toBe(true)
    expect(activationUnreadable({ failedChannels: ["whatsapp"], agents: null })).toBe(false)
  })

  it("a connected channel counts even when another channel kind failed to load; no connected one is then unknown", () => {
    expect(computeActivation({ lines: connected, failedChannels: ["sms"], agents: [] }).steps[0]!.state).toBe("done")
    expect(computeActivation({ lines: [], failedChannels: ["sms"], agents: [] }).steps[0]!.state).toBe("unknown")
  })

  it("agent created without a channel: test and activation ask to choose the agent's channel", () => {
    const a = computeActivation({ lines: connected, failedChannels: [], agents: [agent({ status: "draft", lines: [], form: nameOnly })] })
    expect(states(a)).toMatchObject({ agent: "done:agent_created", knowledge: "todo:knowledge_none", test: "todo:test_needs_channel", activate: "todo:activate_needs_channel" })
    expect(a.steps[3]!.href).toBe("/ai-agents/a1?tab=setup")
    expect(a.next?.id).toBe("knowledge")
    expect(a.next?.href).toBe("/ai-agents/a1?tab=knowledge")
  })

  it("a real business description counts as business information; the name alone does not", () => {
    expect(states(computeActivation({ lines: connected, failedChannels: [], agents: [agent({ lines: [] })] })).knowledge).toBe("done:knowledge_description")
    expect(states(computeActivation({ lines: connected, failedChannels: [], agents: [agent({ lines: [], form: nameOnly })] })).knowledge).toBe("todo:knowledge_none")
  })

  it("sends to channels when the agent has no channel and none is connected", () => {
    const a = computeActivation({ lines: [], failedChannels: [], agents: [agent({ status: "draft", lines: [] })] })
    expect(a.steps[4]!.href).toBe("/lines")
  })

  it("agent on a channel, paused: test from the agent page, then turn it on", () => {
    const a = computeActivation({ lines: connected, failedChannels: [], agents: [agent({ documents: [doc] })] })
    expect(states(a)).toMatchObject({ knowledge: "done:knowledge_added", test: "todo:test_not_run", activate: "todo:activate_paused" })
    expect(a.next?.id).toBe("test")
    expect(a.next?.href).toBe("/ai-agents/a1")
  })

  it("reads the stored test result, and a disconnected channel blocks test and activation", () => {
    const tested = agent({ lastTestPassedAt: "2026-10-21T12:00:00Z" })
    expect(computeActivation({ lines: connected, failedChannels: [], agents: [tested] }).steps[3]!.code).toBe("test_passed")
    const broken = agent({ lines: [{ channel: "whatsapp", sessionId: "s1", exists: true, connected: false, active: false }] })
    const a = computeActivation({ lines: connected, failedChannels: [], agents: [broken] })
    expect(states(a)).toMatchObject({ test: "todo:test_channel_offline", activate: "todo:activate_channel_offline" })
  })

  it("live with a connected, active channel is activated; live with a dropped channel is not", () => {
    const a = computeActivation({ lines: connected, failedChannels: [], agents: [live({ documents: [doc], lastTestPassedAt: "2026-10-21T12:00:00Z" })] })
    expect(a.activated).toBe(true)
    expect(a.done).toBe(5)
    expect(a.next).toBeNull()
    const dropped = live({ lines: [{ channel: "whatsapp", sessionId: "s1", exists: false, connected: false, active: true }] })
    const b = computeActivation({ lines: connected, failedChannels: [], agents: [dropped] })
    expect(b.activated).toBe(false)
    expect(b.steps[4]!.code).toBe("activate_channel_offline")
  })

  it("documents of any agent count, since knowledge is workspace-wide", () => {
    const a = computeActivation({ lines: connected, failedChannels: [], agents: [agent({ id: "a2" }), agent({ id: "a3", documents: [doc], lines: [] })] })
    expect(a.steps[2]!.state).toBe("done")
    expect(a.steps[2]!.href).toBe("/ai-agents/a3?tab=knowledge")
  })

  it("agents that could not be read are unknown, channels still count", () => {
    const a = computeActivation({ lines: connected, failedChannels: [], agents: null })
    expect(a.steps.map((s) => s.state)).toEqual(["done", "unknown", "unknown", "unknown", "unknown"])
    expect(a.done).toBe(1)
    expect(a.next?.id).toBe("agent")
  })
})

describe("agents", () => {
  it("tells created, on a channel and answering apart", () => {
    expect(agentStage(agent({ status: "draft", lines: [] }))).toBe("created")
    expect(agentStage(agent())).toBe("on_channel")
    expect(agentStage(live())).toBe("active")
    expect(agentStage(live({ lines: [{ channel: "whatsapp", sessionId: "s1", exists: true, connected: true, active: false }] }))).toBe("on_channel")
  })

  it("focuses on the most advanced agent, newest first on a tie", () => {
    expect(pickFocusAgent([agent({ id: "new", lines: [] }), live({ id: "old" })])?.id).toBe("old")
    expect(pickFocusAgent([agent({ id: "new" }), agent({ id: "old" })])?.id).toBe("new")
    expect(pickFocusAgent([])).toBeNull()
  })
})

describe("computeDailySummary", () => {
  const line = (id: string, status: BotsLine["status"]) => ({ id, status, channel: "whatsapp", label: id }) as BotsLine

  it("lists channels needing attention, answering agents and inbox counters", () => {
    const d = computeDailySummary({
      lines: [line("a", "connected"), line("b", "disconnected"), line("c", "disabled")],
      failedChannels: [],
      agents: [live({ id: "on" }), live({ id: "off", lines: [{ channel: "whatsapp", sessionId: "s", exists: true, connected: false, active: true }] }), agent()],
      inbox: { needsReply: 4, unread: 2 },
    })
    expect(d.channelsNeedingAttention.map((l) => l.id)).toEqual(["b"])
    expect(d.activeAgents?.map((a) => a.id)).toEqual(["on"])
    expect(d.agentsNeedingAttention?.map((a) => a.id)).toEqual(["off"])
    expect(d.waitingForTeam).toBe(4)
  })

  it("keeps missing sources as null, never zero", () => {
    const d = computeDailySummary({ lines: [], failedChannels: ["sms"], agents: null, inbox: null })
    expect(d).toMatchObject({ waitingForTeam: null, unread: null, activeAgents: null, agentsNeedingAttention: null, channelsPartial: true })
  })
})
