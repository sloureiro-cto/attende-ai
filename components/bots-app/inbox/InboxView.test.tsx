import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DEFAULT_INBOX_FILTERS, type InboxFilters, type InboxItem } from "lib/bots-app/inbox/model"
import { InboxView } from "./InboxView"

type SocketOptions = {
  onNewInboundMessage?: (p: Record<string, unknown>) => void
  onConversationLastMessageUpdated?: (p: Record<string, unknown>) => void
}
let socketOptions: SocketOptions = {}
const sendPresence = jest.fn()

jest.mock("actions/whatsapp-lite/conversations", () => ({ sendWhatsAppTemplateAction: jest.fn() }))
jest.mock("actions/whatsapp-lite/sessions", () => ({ getWhatsAppSessionAction: jest.fn() }))
jest.mock("actions/whatsapp-lite/cloudTemplates", () => ({ listCloudTemplatesAction: jest.fn() }))
jest.mock("hooks/useMessagingInboxSocket", () => ({
  useMessagingInboxSocket: (options: SocketOptions) => {
    socketOptions = options
    return { isConnected: true, sendPresence }
  },
}))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "me", workspaceId: "w1" } } }) }))
const showToast = jest.fn()
jest.mock("app/utils/showToast", () => ({ showToast: (...args: unknown[]) => showToast(...args) }))

const loadInboxPageAction = jest.fn()
const loadThreadAction = jest.fn()
const sendMessageAction = jest.fn()
const markReadAction = jest.fn()
const setHandlingAction = jest.fn()
const loadInboxItemAction = jest.fn()
const loadInboxOverviewAction = jest.fn()
jest.mock("lib/bots-app/inbox/actions", () => ({
  loadInboxItemAction: (...a: unknown[]) => loadInboxItemAction(...a),
  loadInboxOverviewAction: (...a: unknown[]) => loadInboxOverviewAction(...a),
  loadInboxPageAction: (...a: unknown[]) => loadInboxPageAction(...a),
  loadThreadAction: (...a: unknown[]) => loadThreadAction(...a),
  sendMessageAction: (...a: unknown[]) => sendMessageAction(...a),
  markReadAction: (...a: unknown[]) => markReadAction(...a),
  setHandlingAction: (...a: unknown[]) => setHandlingAction(...a),
}))

/** The list re-queries after a 300ms debounce; give slow CI machines room. */
const SLOW = { timeout: 4000 }

const item = (id: string, over: Partial<InboxItem> = {}): InboxItem => ({
  key: `whatsapp::s1::${id}`,
  channel: "whatsapp",
  sessionId: "s1",
  sessionLabel: "Main line",
  conversationId: id,
  name: `Customer ${id}`,
  phone: null,
  username: null,
  avatarUrl: null,
  preview: `hello ${id}`,
  lastAt: "2026-10-22T10:00:00Z",
  lastDirection: "inbound",
  lastInboundAt: "2026-10-22T10:00:00Z",
  unread: false,
  handling: "ai",
  agentName: "Sofia",
  state: "qualifying",
  assignedUserName: null,
  crmProjectId: null,
  crmColumnId: null,
  crmTitle: null,
  linkedCardId: null,
  labels: [],
  isGroup: false,
  ...over,
})

const msg = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  direction: "inbound",
  author: "contact",
  authorName: null,
  text: `text ${id}`,
  at: "2026-10-22T10:00:00Z",
  status: "read",
  mediaType: null,
  mediaUrl: null,
  fileName: null,
  deleted: false,
  error: null,
  ...over,
})

const initialPage = { items: [item("c1"), item("c2", { handling: "human", state: "human_handoff", agentName: null })], nextCursor: null, hasMore: false }

function setup(overrides: { selected?: InboxItem | null; filters?: InboxFilters } = {}) {
  return render(
    <InboxView
      initialPage={initialPage}
      overview={{ unread: 2, needsReply: 1, stageTitles: {} }}
      transports={{ s1: "baileys" }}
      initialSelected={overrides.selected ?? null}
      initialFilters={overrides.filters}
    />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  socketOptions = {}
  window.history.replaceState(null, "", "/inbox")
  loadInboxOverviewAction.mockResolvedValue({ success: true, data: { unread: 2, needsReply: 1, stageTitles: {} } })
  // After a confirmed transition the row is re-read: by default the server echoes what was asked.
  setHandlingAction.mockImplementation(async (_c: string, id: string, mode: string) => {
    loadInboxItemAction.mockResolvedValue({
      success: true,
      data: item(id, mode === "human" ? { handling: "human", state: "human_handoff", agentName: null } : { handling: "ai", state: "qualifying" }),
    })
    return { success: true, data: true }
  })
  loadInboxPageAction.mockResolvedValue({ success: true, data: { items: [], nextCursor: null, hasMore: false } })
  loadThreadAction.mockResolvedValue({
    success: true,
    data: {
      messages: [
        msg("m1"),
        msg("m2", { direction: "outbound", author: "ai", authorName: "Sofia", text: "How can I help?" }),
        msg("m3", { direction: "outbound", author: "human", authorName: "Bia", text: "I will take it from here" }),
      ],
      hasMore: false,
    },
  })
  markReadAction.mockResolvedValue({ success: true, data: true })
  sendMessageAction.mockResolvedValue({ success: true, data: msg("srv1", { direction: "outbound", author: "human", text: "Hi there", status: "sent" }) })
})

describe("InboxView: list and filters", () => {
  it("shows the conversations and who is handling each", () => {
    setup()
    expect(screen.getByText("Customer c1")).toBeInTheDocument()
    expect(screen.getByText("Customer c2")).toBeInTheDocument()
    const rows = within(screen.getAllByRole("list")[0]!).getAllByRole("listitem")
    expect(within(rows[0]!).getByTitle("AI active")).toBeInTheDocument()
    expect(within(rows[1]!).getByTitle("Human handling")).toBeInTheDocument()
  })

  it("says what the tab counts count and explains each criterion", () => {
    setup()
    expect(screen.getByRole("button", { name: "Unread: 2 conversations across all your channels" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Waiting for team: 1 conversation across all your channels" })).toHaveAttribute(
      "title",
      "The customer's last message has no reply yet, from the team or the AI."
    )
    expect(screen.getByTestId("list-count")).toHaveTextContent("2 conversations")
  })

  it("does not show counts as zero when they could not be loaded", () => {
    render(<InboxView initialPage={initialPage} overview={null} transports={{}} initialSelected={null} />)
    expect(screen.getByRole("button", { name: "Unread" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Waiting for team" })).toBeInTheDocument()
  })

  it("opens filtered from the URL (?filter=) and keeps filter changes in the URL", async () => {
    setup({ filters: { ...DEFAULT_INBOX_FILTERS, filter: "ai" } })
    expect(screen.getByRole("button", { name: "Filters (1 on)" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /^Waiting for team/ }))
    await waitFor(() => expect(window.location.search).toBe("?filter=needs_reply"))
    await userEvent.setup().click(screen.getByRole("button", { name: "Filters" }))
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: /SMS/ }))
    await waitFor(() => expect(window.location.search).toBe("?channel=sms&filter=needs_reply"))
  })

  it("re-queries the server with the chosen filter and channel", async () => {
    setup()
    fireEvent.click(screen.getByRole("button", { name: /^Unread/ }))
    await waitFor(() => expect(loadInboxPageAction).toHaveBeenCalledWith(expect.objectContaining({ filter: "unread", channel: "all" }), null), SLOW)
    await userEvent.setup().click(screen.getByRole("button", { name: "Filters" }))
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: /Instagram/ }))
    await waitFor(() => expect(loadInboxPageAction).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "unread", channel: "instagram" }), null), SLOW)
  })

  it("explains an empty result for the active filters and lets you clear them", async () => {
    setup()
    fireEvent.click(screen.getByRole("button", { name: /^Waiting for team/ }))
    expect(await screen.findByText("Nothing matches these filters", {}, SLOW)).toBeInTheDocument()
    loadInboxPageAction.mockResolvedValue({ success: true, data: { items: initialPage.items, nextCursor: null, hasMore: false } })
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(await screen.findByText("Customer c1", {}, SLOW)).toBeInTheDocument()
  })
})

describe("InboxView: thread", () => {
  it("tells AI replies, team replies and customer messages apart", async () => {
    setup()
    fireEvent.click(screen.getByText("Customer c1"))
    expect(await screen.findByText("How can I help?")).toBeInTheDocument()
    expect(screen.getByText("Sofia (AI)")).toBeInTheDocument()
    expect(screen.getByText("Bia")).toBeInTheDocument()
    expect(screen.getByText("text m1")).toBeInTheDocument()
    expect(markReadAction).toHaveBeenCalledWith("whatsapp", "s1", "c1")
  })

  it("take over and return to the AI show the state the backend confirmed", async () => {
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    const bar = () => within(screen.getByRole("region", { name: "Who answers this conversation" }))
    expect(bar().getByTestId("handling-state")).toHaveTextContent("AI active")
    expect(bar().getByText(/Sofia answers in this conversation/)).toBeInTheDocument()
    expect(bar().getByRole("link", { name: "AI agents" })).toHaveAttribute("href", "/ai-agents")
    fireEvent.click(bar().getByRole("button", { name: "Take over" }))
    // Pending: the confirmed state stays until the server answers.
    expect(bar().getByRole("button", { name: "Taking over…" })).toBeDisabled()
    expect(bar().getByTestId("handling-state")).toHaveTextContent("AI active")
    await waitFor(() => expect(bar().getByTestId("handling-state")).toHaveTextContent("Human handling"))
    expect(setHandlingAction).toHaveBeenCalledWith("whatsapp", "c1", "human")
    expect(loadInboxItemAction).toHaveBeenCalledWith("c1")
    fireEvent.click(bar().getByRole("button", { name: "Return to AI" }))
    await waitFor(() => expect(bar().getByTestId("handling-state")).toHaveTextContent("AI active"))
    expect(setHandlingAction).toHaveBeenLastCalledWith("whatsapp", "c1", "ai")
  })

  it("returning to the AI with no agent on the channel says so instead of claiming the AI is back", async () => {
    setHandlingAction.mockResolvedValue({ success: true, data: true })
    loadInboxItemAction.mockResolvedValue({ success: true, data: item("c2", { handling: "none", state: "qualifying", agentName: null }) })
    setup({ selected: initialPage.items[1]! })
    await screen.findByText("How can I help?")
    fireEvent.click(screen.getByRole("button", { name: "Return to AI" }))
    await waitFor(() => expect(screen.getByTestId("handling-state")).toHaveTextContent("No AI"))
    expect(showToast).toHaveBeenCalledWith("warning", "The conversation left human handling, but no AI agent covers this channel.")
  })

  it("writing while the AI is active takes the conversation over before sending", async () => {
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    const field = screen.getByRole("textbox", { name: "Message" })
    expect(field).toHaveAttribute("placeholder", "AI active. Sending takes the conversation over…")
    fireEvent.change(field, { target: { value: "Hi, Ana here" } })
    fireEvent.keyDown(field, { key: "Enter" })
    await waitFor(() => expect(setHandlingAction).toHaveBeenCalledWith("whatsapp", "c1", "human"))
    await waitFor(() => expect(sendMessageAction).toHaveBeenCalled())
  })

  it("does not send, and gives the text back, when taking over fails", async () => {
    setHandlingAction.mockResolvedValue({ success: false, error: "failed" })
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    const field = screen.getByRole("textbox", { name: "Message" })
    fireEvent.change(field, { target: { value: "Hi, Ana here" } })
    fireEvent.keyDown(field, { key: "Enter" })
    await waitFor(() => expect(field).toHaveValue("Hi, Ana here"))
    expect(sendMessageAction).not.toHaveBeenCalled()
  })

  it("keeps the confirmed state and explains when the change is refused", async () => {
    setHandlingAction.mockResolvedValue({ success: false, error: "not_allowed" })
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    fireEvent.click(screen.getByRole("button", { name: "Take over" }))
    const message = "This conversation's phase (Qualifying) does not allow this change."
    expect(await screen.findByRole("alert")).toHaveTextContent(message)
    expect(showToast).toHaveBeenCalledWith("error", message)
    expect(screen.getByTestId("handling-state")).toHaveTextContent("AI active")
    expect(screen.getByRole("button", { name: "Take over" })).toBeEnabled()
  })

  it("replaces the composer with the template option on an official line after 24h", async () => {
    const stale = item("c1", { lastInboundAt: "2020-01-01T00:00:00Z" })
    render(<InboxView initialPage={{ ...initialPage, items: [stale] }} overview={null} transports={{ s1: "cloud_api" }} initialSelected={stale} />)
    expect(await screen.findByText("The 24-hour window is closed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send a template" })).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Message" })).not.toBeInTheDocument()
  })
})

describe("InboxView: contact details", () => {
  it("renames the ambiguous fields and links to the funnel deal", async () => {
    const linked = item("c1", { crmTitle: "Ana - Plano anual", crmColumnId: "col1", linkedCardId: "card1", state: "negotiating" })
    render(
      <InboxView
        initialPage={{ ...initialPage, items: [linked] }}
        overview={{ unread: 0, needsReply: 0, stageTitles: { col1: "Proposal" } }}
        transports={{}}
        initialSelected={linked}
      />
    )
    await screen.findByText("How can I help?")
    const panel = within(screen.getByRole("complementary", { name: "Contact" }))
    expect(panel.getByText("Deal title")).toBeInTheDocument()
    expect(panel.getByText("Ana - Plano anual")).toBeInTheDocument()
    expect(panel.getByText("Conversation phase")).toBeInTheDocument()
    expect(panel.getByText("Proposal")).toBeInTheDocument()
    expect(panel.getByText("No owner")).toBeInTheDocument()
    expect(panel.getByText("No phone or e-mail")).toBeInTheDocument()
    expect(panel.getByRole("link", { name: "Open in funnel" })).toHaveAttribute("href", "/funnel?deal=card1")
  })

  it("never says 'not in the funnel' when the stage names could not be loaded", async () => {
    const linked = item("c1", { crmColumnId: "col1" })
    render(<InboxView initialPage={{ ...initialPage, items: [linked] }} overview={null} transports={{}} initialSelected={linked} />)
    await screen.findByText("How can I help?")
    expect(within(screen.getByRole("complementary", { name: "Contact" })).getByText("Stage unavailable right now")).toBeInTheDocument()
  })

  it("opens the details as a sheet on smaller screens", async () => {
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    fireEvent.click(screen.getByRole("button", { name: "Contact details" }))
    const sheet = await screen.findByRole("dialog")
    expect(within(sheet).getByText("Main line", { exact: false })).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole("button", { name: "Close contact details" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("coming back to a conversation URL reopens that conversation", async () => {
    window.history.replaceState(null, "", "/inbox/aaaaaaaaaaaaaaaaaaaaaaaa?channel=whatsapp&sessionId=s1")
    loadInboxItemAction.mockResolvedValue({ success: true, data: item("aaaaaaaaaaaaaaaaaaaaaaaa", { name: "Returning customer" }) })
    setup()
    expect(await screen.findByRole("heading", { name: "Returning customer" })).toBeInTheDocument()
    expect(loadInboxItemAction).toHaveBeenCalledWith("aaaaaaaaaaaaaaaaaaaaaaaa")
  })
})

describe("InboxView: live events", () => {
  it("a new inbound message bumps its row to the top and marks it unread", async () => {
    setup()
    const list = () => within(screen.getAllByRole("list")[0]!).getAllByRole("listitem")
    expect(list()[0]).toHaveTextContent("Customer c1")
    await act(async () => {
      socketOptions.onNewInboundMessage?.({ conversationId: "c2", lastInboundAt: "2026-10-22T11:00:00Z", lastMessagePreview: "Can you call me?", lastMessageDirection: "inbound" })
    })
    expect(list()[0]).toHaveTextContent("Customer c2")
    expect(list()[0]).toHaveTextContent("Can you call me?")
    expect(within(list()[0]!).getByRole("img", { name: "Unread" })).toBeInTheDocument()
  })

  it("a message for the open conversation reloads the thread and announces it", async () => {
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    loadThreadAction.mockResolvedValue({
      success: true,
      data: { messages: [msg("m1"), msg("m4", { text: "Are you there?", at: "2026-10-22T10:05:00Z" })], hasMore: false },
    })
    await act(async () => {
      socketOptions.onNewInboundMessage?.({ conversationId: "c1", lastInboundAt: "2026-10-22T10:05:00Z" })
    })
    expect(await screen.findByText("Are you there?")).toBeInTheDocument()
    expect(screen.getAllByRole("status").some((el) => /New message from Customer c1/.test(el.textContent ?? ""))).toBe(true)
  })
})

describe("InboxView: composer", () => {
  it("shows the message immediately, then settles on the server row", async () => {
    // Human handling: nothing to take over first, so the message shows up at once.
    setup({ selected: initialPage.items[1]! })
    await screen.findByText("How can I help?")
    const field = screen.getByRole("textbox", { name: "Message" })
    fireEvent.change(field, { target: { value: "Hi there" } })
    fireEvent.keyDown(field, { key: "Enter" })
    expect(screen.getByText("Hi there")).toBeInTheDocument()
    expect(screen.getByText("Sending…")).toBeInTheDocument()
    await waitFor(() => expect(sendMessageAction).toHaveBeenCalledWith("whatsapp", "s1", "c2", "Hi there"))
    await waitFor(() => expect(screen.queryByText("Sending…")).not.toBeInTheDocument())
    expect(screen.getAllByText("Hi there")).toHaveLength(1)
  })

  it("keeps a failed message in place with retry and discard", async () => {
    sendMessageAction.mockResolvedValueOnce({ success: false, error: "network" })
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    const field = screen.getByRole("textbox", { name: "Message" })
    fireEvent.change(field, { target: { value: "Hello?" } })
    fireEvent.keyDown(field, { key: "Enter" })
    expect(await screen.findByText("Message not sent")).toBeInTheDocument()
    expect(screen.getByText("Not sent")).toBeInTheDocument()
    sendMessageAction.mockResolvedValueOnce({ success: true, data: msg("srv2", { direction: "outbound", author: "human", text: "Hello?", status: "sent" }) })
    const retry = screen.getByRole("button", { name: "Try again" })
    fireEvent.click(retry)
    fireEvent.click(retry)
    await waitFor(() => expect(screen.queryByText("Message not sent")).not.toBeInTheDocument())
    expect(sendMessageAction).toHaveBeenCalledTimes(2)
  })

  it("retry does not send again when the first attempt actually reached the server", async () => {
    sendMessageAction.mockResolvedValueOnce({ success: false, error: "timeout" })
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    const field = screen.getByRole("textbox", { name: "Message" })
    fireEvent.change(field, { target: { value: "Are you there?" } })
    fireEvent.keyDown(field, { key: "Enter" })
    expect(await screen.findByText("Message not sent")).toBeInTheDocument()
    loadThreadAction.mockResolvedValue({
      success: true,
      data: { messages: [msg("srv9", { direction: "outbound", author: "human", text: "Are you there?", status: "delivered", at: new Date().toISOString() })], hasMore: false },
    })
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(screen.queryByText("Message not sent")).not.toBeInTheDocument())
    expect(screen.getByText("Delivered")).toBeInTheDocument()
    expect(sendMessageAction).toHaveBeenCalledTimes(1)
  })

  it("shows a message the channel failed to deliver, without a retry", async () => {
    loadThreadAction.mockResolvedValue({
      success: true,
      data: { messages: [msg("m9", { direction: "outbound", author: "human", authorName: "Bia", text: "Our offer", status: "failed" })], hasMore: false },
    })
    setup({ selected: initialPage.items[0]! })
    expect(await screen.findByText("Our offer")).toBeInTheDocument()
    expect(screen.getByText("Not delivered")).toBeInTheDocument()
    expect(screen.getByText("The channel did not deliver this message to the customer.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument()
  })

  it("Shift+Enter does not send, and group conversations are read-only", async () => {
    setup({ selected: initialPage.items[0]! })
    await screen.findByText("How can I help?")
    const field = screen.getByRole("textbox", { name: "Message" })
    fireEvent.change(field, { target: { value: "line one" } })
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true })
    expect(sendMessageAction).not.toHaveBeenCalled()
  })

  it("group conversations are read-only", async () => {
    render(<InboxView initialPage={initialPage} overview={null} transports={{}} initialSelected={item("g1", { isGroup: true })} />)
    expect(await screen.findByText("Group conversations are read-only here.")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Message" })).not.toBeInTheDocument()
  })
})
