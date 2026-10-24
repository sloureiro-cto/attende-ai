import type { IInstagramSession } from "actions/instagram-lite/types"
import type { ISmsSession } from "actions/sms-lite/types"
import type { WhatsAppSession } from "actions/whatsapp-lite/types"
import type { AgentView } from "lib/attende/agents/types"
import type { AdvancedAutomationListItem } from "lib/automations/types"
import {
  activeBotsOf,
  attachAgents,
  attachBots,
  type BotsLine,
  canReconnectHere,
  isLineChannel,
  mapInstagramSession,
  mapSmsSession,
  mapWhatsAppSession,
  pillStatusOf,
  sortLines,
  summarizeLines,
} from "./lines"

const wa = (over: Partial<WhatsAppSession> = {}): WhatsAppSession => ({ _id: "w1", label: "Sales", status: "connected", phoneNumber: "+5511", ...over })
const ig = (over: Partial<IInstagramSession> = {}): IInstagramSession => ({
  _id: "i1",
  workspaceId: "ws",
  label: "Brand",
  status: "active",
  billingStatus: "active",
  instagramUsername: "brand",
  createdBy: "u",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-02T00:00:00Z",
  ...over,
})
const sms = (over: Partial<ISmsSession> = {}): ISmsSession => ({
  _id: "s1",
  workspaceId: "ws",
  label: "Alerts",
  provider: "twilio" as ISmsSession["provider"],
  fromNumber: "+1555",
  status: "active",
  createdBy: "u",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-02T00:00:00Z",
  ...over,
})
const bot = (id: string, status: AdvancedAutomationListItem["status"], channels: AdvancedAutomationListItem["channels"]): AdvancedAutomationListItem => ({
  id,
  name: `Bot ${id}`,
  status,
  channels,
  stepCount: 3,
  version: 1,
  updatedAt: "2026-10-01T00:00:00Z",
  stats30d: { started: 0, completed: 0 },
})

describe("mapWhatsAppSession", () => {
  it("official API lines get real buttons, QR lines a numbered text menu", () => {
    expect(mapWhatsAppSession(wa({ transport: "cloud_api" }))).toMatchObject({ transport: "whatsapp_cloud", choiceDelivery: "buttons" })
    expect(mapWhatsAppSession(wa({ transport: "baileys" }))).toMatchObject({ transport: "whatsapp_qr", choiceDelivery: "text_menu" })
    expect(mapWhatsAppSession(wa({ transport: undefined }))).toMatchObject({ transport: "whatsapp_qr" })
  })

  it.each([
    ["connected", "connected"],
    ["qr_pending", "reconnecting"],
    ["disconnected", "disconnected"],
    ["banned", "error"],
    ["something_new", "disconnected"],
  ])("status %s -> %s", (raw, expected) => {
    const line = mapWhatsAppSession(wa({ status: raw }))
    expect(line.status).toBe(expected)
    expect(line.rawStatus).toBe(raw)
  })

  it("tells a first pairing (qr_pending) from a reconnect (paired before), and a suspended session is disabled", () => {
    expect(mapWhatsAppSession(wa({ status: "qr_pending", phoneNumber: null })).status).toBe("qr_pending")
    expect(mapWhatsAppSession(wa({ status: "qr_pending", phoneNumber: null, lastConnectedAt: "2026-10-01T00:00:00Z" } as Partial<WhatsAppSession>)).status).toBe("reconnecting")
    expect(mapWhatsAppSession(wa({ status: "disconnected", entitlementSuspendedAt: "2026-10-01T00:00:00Z" } as Partial<WhatsAppSession>)).status).toBe("disabled")
  })

  it("only QR WhatsApp lines that are down or waiting can be reconnected here", () => {
    expect(canReconnectHere(mapWhatsAppSession(wa({ status: "disconnected" })))).toBe(true)
    expect(canReconnectHere(mapWhatsAppSession(wa({ status: "qr_pending" })))).toBe(true)
    expect(canReconnectHere(mapWhatsAppSession(wa()))).toBe(false)
    expect(canReconnectHere(mapWhatsAppSession(wa({ status: "disconnected", transport: "cloud_api" })))).toBe(false)
    expect(canReconnectHere(mapInstagramSession(ig({ status: "reconnect_required" })))).toBe(false)
  })

  it("uses the disconnect time as the last event only while it is down", () => {
    const down = mapWhatsAppSession(wa({ status: "disconnected", lastDisconnectAt: "2026-10-05T10:00:00Z", updatedAt: "2026-10-06T00:00:00Z" }))
    expect(down).toMatchObject({ lastEventAt: "2026-10-05T10:00:00Z", lastEventKind: "disconnected" })
    const up = mapWhatsAppSession(wa({ status: "connected", lastDisconnectAt: "2026-10-05T10:00:00Z", updatedAt: "2026-10-06T00:00:00Z" }))
    expect(up).toMatchObject({ lastEventAt: "2026-10-06T00:00:00Z", lastEventKind: "updated" })
    expect(mapWhatsAppSession(wa({ updatedAt: "not a date" }))).toMatchObject({ lastEventAt: null, lastEventKind: null })
  })

  it("trims the number and falls back to null", () => {
    expect(mapWhatsAppSession(wa({ phoneNumber: "  +55 " })).identifier).toBe("+55")
    expect(mapWhatsAppSession(wa({ phoneNumber: null })).identifier).toBeNull()
  })
})

describe("mapInstagramSession", () => {
  it("is connected only when active and the account is operational", () => {
    expect(mapInstagramSession(ig()).status).toBe("connected")
    expect(mapInstagramSession(ig({ unipileAccountStatus: "operational" })).status).toBe("connected")
    expect(mapInstagramSession(ig({ unipileAccountStatus: "credentials" })).status).toBe("disconnected")
    expect(mapInstagramSession(ig({ unipileAccountStatus: "disconnected" })).status).toBe("disconnected")
  })

  it.each([
    ["reconnect_required", "disconnected"],
    ["disabled", "disabled"],
    ["pending_checkout", "pending_setup"],
    ["pending_connect", "pending_setup"],
  ] as const)("status %s -> %s", (raw, expected) => expect(mapInstagramSession(ig({ status: raw })).status).toBe(expected))

  it("prefixes the username once and uses quick replies", () => {
    expect(mapInstagramSession(ig({ instagramUsername: "@brand" }))).toMatchObject({ identifier: "@brand", choiceDelivery: "quick_replies" })
    expect(mapInstagramSession(ig({ instagramUsername: undefined })).identifier).toBeNull()
  })
})

describe("mapSmsSession", () => {
  it("maps active, disabled and pending config", () => {
    expect(mapSmsSession(sms()).status).toBe("connected")
    expect(mapSmsSession(sms({ status: "disabled" })).status).toBe("disabled")
    expect(mapSmsSession(sms({ status: "pending_config" })).status).toBe("pending_setup")
    expect(mapSmsSession(sms())).toMatchObject({ identifier: "+1555", choiceDelivery: "text_menu", transport: "sms" })
  })
})

describe("attachBots", () => {
  const lines = [mapWhatsAppSession(wa()), mapInstagramSession(ig({ _id: "w1" }))] // same id on two channels
  it("matches on channel AND session id", () => {
    const out = attachBots(lines, [bot("b1", "active", [{ channel: "whatsapp", enabledSessionIds: ["w1", "w2"] }])])
    expect(out[0]?.bots.map((b) => b.id)).toEqual(["b1"])
    expect(out[1]?.bots).toEqual([])
  })

  it("ignores bots without a binding to the line and keeps paused/draft ones for the drawer", () => {
    const out = attachBots(lines, [
      bot("b1", "paused", [{ channel: "whatsapp", enabledSessionIds: ["w1"] }]),
      bot("b2", "active", [{ channel: "whatsapp", enabledSessionIds: [] }]),
    ])
    expect(out[0]?.bots).toEqual([{ id: "b1", name: "Bot b1", status: "paused" }])
    expect(activeBotsOf(out[0] as BotsLine)).toEqual([])
  })
})

describe("attachAgents", () => {
  const agent = (id: string, status: AgentView["status"], lines: AgentView["lines"]) =>
    ({ id, name: `Agent ${id}`, status, lines }) as Pick<AgentView, "id" | "name" | "status" | "lines">
  it("matches channel and session, and is active only when live and the binding is active", () => {
    const lines = [mapWhatsAppSession(wa()), mapInstagramSession(ig({ _id: "w1" }))]
    const out = attachAgents(lines, [
      agent("a1", "live", [{ channel: "whatsapp", sessionId: "w1", active: true }]),
      agent("a2", "paused", [{ channel: "whatsapp", sessionId: "w1", active: false }]),
      agent("a3", "live", [{ channel: "sms", sessionId: "w1" }]),
    ])
    expect(out[0]?.agents).toEqual([
      { id: "a1", name: "Agent a1", status: "live", active: true },
      { id: "a2", name: "Agent a2", status: "paused", active: false },
    ])
    expect(out[1]?.agents).toEqual([])
  })
})

describe("summaries", () => {
  const lines = (): BotsLine[] =>
    attachBots(
      [
        mapWhatsAppSession(wa()),
        mapWhatsAppSession(wa({ _id: "w2", status: "disconnected" })),
        mapInstagramSession(ig({ status: "disabled" })),
        mapSmsSession(sms({ status: "pending_config" })),
      ],
      [bot("b1", "active", [{ channel: "whatsapp", enabledSessionIds: ["w1", "w2"] }])]
    )

  it("counts every channel like the tabs, says how many are active or disabled, and counts each active automation once", () => {
    expect(summarizeLines(lines(), { agentsLoaded: false })).toEqual({
      total: 4,
      enabled: 3,
      disabled: 1,
      connected: 1,
      attention: 2,
      activeAutomations: 1,
      activeAgents: null,
    })
  })

  it("never turns data that was not loaded into a 0", () => {
    expect(summarizeLines(lines(), { botsLoaded: false })).toMatchObject({ activeAutomations: null, activeAgents: null })
  })

  it("derives the side-menu alert with the same base as the page, naming each affected channel once", () => {
    expect(pillStatusOf([])).toEqual({ state: "none", total: 0 })
    expect(pillStatusOf([mapWhatsAppSession(wa())])).toEqual({ state: "ok", total: 1, connected: 1 })
    expect(pillStatusOf([...lines(), lines()[1] as BotsLine])).toEqual({
      state: "degraded",
      total: 5,
      affected: [
        { id: "w2", channel: "whatsapp", label: "Sales", status: "disconnected", reconnectHere: true },
        { id: "s1", channel: "sms", label: "Alerts", status: "pending_setup", reconnectHere: false },
      ],
    })
    expect(pillStatusOf([mapInstagramSession(ig({ status: "disabled" }))])).toEqual({ state: "none", total: 1 })
  })
})

describe("sortLines", () => {
  it("puts problems first, then channel and label, without mutating the input", () => {
    const input = [
      mapSmsSession(sms({ label: "B" })),
      mapWhatsAppSession(wa({ _id: "w9", label: "Z", status: "banned" })),
      mapWhatsAppSession(wa({ _id: "w1", label: "A" })),
      mapWhatsAppSession(wa({ _id: "w2", label: "B", status: "disconnected" })),
    ]
    const before = input.map((l) => l.id)
    expect(sortLines(input).map((l) => l.id)).toEqual(["w9", "w2", "w1", "s1"])
    expect(input.map((l) => l.id)).toEqual(before)
  })
})

describe("isLineChannel", () => {
  it("accepts only the three channels", () => {
    expect(["whatsapp", "instagram", "sms"].every(isLineChannel)).toBe(true)
    expect(["telegram", "", "WhatsApp"].some(isLineChannel)).toBe(false)
  })
})
