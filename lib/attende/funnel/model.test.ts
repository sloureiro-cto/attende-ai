import { contact, id, page, row, stage } from "./fixtures"
import {
  activeFilterCount,
  activeSecondaryFilters,
  CLEAR_SECONDARY_FILTERS,
  clearSecondaryFilter,
  DEFAULT_COLUMNS,
  DEFAULT_FILTERS,
  DEFAULT_URL_STATE,
  displayName,
  effectiveSearch,
  filtersToApiQuery,
  formatDealValue,
  formatRelativeTime,
  initials,
  lacksPhoneAndEmail,
  MAX_PARTIAL_FOLLOW_UPS,
  mergeById,
  moneyInputText,
  moveRowToStage,
  parseColumnPrefs,
  parseFunnelParams,
  restoreRow,
  sameQuery,
  shouldFollowUp,
  stateToSearchParams,
} from "./model"

describe("funnel URL state", () => {
  it("has sane defaults", () => {
    expect(parseFunnelParams({})).toEqual(DEFAULT_URL_STATE)
  })

  it("round-trips every filter through the URL", () => {
    const state = parseFunnelParams({
      tab: "contacts",
      stage: `${id(1)},${id(2)}`,
      q: "ana",
      assignee: id(3),
      label: id(4),
      source: id(5),
      from: "2026-10-01",
      to: "2026-10-22",
      sort: "updated_asc",
      size: "100",
      mask: "1",
      deal: id(6),
    })
    expect(state.filters.stages).toEqual([id(1), id(2)])
    expect(state).toMatchObject({ tab: "contacts", pageSize: 100, maskPhone: true, deal: id(6) })
    expect(parseFunnelParams(stateToSearchParams(state))).toEqual(state)
  })

  it("reads links without the conversation filters, which no card list can apply", () => {
    expect(parseFunnelParams({ channel: "sms", open: "yes", handling: "human" }).filters).toMatchObject({ channel: null, openConversation: "any", handling: "any" })
  })

  it("keeps the URL short: defaults are omitted", () => {
    expect(stateToSearchParams(DEFAULT_URL_STATE).toString()).toBe("")
  })

  it("never trusts ids from the URL", () => {
    const s = parseFunnelParams({ stage: `${id(1)},../x,'; drop,${id(1)}`, assignee: "nope", label: "<b>", source: "123", deal: "javascript:alert(1)" })
    expect(s.filters.stages).toEqual([id(1)])
    expect(s.filters.assignee).toBeNull()
    expect(s.filters.label).toBeNull()
    expect(s.filters.source).toBeNull()
    expect(s.deal).toBeNull()
  })

  it("falls back on unknown enums, dates and sizes", () => {
    const s = parseFunnelParams({ channel: "fax", open: "maybe", handling: "robot", from: "2026-02-30", to: "x", sort: "name", size: "7", tab: "other" })
    expect(s.filters).toMatchObject({ channel: null, openConversation: "any", handling: "any", createdFrom: null, createdTo: null, sort: "updated_desc" })
    expect(s.pageSize).toBe(50)
    expect(s.tab).toBe("deals")
  })

  it("caps the number of stages and the search length", () => {
    const many = Array.from({ length: 80 }, (_, i) => id(i + 1)).join(",")
    expect(parseFunnelParams({ stage: many }).filters.stages).toHaveLength(50)
    expect(parseFunnelParams({ q: "a".repeat(200) }).filters.q).toHaveLength(80)
  })

  it("accepts repeated params and URLSearchParams", () => {
    expect(parseFunnelParams({ stage: [id(1), id(2)] }).filters.stages).toEqual([id(1), id(2)])
    expect(parseFunnelParams(new URLSearchParams(`stage=${id(1)}&stage=${id(2)}`)).filters.stages).toEqual([id(1), id(2)])
  })
})

describe("backend query", () => {
  it("maps filters to the contract's parameter names", () => {
    const q = filtersToApiQuery(
      { ...DEFAULT_FILTERS, stages: [id(1), id(2)], q: " ana ", assignee: id(3), channel: "whatsapp", openConversation: "no", handling: "ai", createdFrom: "2026-10-01" },
      { limit: 50, cursor: "abc", maskPhone: true }
    )
    expect(q).toEqual({
      stage: `${id(1)},${id(2)}`,
      q: "ana",
      assignee: id(3),
      channel: "whatsapp",
      hasOpenConversation: "false",
      agentHandling: "ai",
      createdFrom: "2026-10-01",
      sort: "updated_desc",
      limit: "50",
      cursor: "abc",
      maskPhone: "true",
    })
  })

  it("does not search with a single character", () => {
    expect(effectiveSearch("a")).toBe("")
    expect(effectiveSearch(" an ")).toBe("an")
    expect(filtersToApiQuery({ ...DEFAULT_FILTERS, q: "a" }).q).toBeUndefined()
  })

  it("counts active filters, not the sort", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...DEFAULT_FILTERS, sort: "updated_asc" })).toBe(0)
    expect(activeFilterCount({ ...DEFAULT_FILTERS, stages: [id(1)], q: "ana", createdFrom: "2026-10-01", createdTo: "2026-10-02" })).toBe(3)
  })

  it("recognises equal queries (to drop stale answers)", () => {
    expect(sameQuery(DEFAULT_FILTERS, { ...DEFAULT_FILTERS })).toBe(true)
    expect(sameQuery(DEFAULT_FILTERS, { ...DEFAULT_FILTERS, channel: "sms" })).toBe(false)
    expect(sameQuery({ ...DEFAULT_FILTERS, q: "a" }, DEFAULT_FILTERS)).toBe(true)
  })
})

describe("secondary filters", () => {
  const on = { ...DEFAULT_FILTERS, stages: [stage(1).id], q: "ana", assignee: id(1), handling: "human" as const, createdTo: "2026-10-01" }

  it("lists the ones that are on, in chip order, ignoring stages and search", () => {
    expect(activeSecondaryFilters(DEFAULT_FILTERS)).toEqual([])
    expect(activeSecondaryFilters(on)).toEqual(["assignee", "handling", "created"])
  })

  it("turns one off, or all of them, and keeps stages and search", () => {
    expect({ ...on, ...clearSecondaryFilter("created") }).toMatchObject({ createdFrom: null, createdTo: null, assignee: id(1) })
    expect({ ...on, ...clearSecondaryFilter("handling") }.handling).toBe("any")
    expect({ ...on, ...clearSecondaryFilter("assignee") }.assignee).toBeNull()
    const cleared = { ...on, ...CLEAR_SECONDARY_FILTERS }
    expect(activeSecondaryFilters(cleared)).toEqual([])
    expect(cleared).toMatchObject({ stages: [stage(1).id], q: "ana" })
  })
})

describe("paging", () => {
  it("never repeats a row", () => {
    expect(mergeById([row(1), row(2)], [row(2), row(3)], (r) => r.cardId).map((r) => r.cardId)).toEqual([id(1), id(2), id(3)])
  })

  it("follows up only after an empty partial page that has more", () => {
    expect(shouldFollowUp({ hasMore: true, partial: true }, 0, 0)).toBe(true)
    expect(shouldFollowUp({ hasMore: true, partial: true }, 3, 0)).toBe(false)
    expect(shouldFollowUp({ hasMore: true, partial: false }, 0, 0)).toBe(false)
    expect(shouldFollowUp({ hasMore: false, partial: true }, 0, 0)).toBe(false)
  })

  it("bounds the follow-ups", () => {
    expect(shouldFollowUp({ hasMore: true, partial: true }, 0, MAX_PARTIAL_FOLLOW_UPS)).toBe(false)
    expect(page([]).items).toEqual([])
  })
})

describe("optimistic stage move", () => {
  const rows = [row(1), row(2)]

  it("moves the row and follows the stage kind for the deal status", () => {
    const won = stage(9, { kind: "won" })
    const { rows: next, previous } = moveRowToStage(rows, id(1), won)
    expect(next[0]?.stage).toEqual(won)
    expect(next[0]?.deal?.status).toBe("won")
    expect(next[1]).toBe(rows[1])
    expect(previous).toBe(rows[0])
  })

  it("rolls back to the exact previous row", () => {
    const { rows: next, previous } = moveRowToStage(rows, id(1), stage(5))
    expect(restoreRow(next, previous as never)[0]).toBe(rows[0])
  })

  it("is a no-op for a row that is not loaded, and keeps a missing deal missing", () => {
    expect(moveRowToStage(rows, id(99), stage(5))).toEqual({ rows, previous: null })
    const noDeal = [row(1, { deal: null })]
    expect(moveRowToStage(noDeal, id(1), stage(5)).rows[0]?.deal).toBeNull()
  })
})

describe("columns", () => {
  it("falls back to the defaults and always keeps the contact column", () => {
    expect(parseColumnPrefs(undefined)).toEqual([...DEFAULT_COLUMNS])
    expect(parseColumnPrefs(["stage"])).toEqual(["contact", "stage"])
    expect(parseColumnPrefs(["owner", "bogus", "contact"])).toEqual(["contact", "owner"])
  })
})

describe("formatting", () => {
  it("formats a deal value in the deal's own currency, whatever the language", () => {
    expect(formatDealValue({ value: 1500, currency: "USD", status: "open" }, "english")).toBe("$1,500.00")
    expect(formatDealValue({ value: 1500, currency: "USD", status: "open" }, "portuguese")).toMatch(/US\$\s?1\.500,00/)
    expect(formatDealValue({ value: 99.9, currency: "BRL", status: "open" }, "english")).toBe("R$99.90")
    expect(formatDealValue({ value: 5, currency: "NOT-A-CODE", status: "open" }, "english")).toContain("5")
  })

  it("keeps a missing value missing and a real zero a zero", () => {
    expect(formatDealValue(null, "english")).toBeNull()
    expect(formatDealValue({ value: 0, currency: "USD", status: "open" }, "english")).toBe("$0.00")
    expect(formatDealValue({ value: 12, currency: "", status: "open" }, "english")).toBe("12")
  })

  it("writes the editor amount with the language's decimal mark", () => {
    expect(moneyInputText(1500.5, "portuguese")).toBe("1500,5")
    expect(moneyInputText(1500.5, "english")).toBe("1500.5")
  })

  it("describes time coarsely, in the language", () => {
    const now = new Date("2026-10-22T12:00:00.000Z")
    expect(formatRelativeTime("2026-10-22T10:00:00.000Z", now, "english")).toBe("2 hours ago")
    expect(formatRelativeTime("2026-10-19T12:00:00.000Z", now, "english")).toBe("3 days ago")
    expect(formatRelativeTime("2026-10-19T12:00:00.000Z", now, "portuguese")).toBe("há 3 dias")
    expect(formatRelativeTime("2026-01-05T12:00:00.000Z", now, "english")).toBe("Jan 5, 2026")
    expect(formatRelativeTime(null, now, "english")).toBe("")
    expect(formatRelativeTime("garbage", now, "english")).toBe("")
  })

  it("makes initials from letters only", () => {
    expect(initials("Ana Souza")).toBe("AS")
    expect(initials("Cher")).toBe("C")
    expect(initials("élise da silva")).toBe("ÉS")
    expect(initials("+55 11 99999-0000")).toBe("")
    expect(initials(null)).toBe("")
    expect(contact(1).name).toBe("Contact 1")
  })

  it("falls back from the name to the title, the phone and the e-mail", () => {
    expect(displayName({ name: " Ana ", phone: "+55", email: "a@x.com" }, "Lead")).toBe("Ana")
    expect(displayName({ name: null, phone: "+55", email: "a@x.com" }, "Lead")).toBe("Lead")
    expect(displayName({ name: "", phone: "+55", email: "a@x.com" }, "")).toBe("+55")
    expect(displayName({ name: null, phone: null, email: "a@x.com" })).toBe("a@x.com")
    expect(displayName(null, null)).toBe("")
  })

  it("says a contact lacks phone and e-mail only when both are missing", () => {
    expect(lacksPhoneAndEmail({ name: "A", phone: null, email: " " })).toBe(true)
    expect(lacksPhoneAndEmail({ name: "A", phone: "+55", email: null })).toBe(false)
    expect(lacksPhoneAndEmail({ name: "A", phone: null, email: "a@x.com" })).toBe(false)
    expect(lacksPhoneAndEmail(null)).toBe(false)
  })
})
