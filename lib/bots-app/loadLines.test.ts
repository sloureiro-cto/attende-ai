import { listAttendeAgentsAction } from "actions/attende/agents"
import { listInstagramSessionsAction } from "actions/instagram-lite/sessions"
import { listSalesBotsAction } from "actions/messaging-automations/salesBots"
import { listSmsSessionsAction } from "actions/sms-lite/sessions"
import { listWhatsAppSessionsAction } from "actions/whatsapp-lite"
import { loadLines } from "./loadLines"

jest.mock("actions/whatsapp-lite", () => ({ listWhatsAppSessionsAction: jest.fn() }))
jest.mock("actions/instagram-lite/sessions", () => ({ listInstagramSessionsAction: jest.fn() }))
jest.mock("actions/sms-lite/sessions", () => ({ listSmsSessionsAction: jest.fn() }))
jest.mock("actions/messaging-automations/salesBots", () => ({ listSalesBotsAction: jest.fn() }))
jest.mock("actions/attende/agents", () => ({ listAttendeAgentsAction: jest.fn() }))

const wa = listWhatsAppSessionsAction as jest.Mock
const ig = listInstagramSessionsAction as jest.Mock
const sms = listSmsSessionsAction as jest.Mock
const bots = listSalesBotsAction as jest.Mock
const agents = listAttendeAgentsAction as jest.Mock

const okWa = { success: true, data: [{ _id: "w1", label: "Sales", status: "connected", phoneNumber: "+55" }] }
const okIg = { success: true, data: [{ _id: "i1", label: "Brand", status: "active", billingStatus: "active", updatedAt: "2026-10-01T00:00:00Z" }] }
const okSms = { success: true, data: [], hasCredentials: false }
const botList = (items: unknown[], total = items.length) => ({ success: true, data: { items, total, page: 1, limit: 100, totals: {} } })

beforeEach(() => {
  jest.clearAllMocks()
  agents.mockResolvedValue({ success: true, data: [] })
})

describe("loadLines", () => {
  it("merges the three channels and joins the bots", async () => {
    wa.mockResolvedValue(okWa)
    ig.mockResolvedValue(okIg)
    sms.mockResolvedValue(okSms)
    bots.mockResolvedValue(botList([{ id: "b1", name: "Welcome", status: "active", channels: [{ channel: "whatsapp", enabledSessionIds: ["w1"] }] }]))
    const res = await loadLines()
    expect(res.lines.map((l) => `${l.channel}:${l.id}`)).toEqual(["whatsapp:w1", "instagram:i1"])
    expect(res.lines[0]?.bots).toEqual([{ id: "b1", name: "Welcome", status: "active" }])
    expect(res).toMatchObject({ failedChannels: [], botsUnavailable: false, botsTruncated: false })
    expect(bots).toHaveBeenCalledWith({ limit: 100 })
  })

  it("keeps the other channels when one fails", async () => {
    wa.mockResolvedValue({ success: false, error: "boom" })
    ig.mockResolvedValue(okIg)
    sms.mockResolvedValue({ success: false, error: "nope" })
    bots.mockResolvedValue(botList([]))
    const res = await loadLines()
    expect(res.failedChannels).toEqual(["whatsapp", "sms"])
    expect(res.lines).toHaveLength(1)
  })

  it("still shows lines when the bot list is unavailable (not entitled, backend down)", async () => {
    wa.mockResolvedValue(okWa)
    ig.mockResolvedValue({ success: true, data: [] })
    sms.mockResolvedValue(okSms)
    bots.mockResolvedValue({ success: false, error: "", status: 403 })
    const res = await loadLines()
    expect(res.lines).toHaveLength(1)
    expect(res.lines[0]?.bots).toEqual([])
    expect(res.botsUnavailable).toBe(true)
  })

  it("flags a truncated bot page", async () => {
    wa.mockResolvedValue(okWa)
    ig.mockResolvedValue({ success: true, data: [] })
    sms.mockResolvedValue(okSms)
    bots.mockResolvedValue(botList([], 250))
    expect((await loadLines()).botsTruncated).toBe(true)
  })

  it("joins the AI agents bound to each channel", async () => {
    wa.mockResolvedValue(okWa)
    ig.mockResolvedValue({ success: true, data: [] })
    sms.mockResolvedValue(okSms)
    bots.mockResolvedValue(botList([]))
    agents.mockResolvedValue({ success: true, data: [{ id: "a1", name: "SDR", status: "live", lines: [{ channel: "whatsapp", sessionId: "w1", active: true }] }] })
    const res = await loadLines()
    expect(res.lines[0]?.agents).toEqual([{ id: "a1", name: "SDR", status: "live", active: true }])
    expect(res.agentsUnavailable).toBe(false)
  })

  it("still shows channels when the agent list fails or throws, and says agents are unavailable", async () => {
    wa.mockResolvedValue(okWa)
    ig.mockResolvedValue({ success: true, data: [] })
    sms.mockResolvedValue(okSms)
    bots.mockResolvedValue(botList([]))
    agents.mockRejectedValue(new Error("down"))
    const res = await loadLines()
    expect(res.lines).toHaveLength(1)
    expect(res.lines[0]?.agents).toBeUndefined()
    expect(res.agentsUnavailable).toBe(true)
  })

  it("skips the bot request entirely for the header pill", async () => {
    wa.mockResolvedValue(okWa)
    ig.mockResolvedValue({ success: true, data: [] })
    sms.mockResolvedValue(okSms)
    const res = await loadLines({ withBots: false })
    expect(bots).not.toHaveBeenCalled()
    expect(agents).not.toHaveBeenCalled()
    expect(res.botsUnavailable).toBe(false)
  })
})
