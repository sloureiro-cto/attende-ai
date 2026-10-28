import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { contact, id, page, row, stage, stagesData } from "lib/attende/funnel/fixtures"
import { DEFAULT_FILTERS, DEFAULT_URL_STATE, type FunnelUrlState, stateToSearchParams } from "lib/attende/funnel/model"
import type { FunnelPage } from "lib/attende/funnel/types"
import { type FunnelInitial, FunnelView } from "./FunnelView"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
const loadFunnelPageAction = jest.fn()
const loadFunnelContactsAction = jest.fn()
const moveFunnelDealAction = jest.fn()
const loadFunnelFilterOptionsAction = jest.fn()
const loadFunnelContactAction = jest.fn()
const updateFunnelContactAction = jest.fn()
const updateFunnelDealAction = jest.fn()
const loadFunnelChecklistAction = jest.fn()
const addFunnelChecklistItemAction = jest.fn()
const updateFunnelChecklistItemAction = jest.fn()
const deleteFunnelChecklistItemAction = jest.fn()
const loadFunnelCommentsAction = jest.fn()
const addFunnelCommentAction = jest.fn()
const deleteFunnelCommentAction = jest.fn()
const loadFunnelAttachmentsAction = jest.fn()
const loadFunnelStagesAction = jest.fn()
const loadFunnelDealConversationAction = jest.fn()
const loadFunnelStageSettingsAction = jest.fn()
const deleteFunnelStageAction = jest.fn()
jest.mock("actions/attende/funnel", () => ({
  loadFunnelPageAction: (...a: unknown[]) => loadFunnelPageAction(...a),
  loadFunnelContactsAction: (...a: unknown[]) => loadFunnelContactsAction(...a),
  moveFunnelDealAction: (...a: unknown[]) => moveFunnelDealAction(...a),
  loadFunnelFilterOptionsAction: (...a: unknown[]) => loadFunnelFilterOptionsAction(...a),
  loadFunnelContactAction: (...a: unknown[]) => loadFunnelContactAction(...a),
  updateFunnelContactAction: (...a: unknown[]) => updateFunnelContactAction(...a),
  updateFunnelDealAction: (...a: unknown[]) => updateFunnelDealAction(...a),
  loadFunnelChecklistAction: (...a: unknown[]) => loadFunnelChecklistAction(...a),
  addFunnelChecklistItemAction: (...a: unknown[]) => addFunnelChecklistItemAction(...a),
  updateFunnelChecklistItemAction: (...a: unknown[]) => updateFunnelChecklistItemAction(...a),
  deleteFunnelChecklistItemAction: (...a: unknown[]) => deleteFunnelChecklistItemAction(...a),
  loadFunnelCommentsAction: (...a: unknown[]) => loadFunnelCommentsAction(...a),
  addFunnelCommentAction: (...a: unknown[]) => addFunnelCommentAction(...a),
  deleteFunnelCommentAction: (...a: unknown[]) => deleteFunnelCommentAction(...a),
  loadFunnelAttachmentsAction: (...a: unknown[]) => loadFunnelAttachmentsAction(...a),
  loadFunnelStagesAction: (...a: unknown[]) => loadFunnelStagesAction(...a),
  loadFunnelDealConversationAction: (...a: unknown[]) => loadFunnelDealConversationAction(...a),
  loadFunnelStageSettingsAction: (...a: unknown[]) => loadFunnelStageSettingsAction(...a),
  deleteFunnelStageAction: (...a: unknown[]) => deleteFunnelStageAction(...a),
}))
jest.mock("lib/uploadDocumentDirect", () => ({ uploadDocumentDirect: jest.fn() }))

const ok = <T,>(data: T) => ({ success: true as const, data })

/** Renders the funnel the way the server does: the URL already says what the first render shows. */
function renderFunnel(init: FunnelInitial) {
  const qs = stateToSearchParams(init.state).toString()
  window.history.replaceState(null, "", qs ? `/funnel?${qs}` : "/funnel")
  return render(<FunnelView initial={init} />)
}
const state = (over: Partial<FunnelUrlState> = {}): FunnelUrlState => ({ ...DEFAULT_URL_STATE, ...over })
const initial = (p: FunnelPage | null, over: Partial<FunnelInitial> = {}): FunnelInitial => ({
  state: state(),
  stages: stagesData(),
  stagesError: null,
  deals: { page: p, error: null },
  contacts: null,
  ...over,
})

// `hidden`: while the drawer (a modal) is open, the page behind it is aria-hidden.
const table = () => screen.getByRole("table", { name: "Deals", hidden: true })
const chips = () => screen.getByRole("group", { name: "Filter by stage", hidden: true })
const dealRows = () => within(table()).getAllByTestId("funnel-row")
const dialog = () => screen.getByRole("dialog")

/** Opens a themed picker (Radix menu) from the keyboard and chooses an option. */
async function pick(trigger: string, option: string, role: "menuitemradio" | "menuitemcheckbox" = "menuitemradio") {
  fireEvent.keyDown(screen.getByRole("button", { name: trigger, hidden: true }), { key: "Enter" })
  fireEvent.click(await screen.findByRole(role, { name: option, hidden: true }))
}
const pickStage = (name: string) => pick("Move this deal to another stage", name)

beforeEach(() => {
  jest.clearAllMocks()
  // The option names are not what these tests are about; a pending promise keeps act() warnings out.
  loadFunnelFilterOptionsAction.mockReturnValue(new Promise(() => undefined))
  // The drawer's checklist and comments load in the background; tests that need them resolve them.
  loadFunnelChecklistAction.mockReturnValue(new Promise(() => undefined))
  loadFunnelCommentsAction.mockReturnValue(new Promise(() => undefined))
  loadFunnelDealConversationAction.mockReturnValue(new Promise(() => undefined))
  loadFunnelAttachmentsAction.mockReturnValue(new Promise(() => undefined))
  window.history.replaceState(null, "", "/funnel")
  window.localStorage.clear()
})

describe("FunnelView table", () => {
  it("renders the deals with their stage and the stage chips with counts", async () => {
    loadFunnelFilterOptionsAction.mockResolvedValue({ owners: [{ id: id(2000), name: "Owner" }], labels: [], sources: [], failed: false })
    renderFunnel(initial(page([row(1), row(2)])))
    expect(dealRows()).toHaveLength(2)
    expect(within(dealRows()[0]!).getByText("Ana 1")).toBeInTheDocument()
    expect(within(dealRows()[0]!).getByText("Stage 1")).toBeInTheDocument()
    const chips = screen.getByRole("group", { name: "Filter by stage" })
    expect(within(chips).getByRole("button", { name: /All stages/ })).toHaveAttribute("aria-pressed", "true")
    expect(within(chips).getByRole("button", { name: /Stage 2/ })).toHaveTextContent("4")
    expect(loadFunnelFilterOptionsAction).toHaveBeenCalledWith(id(8), id(9))
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    await pick("Owner", "Owner")
    expect(within(screen.getByRole("dialog", { name: "Filter deals" })).getByRole("button", { name: "Owner" })).toHaveTextContent("Owner")
  })

  it("shows the title when a deal has no contact", () => {
    renderFunnel(initial(page([row(1, { contact: null, title: "Walk-in lead" })])))
    expect(within(table()).getByText("Walk-in lead")).toBeInTheDocument()
    expect(within(table()).getByText("No contact")).toBeInTheDocument()
  })
})

describe("FunnelView URL state", () => {
  it("puts a stage filter in the URL and reloads from the first page", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(3)])))
    renderFunnel(initial(page([row(1)], { hasMore: true, nextCursor: "c1" })))
    fireEvent.click(within(screen.getByRole("group", { name: "Filter by stage" })).getByRole("button", { name: /Stage 2/ }))
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(1))
    const [filters, args] = loadFunnelPageAction.mock.calls[0]!
    expect(filters.stages).toEqual([stage(2).id])
    // A new filter starts a new walk: no cursor.
    expect(args).toMatchObject({ cursor: null, limit: 50 })
    expect(new URLSearchParams(window.location.search).get("stage")).toBe(stage(2).id)
    await waitFor(() => expect(within(table()).getByText("Ana 3")).toBeInTheDocument())
  })

  it("debounces the search and does not search with one character", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(4)])))
    renderFunnel(initial(page([row(1)])))
    const search = screen.getByRole("searchbox", { name: "Search the funnel" })
    fireEvent.change(search, { target: { value: "a" } })
    await act(async () => new Promise((r) => setTimeout(r, 450)))
    expect(loadFunnelPageAction).not.toHaveBeenCalled()
    fireEvent.change(search, { target: { value: "an" } })
    fireEvent.change(search, { target: { value: "ana" } })
    expect(loadFunnelPageAction).not.toHaveBeenCalled()
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(1))
    expect(loadFunnelPageAction.mock.calls[0]![0].q).toBe("ana")
    expect(new URLSearchParams(window.location.search).get("q")).toBe("ana")
  })

  it("applies the popover's filters on Apply and shows them as removable chips", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1)])))
    renderFunnel(initial(page([row(1)])))
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    const panel = screen.getByRole("dialog", { name: "Filter deals" })
    fireEvent.change(within(panel).getByLabelText("From"), { target: { value: "2026-10-01" } })
    // A draft: nothing loads until Apply.
    expect(loadFunnelPageAction).not.toHaveBeenCalled()
    fireEvent.click(within(panel).getByRole("button", { name: "Apply" }))
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(1))
    expect(loadFunnelPageAction.mock.calls[0]![0]).toMatchObject({ createdFrom: "2026-10-01" })
    expect(window.location.search).toContain("from=2026-10-01")
    expect(screen.queryByRole("dialog", { name: "Filter deals" })).toBeNull()
    expect(screen.getByRole("button", { name: "Filters, 1 on" })).toHaveTextContent("1")

    const chips = screen.getByRole("list", { name: "Active filters" })
    const chip = within(chips).getAllByRole("listitem")
    expect(chip.map((c) => c.textContent)).toEqual([expect.stringMatching(/^Created between: from /)])
    fireEvent.click(within(chips).getByRole("button", { name: /^Remove filter: Created between/ }))
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(2))
    expect(loadFunnelPageAction.mock.calls[1]![0]).toMatchObject({ createdFrom: null })
  })

  it("does not offer the conversation filters (no card list can apply them)", () => {
    renderFunnel(initial(page([row(1)])))
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    const panel = screen.getByRole("dialog", { name: "Filter deals" })
    expect(within(panel).queryByRole("group", { name: "Handling" })).toBeNull()
    expect(within(panel).queryByText("Channel")).toBeNull()
  })

  it("drops the draft when the popover closes without Apply", () => {
    renderFunnel(initial(page([row(1)])))
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    fireEvent.change(within(screen.getByRole("dialog", { name: "Filter deals" })).getByLabelText("From"), { target: { value: "2026-10-01" } })
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Filter deals" }), { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "Filter deals" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    expect(within(screen.getByRole("dialog", { name: "Filter deals" })).getByLabelText("From")).toHaveValue("")
    expect(loadFunnelPageAction).not.toHaveBeenCalled()
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull()
  })

  it("clears every popover filter from the popover and keeps the stage", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1)])))
    const filters = { ...DEFAULT_FILTERS, stages: [stage(2).id], assignee: id(9), createdFrom: "2026-10-01" }
    renderFunnel(initial(page([row(1)]), { state: state({ filters }) }))
    expect(within(screen.getByRole("list", { name: "Active filters" })).getAllByRole("listitem")).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: "Filters, 2 on" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "Filter deals" })).getByRole("button", { name: "Clear all" }))
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(1))
    expect(loadFunnelPageAction.mock.calls[0]![0]).toMatchObject({ stages: [stage(2).id], assignee: null, createdFrom: null })
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull()
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
  })

  it("clears everything from the chips row", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1)])))
    renderFunnel(initial(page([row(1)]), { state: state({ filters: { ...DEFAULT_FILTERS, stages: [stage(2).id], createdFrom: "2026-10-01" } }) }))
    const chipsRow = screen.getByRole("list", { name: "Active filters" }).parentElement!
    fireEvent.click(within(chipsRow).getByRole("button", { name: "Clear all" }))
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(1))
    expect(loadFunnelPageAction.mock.calls[0]![0]).toEqual(DEFAULT_FILTERS)
  })

  it("sorts from the sort button", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1)])))
    renderFunnel(initial(page([row(1)])))
    expect(screen.getByRole("button", { name: "Sort order: Recently updated first" })).toHaveTextContent("Newest first")
    await pick("Sort order: Recently updated first", "Least recently updated first")
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(1))
    expect(loadFunnelPageAction.mock.calls[0]![0].sort).toBe("updated_asc")
  })

  it("exports with the current filters", () => {
    renderFunnel(initial(page([row(1)]), { state: state({ filters: { ...DEFAULT_FILTERS, createdFrom: "2026-10-01" }, maskPhone: true }) }))
    const link = screen.getByRole("link", { name: /Export CSV/ })
    expect(link.getAttribute("href")).toBe("/funnel/export?from=2026-10-01&mask=1")
  })
})

describe("FunnelView load more", () => {
  it("keeps paging through partial pages until rows arrive", async () => {
    loadFunnelPageAction
      .mockResolvedValueOnce(ok(page([], { partial: true, hasMore: true, nextCursor: "c2" })))
      .mockResolvedValueOnce(ok(page([row(2)], { partial: false, hasMore: false, nextCursor: null })))
    renderFunnel(initial(page([row(1)], { partial: true, hasMore: true, nextCursor: "c1" })))
    // A short partial page is not the end.
    expect(screen.getByText(/Still searching/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    await waitFor(() => expect(dealRows()).toHaveLength(2))
    expect(loadFunnelPageAction.mock.calls.map((c) => c[1].cursor)).toEqual(["c1", "c2"])
    expect(screen.getByText(/That is everything/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull()
  })

  it("offers to keep looking when a partial first page is empty", async () => {
    loadFunnelPageAction.mockResolvedValueOnce(ok(page([row(7)])))
    renderFunnel(initial(page([], { partial: true, hasMore: true, nextCursor: "c1" }), { state: state({ filters: { ...DEFAULT_FILTERS, createdFrom: "2026-10-01" } }) }))
    expect(screen.queryByText("Nothing matches these filters")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    await waitFor(() => expect(within(table()).getByText("Ana 7")).toBeInTheDocument())
  })

  it("keeps the loaded rows when loading more fails", async () => {
    loadFunnelPageAction.mockResolvedValueOnce({ success: false, status: 500 })
    renderFunnel(initial(page([row(1)], { hasMore: true, nextCursor: "c1" })))
    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load more deals.")
    expect(dealRows()).toHaveLength(1)
  })

  it("renders only the visible rows past the virtualization threshold", () => {
    const rows = Array.from({ length: 250 }, (_, i) => row(i + 1))
    renderFunnel(initial(page(rows)))
    expect(screen.queryAllByTestId("funnel-row").length).toBeLessThan(250)
    expect(screen.getByText("250 deals loaded")).toBeInTheDocument()
  })
})

describe("FunnelView drawer", () => {
  it("opens the deal from ?deal= with an inbox link", () => {
    const r = row(2)
    renderFunnel(initial(page([row(1), r]), { state: state({ deal: r.cardId }) }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Ana 2" })).toBeInTheDocument()
    expect(within(dialog).getByText(`${r.contact!.phone!} · ${r.contact!.email!}`)).toBeInTheDocument()
    expect(within(dialog).getByText("WhatsApp · AI active")).toBeInTheDocument()
    const link = within(dialog).getByRole("link", { name: /Open conversation/ })
    expect(link.getAttribute("href")).toBe(`/inbox/${r.conversation!.id}?channel=whatsapp&sessionId=${id(6000)}`)
  })

  it("opens on row click and writes the deal into the URL", () => {
    renderFunnel(initial(page([row(1)])))
    fireEvent.click(screen.getByRole("button", { name: "Open details of Ana 1" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get("deal")).toBe(row(1).cardId)
  })

  it("explains when the linked deal is not in the loaded rows", () => {
    renderFunnel(initial(page([row(1)], { hasMore: true, nextCursor: "c1" }), { state: state({ deal: id(99) }) }))
    expect(within(screen.getByRole("dialog")).getByTestId("deal-not-loaded")).toHaveTextContent("This deal is not in the loaded list")
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Load more deals to look for it" })).toBeInTheDocument()
  })

  it("moves a deal optimistically and confirms it", async () => {
    let resolve: (v: unknown) => void = () => undefined
    moveFunnelDealAction.mockReturnValue(new Promise((r) => (resolve = r)))
    const r = row(1)
    renderFunnel(initial(page([r]), { state: state({ deal: r.cardId }) }))
    await pickStage("Stage 2")
    // Updated before the server answered.
    expect(within(dealRows()[0]!).getByText("Stage 2")).toBeInTheDocument()
    expect(moveFunnelDealAction).toHaveBeenCalledWith(r.cardId, stage(2).id)
    await act(async () => resolve(ok({ cardId: r.cardId, stage: stage(2) })))
    expect(within(screen.getByRole("dialog")).getByText("Moved to Stage 2")).toBeInTheDocument()
    expect(within(chips()).getByRole("button", { name: /Stage 1/, hidden: true })).toHaveTextContent("11")
    expect(within(chips()).getByRole("button", { name: /Stage 2/, hidden: true })).toHaveTextContent("5")
  })

  it("rolls the move back when the server refuses it", async () => {
    moveFunnelDealAction.mockResolvedValue({ success: false, status: 500 })
    const r = row(1)
    renderFunnel(initial(page([r]), { state: state({ deal: r.cardId }) }))
    await pickStage("Stage 3")
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("We could not move this deal. It is back in its stage.")
    expect(within(dealRows()[0]!).getByText("Stage 1")).toBeInTheDocument()
    expect(within(chips()).getByRole("button", { name: /Stage 1/, hidden: true })).toHaveTextContent("12")
  })

  it("says so when the user may not move deals on this board", async () => {
    moveFunnelDealAction.mockResolvedValue({ success: false, status: 403 })
    const r = row(1)
    renderFunnel(initial(page([r]), { state: state({ deal: r.cardId }) }))
    await pickStage("Stage 2")
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("You do not have permission to move deals in this funnel.")
  })
})

describe("FunnelView stage management", () => {
  it("removes a stage from the toolbar, moves its deals, then refreshes the chips and the table", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(
      ok({
        projectId: id(8),
        boardId: id(9),
        stages: [
          { id: stage(1).id, name: "Stage 1", kind: "open", boardIndex: "0" },
          { id: stage(2).id, name: "Stage 2", kind: "open", boardIndex: "1000" },
          { id: stage(3).id, name: "Stage 3", kind: "won", boardIndex: "2000" },
        ],
      })
    )
    deleteFunnelStageAction.mockResolvedValue(ok({ id: stage(2).id, moveTo: stage(1).id }))
    // The stages endpoint can still have the old count for a few seconds.
    loadFunnelStagesAction.mockResolvedValue(ok(stagesData({ stages: [{ ...stage(1), count: 12 }, { ...stage(3, { kind: "won" }), count: 2 }] })))
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1), row(2)])))
    renderFunnel(initial(page([row(1)])))

    fireEvent.click(screen.getByRole("button", { name: "Manage stages" }))
    const manager = await screen.findByRole("dialog", { name: "Funnel stages" })
    await waitFor(() => expect(within(manager).getAllByTestId("stage-row")).toHaveLength(3))
    fireEvent.click(within(manager).getByRole("button", { name: "Remove the stage Stage 2" }))
    const form = within(manager).getByRole("form", { name: "Remove the stage Stage 2" })
    expect(within(form).getByText("Stage 2 has 4 deals. They will move to the stage you choose.")).toBeInTheDocument()
    fireEvent.change(within(form).getByRole("combobox", { name: "Move its deals to" }), { target: { value: stage(1).id } })
    await act(async () => fireEvent.click(within(form).getByRole("button", { name: "Move deals and remove" })))

    expect(deleteFunnelStageAction).toHaveBeenCalledWith(stage(2).id, stage(1).id)
    await waitFor(() => expect(loadFunnelStagesAction).toHaveBeenCalled())
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalled())
    expect(within(chips()).queryByRole("button", { name: /Stage 2/, hidden: true })).toBeNull()
    // 12 + the 4 moved deals, even though the server's count has not caught up yet.
    await waitFor(() => expect(within(chips()).getByRole("button", { name: /Stage 1/, hidden: true })).toHaveTextContent("16"))
  })
})

describe("FunnelView empty and error states", () => {
  it("welcomes a brand-new funnel", () => {
    renderFunnel(initial(page([])))
    expect(screen.getByText("No deals in the funnel yet")).toBeInTheDocument()
  })

  it("offers to clear filters when nothing matches", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1)])))
    renderFunnel(initial(page([]), { state: state({ filters: { ...DEFAULT_FILTERS, label: id(3000) } }) }))
    expect(screen.getByText("Nothing matches these filters")).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "Clear filters" }))
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalled())
    expect(loadFunnelPageAction.mock.calls[0]![0]).toEqual(DEFAULT_FILTERS)
    expect(window.location.search).toBe("")
  })

  it("shows an error with a retry", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1)])))
    renderFunnel(initial(null, { deals: { page: null, error: { success: false, status: 500 } } }))
    expect(screen.getByText("We could not load the funnel.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(dealRows()).toHaveLength(1))
  })

  it("shows the plan gate when the subscription is not active", () => {
    renderFunnel(initial(null, { deals: { page: null, error: { success: false, status: 402, reference: "ATTENDE_TRIAL_EXPIRED" } } }))
    expect(screen.getByText("The funnel is paused")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/billing")
    expect(screen.queryByTestId("funnel-toolbar")).toBeNull()
  })

  it("explains a missing sales board", () => {
    renderFunnel(initial(null, { stages: null, stagesError: { success: false, status: 404 }, deals: { page: null, error: { success: false, status: 404 } } }))
    expect(screen.getByText("Your funnel is not set up yet")).toBeInTheDocument()
  })
})

describe("FunnelView contacts tab", () => {
  it("loads the contacts when the tab opens and jumps to a contact's latest deal", async () => {
    loadFunnelContactsAction.mockResolvedValue(ok({ items: [contact(1, { email: "c1@x.com" })], nextCursor: null, hasMore: false }))
    loadFunnelPageAction.mockResolvedValue(ok(page([row(1)])))
    renderFunnel(initial(page([row(1)])))
    fireEvent.click(screen.getByRole("tab", { name: "Contacts" }))
    await waitFor(() => expect(screen.getAllByTestId("funnel-contact-row")).toHaveLength(1))
    expect(loadFunnelContactsAction).toHaveBeenCalledWith("", { cursor: null, limit: 50, maskPhone: false })
    expect(window.location.search).toBe("?tab=contacts")
    const entries = window.history.length
    fireEvent.click(screen.getByRole("button", { name: "Open the latest deal of Contact 1" }))
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalled())
    expect(loadFunnelPageAction.mock.calls[0]![0].q).toBe("c1@x.com")
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Ana 1" })).toBeInTheDocument())
    // A new history entry: Back returns to the contacts list.
    expect(window.history.length).toBe(entries + 1)
    act(() => {
      window.history.replaceState(null, "", "/funnel?tab=contacts&q=ana")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    expect(screen.getByRole("tab", { name: "Contacts" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("searchbox", { name: "Search the funnel" })).toHaveValue("ana")
    await waitFor(() => expect(loadFunnelContactsAction).toHaveBeenLastCalledWith("ana", { cursor: null, limit: 50, maskPhone: false }))
  })

  it("shows what a contact is missing, and a contact known only by its phone", () => {
    renderFunnel(
      initial(null, {
        state: state({ tab: "contacts" }),
        deals: null,
        contacts: {
          page: { items: [contact(1, { phone: null, email: null }), contact(2, { name: null, phone: "+5511988887777", email: null, deals: { total: 1, open: 1, won: 0, lost: 0 } })], nextCursor: null, hasMore: false },
          error: null,
        },
      })
    )
    const [first, second] = screen.getAllByTestId("funnel-contact-row")
    expect(within(first!).getByText("No phone or e-mail")).toBeInTheDocument()
    expect(within(second!).getAllByText("+5511988887777")).toHaveLength(2)
    expect(within(second!).getByText("No e-mail")).toBeInTheDocument()
    expect(within(second!).queryByText("No phone or e-mail")).toBeNull()
    expect(within(second!).getByText("1 deal (1 open)")).toBeInTheDocument()
    expect(within(first!).getByText("2 deals (1 open)")).toBeInTheDocument()
    expect(screen.getByText("2 contacts loaded")).toBeInTheDocument()
  })

  it("shows the contacts empty state", async () => {
    loadFunnelContactsAction.mockResolvedValue(ok({ items: [], nextCursor: null, hasMore: false }))
    renderFunnel(initial(null, { state: state({ tab: "contacts" }), deals: null, contacts: { page: { items: [], nextCursor: null, hasMore: false }, error: null } }))
    expect(screen.getByText("No contacts yet")).toBeInTheDocument()
    expect(loadFunnelContactsAction).not.toHaveBeenCalled()
  })
})

describe("FunnelView deal details", () => {
  const r = row(1)
  const ref = { projectId: id(8), boardId: id(9), cardId: r.cardId }
  const openDrawer = (over: Partial<FunnelInitial> = {}) => renderFunnel(initial(page([r, row(2)]), { state: state({ deal: r.cardId }), ...over }))

  it("hides the labels column by default and shows it from the Columns popover", () => {
    renderFunnel(initial(page([r])))
    const headers = () => within(table()).getAllByRole("columnheader").map((h) => h.textContent)
    expect(headers()).toEqual(["Contact", "Stage", "Deal value", "Owner", "Last message"])
    fireEvent.click(screen.getByRole("button", { name: "Choose the fields to show" }))
    const panel = screen.getByRole("dialog", { name: "Fields" })
    expect(within(panel).getByRole("checkbox", { name: "Contact" })).toBeDisabled()
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Labels" }))
    expect(headers()).toEqual(["Contact", "Stage", "Deal value", "Owner", "Labels", "Last message"])
    expect(JSON.parse(window.localStorage.getItem("attende.funnel.columns.v2")!)).toContain("labels")
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Owner" }))
    expect(headers()).not.toContain("Owner")
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Hide phone numbers" }))
    expect(window.location.search).toContain("mask=1")
  })

  it("edits the contact with the stored values and shows the new name everywhere", async () => {
    loadFunnelContactAction.mockResolvedValue(ok({ name: "Ana 1", phone: "+5511900000001", email: "ana1@x.com" }))
    updateFunnelContactAction.mockImplementation(async (_id: string, draft: unknown) => ok(draft))
    openDrawer()
    fireEvent.click(within(dialog()).getByRole("button", { name: "Edit contact" }))
    const name = await within(dialog()).findByLabelText("Name")
    await waitFor(() => expect(name).toHaveValue("Ana 1"))
    fireEvent.change(name, { target: { value: "Ana Maria" } })
    fireEvent.change(within(dialog()).getByLabelText("E-mail"), { target: { value: "ana.maria@x.com" } })
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateFunnelContactAction).toHaveBeenCalledWith(r.contact!.id, { name: "Ana Maria", phone: "+5511900000001", email: "ana.maria@x.com" }))
    expect(loadFunnelContactAction).toHaveBeenCalledWith(r.contact!.id)
    await waitFor(() => expect(within(dialog()).getByRole("heading", { name: "Ana Maria" })).toBeInTheDocument())
    expect(within(dealRows()[0]!).getByText("Ana Maria")).toBeInTheDocument()
    expect(within(dialog()).queryByTestId("contact-form")).toBeNull()
  })

  it("does not save an invalid e-mail and says why", async () => {
    loadFunnelContactAction.mockResolvedValue(ok({ name: "Ana 1", phone: "", email: "" }))
    openDrawer()
    fireEvent.click(within(dialog()).getByRole("button", { name: "Edit contact" }))
    const email = await within(dialog()).findByLabelText("E-mail")
    await waitFor(() => expect(email).not.toBeDisabled())
    fireEvent.change(email, { target: { value: "not-an-email" } })
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }))
    expect(await within(dialog()).findByText("Enter a valid e-mail.")).toBeInTheDocument()
    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(updateFunnelContactAction).not.toHaveBeenCalled()
  })

  it("edits the deal value and rolls back when it comes from products", async () => {
    updateFunnelDealAction.mockResolvedValueOnce(ok({ cardId: r.cardId })).mockResolvedValueOnce({ success: false, status: 409, reference: "FUNNEL_VALUE_FROM_PRODUCTS" })
    openDrawer()
    fireEvent.click(within(dialog()).getByRole("button", { name: "Edit deal value" }))
    fireEvent.change(within(dialog()).getByLabelText("Deal value (BRL)"), { target: { value: "1.500,00" } })
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateFunnelDealAction).toHaveBeenCalledWith(ref, { value: 1500 }))
    expect(await within(dialog()).findByText("Saved")).toBeInTheDocument()
    expect(within(dealRows()[0]!).getByText(/1[.,]500/)).toBeInTheDocument()

    fireEvent.click(within(dialog()).getByRole("button", { name: "Edit deal value" }))
    fireEvent.change(within(dialog()).getByLabelText("Deal value (BRL)"), { target: { value: "99" } })
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }))
    expect(await within(dialog()).findByRole("alert")).toHaveTextContent("total of the deal's products")
    expect(within(dealRows()[0]!).getByText(/1[.,]500/)).toBeInTheDocument()
  })

  it("changes the owner and the labels from the drawer", async () => {
    loadFunnelFilterOptionsAction.mockResolvedValue({
      owners: [
        { id: id(2000), name: "Owner" },
        { id: id(2001), name: "Bruno" },
      ],
      labels: [
        { id: id(3000), name: "VIP", color: "#ffaa00" },
        { id: id(3001), name: "Hot", color: null },
      ],
      sources: [],
      failed: false,
    })
    updateFunnelDealAction.mockResolvedValue(ok({ cardId: r.cardId }))
    openDrawer()
    await waitFor(() => expect(loadFunnelFilterOptionsAction).toHaveBeenCalled())
    await pick("Change the owner", "Bruno")
    await waitFor(() => expect(updateFunnelDealAction).toHaveBeenCalledWith(ref, { ownerId: id(2001) }))
    expect(within(dealRows()[0]!).getByText("Bruno")).toBeInTheDocument()
    await pick("Change the labels", "Hot", "menuitemcheckbox")
    await waitFor(() => expect(updateFunnelDealAction).toHaveBeenLastCalledWith(ref, { labelIds: [id(3000), id(3001)] }))
  })

  it("runs the checklist: check, add, rename and delete", async () => {
    loadFunnelChecklistAction.mockResolvedValue(ok([{ id: id(7001), title: "Send proposal", done: false }]))
    updateFunnelChecklistItemAction.mockResolvedValue(ok({ id: id(7001) }))
    addFunnelChecklistItemAction.mockResolvedValue(ok({ id: id(7002), title: "Call back", done: false }))
    deleteFunnelChecklistItemAction.mockResolvedValue(ok({ id: id(7001) }))
    openDrawer()
    const box = await within(dialog()).findByRole("checkbox", { name: "Send proposal" })
    expect(loadFunnelChecklistAction).toHaveBeenCalledWith(ref)
    fireEvent.click(box)
    expect(box).toBeChecked()
    expect(updateFunnelChecklistItemAction).toHaveBeenCalledWith(ref, id(7001), { title: undefined, done: true })
    expect(within(dialog()).getByText("1 of 1 done")).toBeInTheDocument()

    fireEvent.change(within(dialog()).getByRole("textbox", { name: "New checklist item" }), { target: { value: "Call back" } })
    fireEvent.click(within(dialog()).getByRole("button", { name: "Add" }))
    expect(await within(dialog()).findByRole("checkbox", { name: "Call back" })).toBeInTheDocument()
    expect(addFunnelChecklistItemAction).toHaveBeenCalledWith(ref, "Call back", 10)

    fireEvent.click(within(dialog()).getByRole("button", { name: "Rename Send proposal" }))
    const input = within(dialog()).getByRole("textbox", { name: "Rename Send proposal" })
    fireEvent.change(input, { target: { value: "Send the proposal" } })
    fireEvent.keyDown(input, { key: "Enter" })
    await waitFor(() => expect(updateFunnelChecklistItemAction).toHaveBeenLastCalledWith(ref, id(7001), { title: "Send the proposal", done: undefined }))
    expect(within(dialog()).getByRole("checkbox", { name: "Send the proposal" })).toBeInTheDocument()

    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete Send the proposal" }))
    await waitFor(() => expect(within(dialog()).queryByRole("checkbox", { name: "Send the proposal" })).toBeNull())
    expect(deleteFunnelChecklistItemAction).toHaveBeenCalledWith(ref, id(7001))
  })

  it("unchecks the item again when saving fails", async () => {
    loadFunnelChecklistAction.mockResolvedValue(ok([{ id: id(7001), title: "Send proposal", done: false }]))
    updateFunnelChecklistItemAction.mockResolvedValue({ success: false, status: 500 })
    openDrawer()
    const box = await within(dialog()).findByRole("checkbox", { name: "Send proposal" })
    fireEvent.click(box)
    expect(await within(dialog()).findByRole("alert")).toHaveTextContent("We could not save the checklist.")
    expect(box).not.toBeChecked()
  })

  it("lists comments, adds one and deletes only your own", async () => {
    loadFunnelCommentsAction.mockResolvedValue(
      ok({
        items: [
          { id: id(8001), text: "Mine", authorName: "Me", authorAvatar: null, createdAt: "2026-10-22T09:00:00.000Z", mine: true },
          { id: id(8002), text: "From Bruno", authorName: "Bruno", authorAvatar: null, createdAt: "2026-10-21T09:00:00.000Z", mine: false },
        ],
        hasMore: false,
      })
    )
    addFunnelCommentAction.mockResolvedValue(ok({ id: id(8003), text: "Called, waiting", authorName: "Me", authorAvatar: null, createdAt: "2026-10-22T11:00:00.000Z", mine: true }))
    deleteFunnelCommentAction.mockResolvedValue(ok({ id: id(8001) }))
    openDrawer()
    await within(dialog()).findByText("From Bruno")
    expect(loadFunnelCommentsAction).toHaveBeenCalledWith(ref, 1)
    const comments = () => within(dialog()).getAllByTestId("deal-comment")
    expect(within(comments()[1]!).queryByRole("button", { name: "Delete comment" })).toBeNull()

    fireEvent.change(within(dialog()).getByRole("textbox", { name: "New comment" }), { target: { value: "Called, waiting" } })
    fireEvent.click(within(dialog()).getByRole("button", { name: "Comment" }))
    await waitFor(() => expect(comments()).toHaveLength(3))
    expect(addFunnelCommentAction).toHaveBeenCalledWith(ref, "Called, waiting")
    expect(within(comments()[0]!).getByText("Called, waiting")).toBeInTheDocument()

    fireEvent.click(within(comments()[1]!).getByRole("button", { name: "Delete comment" }))
    fireEvent.click(within(comments()[1]!).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(comments()).toHaveLength(2))
    expect(deleteFunnelCommentAction).toHaveBeenCalledWith(ref, id(8001))
  })
})

describe("FunnelView presentation", () => {
  it("translates the seeded stage names and keeps the user's own as written", () => {
    const seeded = stage(1, { name: "Em Negociação" })
    const custom = stage(2, { name: "Visita agendada" })
    renderFunnel(
      initial(page([row(1, { stage: seeded }), row(2, { stage: custom })]), {
        stages: stagesData({ stages: [{ ...seeded, count: 3 }, { ...custom, count: 1 }], total: 4 }),
      })
    )
    expect(within(dealRows()[0]!).getByText("In negotiation")).toBeInTheDocument()
    expect(within(dealRows()[1]!).getByText("Visita agendada")).toBeInTheDocument()
    expect(within(chips()).getByRole("button", { name: "In negotiation, 3 deals" })).toBeInTheDocument()
    expect(within(chips()).getByRole("button", { name: "Visita agendada, 1 deal" })).toBeInTheDocument()
    expect(within(chips()).getByRole("button", { name: "All stages, 4 deals" })).toBeInTheDocument()
  })

  it("says 'No value' for a deal without one, keeps a real zero and the deal's own currency", () => {
    renderFunnel(
      initial(
        page([
          row(1, { deal: null, owner: null }),
          row(2, { deal: { value: 0, currency: "BRL", status: "open" } }),
          row(3, { deal: { value: 1500, currency: "EUR", status: "open" } }),
        ])
      )
    )
    const [noValue, zero, euros] = dealRows()
    expect(within(noValue!).getByText("No value")).toBeInTheDocument()
    expect(within(noValue!).getByText("No owner")).toBeInTheDocument()
    expect(within(zero!).getByText("R$0.00")).toBeInTheDocument()
    expect(within(euros!).getByText("€1,500.00")).toBeInTheDocument()
  })

  it("names a contact by its phone when it has no name, and says when phone and e-mail are both missing", () => {
    const bare = row(1, { title: "", contact: { id: id(1001), name: null, phone: null, email: null, avatarUrl: null } })
    const phoneOnly = row(2, { title: "", contact: { id: id(1002), name: null, phone: "+5511977776666", email: null, avatarUrl: null } })
    renderFunnel(initial(page([bare, phoneOnly]), { state: state({ deal: bare.cardId }) }))
    expect(within(dialog()).getByRole("heading", { name: "No name" })).toBeInTheDocument()
    expect(within(dialog()).getByText("No phone or e-mail")).toBeInTheDocument()
    expect(within(dealRows()[1]!).getByText("+5511977776666")).toBeInTheDocument()
  })

  it("falls back to the initials when a photo does not load", () => {
    renderFunnel(initial(page([row(1, { contact: { ...row(1).contact!, name: "Ana Souza", avatarUrl: "https://cdn.example.com/ana.png" } })])))
    const avatar = within(dealRows()[0]!).getAllByTestId("avatar")[0]!
    const img = avatar.querySelector("img")!
    expect(img).toHaveAttribute("src", "https://cdn.example.com/ana.png")
    fireEvent.error(img)
    expect(avatar.querySelector("img")).toBeNull()
    expect(avatar).toHaveTextContent("AS")
  })

  it("never renders a non-web avatar URL", () => {
    renderFunnel(initial(page([row(1, { contact: { ...row(1).contact!, avatarUrl: "javascript:alert(1)" } })])))
    expect(within(dealRows()[0]!).getAllByTestId("avatar")[0]!.querySelector("img")).toBeNull()
  })

  it("shows the handling with the glossary words", () => {
    renderFunnel(initial(page([row(1, { conversation: { ...row(1).conversation!, handling: "human" } })]), { state: state({ deal: row(1).cardId }) }))
    expect(within(dialog()).getByText("WhatsApp · Human handling")).toBeInTheDocument()
  })

  it("asks for the deal's conversation when the list row has none", async () => {
    const r = row(1)
    loadFunnelDealConversationAction.mockResolvedValueOnce(ok({ ...r.conversation!, channel: "sms", handling: "human" }))
    renderFunnel(initial(page([{ ...r, conversation: null }]), { state: state({ deal: r.cardId }) }))
    expect(await within(dialog()).findByText("SMS · Human handling")).toBeInTheDocument()
    expect(loadFunnelDealConversationAction).toHaveBeenCalledWith(r.cardId)
  })
})

describe("FunnelView coming back", () => {
  afterEach(() => window.sessionStorage.clear())

  it("follows the URL when the server render was made for another URL (back / forward cache)", async () => {
    loadFunnelPageAction.mockResolvedValue(ok(page([row(5)])))
    window.history.replaceState(null, "", `/funnel?stage=${stage(2).id}&sort=updated_asc`)
    render(<FunnelView initial={initial(page([row(1)]))} />)
    await waitFor(() => expect(loadFunnelPageAction).toHaveBeenCalledTimes(1))
    expect(loadFunnelPageAction.mock.calls[0]![0]).toMatchObject({ stages: [stage(2).id], sort: "updated_asc" })
    expect(window.location.search).toBe(`?stage=${stage(2).id}&sort=updated_asc`)
    expect(within(chips()).getByRole("button", { name: /Stage 2/ })).toHaveAttribute("aria-pressed", "true")
    await waitFor(() => expect(within(table()).getByText("Ana 5")).toBeInTheDocument())
  })

  it("remembers how far the list went when it unmounts", () => {
    const view = renderFunnel(initial(page([row(1), row(2)]), { state: state({ filters: { ...DEFAULT_FILTERS, q: "ana" } }) }))
    const box = table().parentElement!
    box.scrollTop = 640
    fireEvent.scroll(box)
    view.unmount()
    const saved = JSON.parse(window.sessionStorage.getItem("attende.funnel.position.v1") ?? "null")
    expect(saved).toMatchObject({ key: "q=ana", tab: "deals", count: 2, scrollTop: 640 })
  })

  it("loads as many rows as before and scrolls back", async () => {
    window.sessionStorage.setItem("attende.funnel.position.v1", JSON.stringify({ key: "", tab: "deals", count: 4, scrollTop: 900, savedAt: Date.now() }))
    loadFunnelPageAction.mockResolvedValueOnce(ok(page([row(3), row(4)], { hasMore: true, nextCursor: "c2" })))
    renderFunnel(initial(page([row(1), row(2)], { hasMore: true, nextCursor: "c1" })))
    await waitFor(() => expect(dealRows()).toHaveLength(4))
    expect(loadFunnelPageAction).toHaveBeenCalledTimes(1)
    expect(loadFunnelPageAction.mock.calls[0]![1]).toMatchObject({ cursor: "c1" })
    await waitFor(() => expect(table().parentElement!.scrollTop).toBe(900))
    expect(window.sessionStorage.getItem("attende.funnel.position.v1")).toBeNull()
  })

  it("ignores a position saved for another list", () => {
    window.sessionStorage.setItem("attende.funnel.position.v1", JSON.stringify({ key: "q=bruno", tab: "deals", count: 100, scrollTop: 900, savedAt: Date.now() }))
    renderFunnel(initial(page([row(1)], { hasMore: true, nextCursor: "c1" })))
    expect(loadFunnelPageAction).not.toHaveBeenCalled()
    expect(table().parentElement!.scrollTop).toBe(0)
  })
})

describe("FunnelView export", () => {
  const realFetch = global.fetch
  const realCreate = URL.createObjectURL
  afterEach(() => {
    global.fetch = realFetch
    URL.createObjectURL = realCreate
  })

  it("says why the export failed instead of downloading the error", async () => {
    URL.createObjectURL = jest.fn(() => "blob:x")
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 402, json: async () => ({ reference: "ATTENDE_TRIAL_EXPIRED" }) }) as unknown as typeof fetch
    renderFunnel(initial(page([row(1)])))
    fireEvent.click(screen.getByRole("link", { name: /Export CSV/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Export is not available while your subscription is not active.")
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it("downloads the file when the export works", async () => {
    URL.createObjectURL = jest.fn(() => "blob:x")
    URL.revokeObjectURL = jest.fn()
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["a,b"]), headers: new Headers({ "content-disposition": 'attachment; filename="funil.csv"' }) }) as unknown as typeof fetch
    renderFunnel(initial(page([row(1)])))
    fireEvent.click(screen.getByRole("link", { name: /Export CSV/ }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith("/funnel/export?", { credentials: "same-origin" })
    expect(screen.queryByRole("alert")).toBeNull()
    click.mockRestore()
  })
})
