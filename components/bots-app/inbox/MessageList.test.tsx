import { render, screen } from "@testing-library/react"
import type { ThreadMessage } from "lib/bots-app/inbox/model"
import { buildRows, MessageList, VIRTUALIZE_THRESHOLD } from "./MessageList"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))

const m = (id: string, at: string, over: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id,
  direction: "inbound",
  author: "contact",
  authorName: null,
  text: `text ${id}`,
  at,
  status: "read",
  mediaType: null,
  mediaUrl: null,
  fileName: null,
  deleted: false,
  error: null,
  ...over,
})

const t = ((key: string) => key) as never

describe("buildRows", () => {
  it("inserts a day separator when the day changes and groups close messages of one author", () => {
    // Local times: separators follow the browser's calendar day, not UTC.
    const local = (d: number, h: number, min: number) => new Date(2026, 9, d, h, min).toISOString()
    const rows = buildRows([m("1", local(21, 23, 58)), m("2", local(21, 23, 59)), m("3", local(22, 0, 1))])
    expect(rows.map((r) => r.kind)).toEqual(["day", "message", "message", "day", "message"])
    const grouped = rows.filter((r) => r.kind === "message").map((r) => (r.kind === "message" ? r.grouped : null))
    // 2 groups with 1; 3 is a new day, so it never groups with the previous day's message.
    expect(grouped).toEqual([false, true, false])
  })
})

describe("MessageList", () => {
  const props = { hasMore: false, loadingOlder: false, language: "english", t, announcement: "", onLoadOlder: jest.fn(), onRetry: jest.fn(), onDiscard: jest.fn() }

  it("renders every message when the thread is short (no windowing)", () => {
    const messages = Array.from({ length: 12 }, (_, i) => m(String(i), `2026-10-22T10:${String(i).padStart(2, "0")}:00Z`))
    render(<MessageList {...props} messages={messages} />)
    expect(screen.getAllByText(/^text /)).toHaveLength(12)
  })

  it("exposes the thread as a labelled log with a polite live region for new messages", () => {
    render(<MessageList {...props} messages={[m("1", "2026-10-22T10:00:00Z")]} announcement="New message from Ana" />)
    expect(screen.getByRole("log", { name: "messagesRegion" })).toBeInTheDocument()
    const live = screen.getAllByRole("status").find((el) => el.getAttribute("aria-live") === "polite")
    expect(live).toHaveTextContent("New message from Ana")
  })

  it("windows the list above the threshold instead of mounting every message", () => {
    const total = VIRTUALIZE_THRESHOLD + 50
    const messages = Array.from({ length: total }, (_, i) => m(String(i), new Date(Date.UTC(2026, 9, 22, 0, 0, i)).toISOString()))
    render(<MessageList {...props} messages={messages} />)
    expect(screen.queryAllByText(/^text /).length).toBeLessThan(total)
  })

  it("offers to load earlier messages", () => {
    render(<MessageList {...props} hasMore messages={[m("1", "2026-10-22T10:00:00Z")]} />)
    expect(screen.getByRole("button", { name: "loadOlder" })).toBeInTheDocument()
  })
})
