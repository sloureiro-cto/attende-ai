import type { InboxUnifiedListRow } from "lib/messages/inboxUnifiedClient"
import {
  applyHandling,
  applyNewInbound,
  buildInboxQuery,
  DEFAULT_INBOX_FILTERS,
  discardOptimistic,
  failOptimistic,
  filtersFromSearchParams,
  groupsWithPrevious,
  handlingOf,
  type InboxItem,
  inboxUrl,
  isUnread,
  isWhatsAppWindowClosed,
  mergeInboxPage,
  mergeThread,
  optimisticMessage,
  resolveOptimistic,
  retryOptimistic,
  toInboxItem,
  toThreadMessage,
  whatsAppWindowRemainingMs,
} from "./model"

const waRow = (over: Record<string, unknown> = {}): InboxUnifiedListRow =>
  ({
    channel: "whatsapp",
    sessionId: "s1",
    sessionLabel: "Main line",
    conversation: {
      _id: "c1",
      contactName: "Ana Souza",
      contactPhone: "+5511999990000",
      lastMessageAt: "2026-10-22T10:00:00Z",
      lastMessageDirection: "inbound",
      lastMessagePreview: "Oi!",
      lastInboundAt: "2026-10-22T10:00:00Z",
      lastReadAt: null,
      conversationState: "qualifying",
      activeAgent: { _id: "a1", name: "Sofia" },
      crmColumnId: "col1",
      crmLabels: [{ _id: "l1", text: "VIP" }],
      linkedEntityType: "card",
      linkedEntityId: "card1",
      ...over,
    },
  }) as unknown as InboxUnifiedListRow

describe("toInboxItem", () => {
  it("normalises a WhatsApp conversation with an AI agent on it", () => {
    const item = toInboxItem(waRow())
    expect(item).toMatchObject({
      key: "whatsapp::s1::c1",
      name: "Ana Souza",
      phone: "+5511999990000",
      handling: "ai",
      agentName: "Sofia",
      unread: true,
      linkedCardId: "card1",
      crmColumnId: "col1",
    })
    expect(item.labels).toEqual([{ id: "l1", text: "VIP", color: undefined }])
  })

  it("reads Instagram display name and SMS phone", () => {
    const ig = toInboxItem({
      channel: "instagram",
      sessionId: "s2",
      sessionLabel: "IG",
      conversation: { _id: "i1", displayName: "Loja X", attendeeUsername: "lojax" },
    } as unknown as InboxUnifiedListRow)
    expect(ig.name).toBe("Loja X")
    expect(ig.username).toBe("lojax")
    const sms = toInboxItem({
      channel: "sms",
      sessionId: "s3",
      sessionLabel: "SMS",
      conversation: { _id: "m1", contactPhone: "+1555", conversationState: "human_handoff" },
    } as unknown as InboxUnifiedListRow)
    expect(sms.phone).toBe("+1555")
    expect(sms.handling).toBe("human")
  })
})

describe("handling and unread", () => {
  it("human handoff wins over a bound agent; blocked or no agent means no AI", () => {
    expect(handlingOf("human_handoff", { name: "x" })).toBe("human")
    expect(handlingOf("qualifying", { name: "x" })).toBe("ai")
    expect(handlingOf("qualifying", null)).toBe("none")
    // The dispatcher skips blocked conversations even when an agent is bound.
    expect(handlingOf("blocked", { name: "x" })).toBe("none")
  })

  it("is not unread once someone (team or AI) replied after the customer", () => {
    expect(
      isUnread({ lastMessageDirection: "inbound", lastInboundAt: "2026-10-22T10:00:00Z", lastOutboundAt: "2026-10-22T10:01:00Z", lastReadAt: null })
    ).toBe(false)
  })

  it("is unread only when the customer wrote after the read cursor", () => {
    expect(isUnread({ lastMessageDirection: "inbound", lastInboundAt: "2026-10-22T10:00:00Z", lastReadAt: null })).toBe(true)
    expect(isUnread({ lastMessageDirection: "inbound", lastInboundAt: "2026-10-22T10:00:00Z", lastReadAt: "2026-10-22T10:05:00Z" })).toBe(false)
    expect(isUnread({ lastMessageDirection: "outbound", lastInboundAt: "2026-10-22T10:00:00Z", lastReadAt: null })).toBe(false)
  })
})

describe("filters in the URL", () => {
  it("reads ?filter= and ?channel=, ignoring unknown values", () => {
    expect(filtersFromSearchParams({ filter: "needs_reply", channel: "instagram" })).toEqual({ filter: "needs_reply", channel: "instagram", search: "" })
    expect(filtersFromSearchParams({ filter: "ai" })).toMatchObject({ filter: "ai", channel: "all" })
    expect(filtersFromSearchParams({ filter: "bogus", channel: "fax" })).toEqual(DEFAULT_INBOX_FILTERS)
    expect(filtersFromSearchParams(undefined)).toEqual(DEFAULT_INBOX_FILTERS)
  })

  it("on a conversation URL, channel is the conversation's, not a filter", () => {
    expect(filtersFromSearchParams({ filter: "unread", channel: "whatsapp" }, { readChannel: false })).toMatchObject({ filter: "unread", channel: "all" })
  })

  it("writes the filters and the open conversation back", () => {
    expect(inboxUrl(DEFAULT_INBOX_FILTERS, null)).toBe("/inbox")
    expect(inboxUrl({ filter: "ai", channel: "sms", search: "ana" }, null)).toBe("/inbox?channel=sms&filter=ai")
    expect(inboxUrl({ filter: "unread", channel: "all", search: "" }, { conversationId: "c1", channel: "whatsapp", sessionId: "s1" })).toBe(
      "/inbox/c1?channel=whatsapp&sessionId=s1&filter=unread"
    )
  })
})

describe("buildInboxQuery", () => {
  it("maps filters to server params", () => {
    expect(buildInboxQuery(DEFAULT_INBOX_FILTERS)).toEqual({ limit: "30" })
    expect(buildInboxQuery({ filter: "unread", channel: "whatsapp", search: " ana " }, "CUR", 20)).toEqual({
      limit: "20",
      channel: "whatsapp",
      search: "ana",
      queueView: "unread",
      cursor: "CUR",
    })
    expect(buildInboxQuery({ filter: "needs_reply", channel: "all", search: "" }).queueView).toBe("needs_response")
    expect(buildInboxQuery({ filter: "human", channel: "all", search: "" }).conversationState).toBe("human_handoff")
    expect(buildInboxQuery({ filter: "ai", channel: "all", search: "" }).conversationState).toContain("qualifying")
    expect(buildInboxQuery({ filter: "ai", channel: "all", search: "" }).conversationState).not.toContain("human_handoff")
  })
})

describe("list patches", () => {
  const base = (id: string, over: Partial<InboxItem> = {}): InboxItem => ({ ...toInboxItem(waRow({ _id: id })), ...over })

  it("merges pages without duplicating rows", () => {
    const a = base("a")
    const b = base("b")
    expect(mergeInboxPage([a], [a, b]).map((i) => i.conversationId)).toEqual(["a", "b"])
  })

  it("a new inbound message moves the row to the top and marks it unread unless it is open", () => {
    const items = [base("a", { unread: false }), base("b", { unread: false })]
    const bumped = applyNewInbound(items, { conversationId: "b", lastInboundAt: "2026-10-22T11:00:00Z", lastMessagePreview: "Preciso de ajuda" }, null)
    expect(bumped.map((i) => i.conversationId)).toEqual(["b", "a"])
    expect(bumped[0]).toMatchObject({ unread: true, preview: "Preciso de ajuda" })
    const open = applyNewInbound(items, { conversationId: "b", lastInboundAt: "2026-10-22T11:00:00Z" }, "whatsapp::s1::b")
    expect(open[0]!.unread).toBe(false)
  })

  it("ignores events for conversations that are not loaded", () => {
    const items = [base("a")]
    expect(applyNewInbound(items, { conversationId: "zzz", lastInboundAt: "2026-10-22T11:00:00Z" }, null)).toBe(items)
  })

  it("take over / return to AI flips the handling", () => {
    const items = [base("a", { handling: "ai", state: "qualifying" })]
    expect(applyHandling(items, "a", "human")[0]).toMatchObject({ handling: "human", state: "human_handoff" })
    const back = applyHandling([base("a", { handling: "human", state: "human_handoff" })], "a", "ai")[0]
    expect(back).toMatchObject({ handling: "ai", state: "qualifying" })
  })
})

describe("thread messages", () => {
  it("does not guess the author of an outbound row without a sender type", () => {
    const raw = { _id: "m", direction: "outbound", createdAt: "2026-10-22T10:00:00Z", content: "x", status: "sent" }
    expect(toThreadMessage(raw as never).author).toBe("unknown")
  })

  it("classifies authors: customer, AI, rule automation, team", () => {
    const m = (over: Record<string, unknown>) => toThreadMessage({ _id: "m", direction: "outbound", createdAt: "2026-10-22T10:00:00Z", content: "x", status: "sent", ...over } as never)
    expect(m({ direction: "inbound", senderType: "contact" }).author).toBe("contact")
    expect(m({ senderType: "agent", senderAgent: { name: "Sofia", source: "agent" } })).toMatchObject({ author: "ai", authorName: "Sofia" })
    expect(m({ senderType: "agent", senderAgent: { source: "inbound_rule" } }).author).toBe("automation")
    expect(m({ senderType: "user", senderUser: { name: "Bia" } })).toMatchObject({ author: "human", authorName: "Bia" })
  })

  it("keeps messages oldest-first, deduped by id", () => {
    const a = toThreadMessage({ _id: "1", direction: "inbound", content: "a", createdAt: "2026-10-22T10:00:00Z" } as never)
    const b = toThreadMessage({ _id: "2", direction: "inbound", content: "b", createdAt: "2026-10-22T10:01:00Z" } as never)
    expect(mergeThread([b], [a, b]).map((x) => x.id)).toEqual(["1", "2"])
  })

  it("optimistic send: pending -> resolved by the server row (no duplicate)", () => {
    const pending = optimisticMessage("Olá", "local-1", new Date("2026-10-22T10:00:00Z"))
    expect(pending.status).toBe("sending")
    const server = toThreadMessage({ _id: "srv1", direction: "outbound", senderType: "user", content: "Olá", status: "sent", createdAt: "2026-10-22T10:00:01Z" } as never)
    const resolved = resolveOptimistic([pending], "local-1", server)
    expect(resolved.map((m) => m.id)).toEqual(["srv1"])
  })

  it("a failed send stays in place with retry and discard", () => {
    const pending = optimisticMessage("Olá", "local-1")
    const failed = failOptimistic([pending], "local-1", "network")
    expect(failed[0]).toMatchObject({ status: "failed", error: "network" })
    expect(retryOptimistic(failed, "local-1")[0]).toMatchObject({ status: "sending", error: null })
    expect(discardOptimistic(failed, "local-1")).toEqual([])
  })

  it("a refresh keeps a still-pending local message and drops it once the server has the same text", () => {
    const pending = optimisticMessage("Olá", "local-1", new Date("2026-10-22T10:00:00Z"))
    const unrelated = toThreadMessage({ _id: "s0", direction: "inbound", content: "oi", createdAt: "2026-10-22T09:59:00Z" } as never)
    expect(mergeThread([pending], [unrelated]).map((m) => m.id)).toEqual(["s0", "local-1"])
    const echoed = toThreadMessage({ _id: "s9", direction: "outbound", senderType: "user", content: "Olá", createdAt: "2026-10-22T10:00:02Z" } as never)
    expect(mergeThread([pending], [unrelated, echoed]).map((m) => m.id)).toEqual(["s0", "s9"])
  })

  it("groups consecutive messages of one author within five minutes", () => {
    const a = toThreadMessage({ _id: "1", direction: "inbound", content: "a", createdAt: "2026-10-22T10:00:00Z" } as never)
    const b = toThreadMessage({ _id: "2", direction: "inbound", content: "b", createdAt: "2026-10-22T10:02:00Z" } as never)
    const c = toThreadMessage({ _id: "3", direction: "inbound", content: "c", createdAt: "2026-10-22T10:30:00Z" } as never)
    expect(groupsWithPrevious(a, b)).toBe(true)
    expect(groupsWithPrevious(b, c)).toBe(false)
    expect(groupsWithPrevious(undefined, a)).toBe(false)
  })
})

describe("isWhatsAppWindowClosed", () => {
  const now = new Date("2026-10-22T12:00:00Z")
  it("only official WhatsApp lines, and only after 24h", () => {
    expect(isWhatsAppWindowClosed({ channel: "whatsapp", transport: "cloud_api", lastInboundAt: "2026-10-21T10:00:00Z", now })).toBe(true)
    expect(isWhatsAppWindowClosed({ channel: "whatsapp", transport: "cloud_api", lastInboundAt: "2026-10-22T10:00:00Z", now })).toBe(false)
    expect(isWhatsAppWindowClosed({ channel: "whatsapp", transport: "baileys", lastInboundAt: "2026-10-01T10:00:00Z", now })).toBe(false)
    expect(isWhatsAppWindowClosed({ channel: "sms", transport: "cloud_api", lastInboundAt: "2026-10-01T10:00:00Z", now })).toBe(false)
  })
})

describe("whatsAppWindowRemainingMs", () => {
  const now = new Date("2026-10-22T12:00:00Z")
  it("counts down from the customer's last message on official lines only", () => {
    expect(whatsAppWindowRemainingMs({ channel: "whatsapp", transport: "cloud_api", lastInboundAt: "2026-10-22T10:00:00Z", now })).toBe(22 * 3600_000)
    expect(whatsAppWindowRemainingMs({ channel: "whatsapp", transport: "cloud_api", lastInboundAt: "2026-10-21T10:00:00Z", now })).toBe(0)
    expect(whatsAppWindowRemainingMs({ channel: "whatsapp", transport: "cloud_api", lastInboundAt: null, now })).toBe(0)
    expect(whatsAppWindowRemainingMs({ channel: "whatsapp", transport: "baileys", lastInboundAt: "2026-10-22T10:00:00Z", now })).toBeNull()
    expect(whatsAppWindowRemainingMs({ channel: "instagram", transport: "cloud_api", lastInboundAt: "2026-10-22T10:00:00Z", now })).toBeNull()
  })
})
