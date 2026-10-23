import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { reconnectWhatsAppSessionAction } from "actions/whatsapp-lite"
import type { BotsLine, LinesLoadResult } from "lib/bots-app/lines"
import { refreshLinesAction } from "lib/bots-app/linesActions"
import { LinesView } from "./LinesView"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))
jest.mock("lib/bots-app/linesActions", () => ({ refreshLinesAction: jest.fn(), getLinesPillStatusAction: jest.fn() }))
jest.mock("actions/whatsapp-lite", () => ({ reconnectWhatsAppSessionAction: jest.fn() }))
jest.mock("./WhatsAppConnect", () => ({
  WhatsAppConnect: ({ open }: { open: boolean }) => (open ? <div data-testid="connect-modal" /> : null),
}))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a> }))

const line = (over: Partial<BotsLine> = {}): BotsLine => ({
  id: "w1",
  channel: "whatsapp",
  label: "Sales line",
  identifier: "+5511999",
  transport: "whatsapp_qr",
  status: "connected",
  rawStatus: "connected",
  lastEventAt: null,
  lastEventKind: null,
  choiceDelivery: "text_menu",
  bots: [],
  ...over,
})
const result = (over: Partial<LinesLoadResult> = {}): LinesLoadResult => ({
  lines: [],
  failedChannels: [],
  botsUnavailable: false,
  botsTruncated: false,
  ...over,
})

beforeEach(() => jest.clearAllMocks())

describe("LinesView", () => {
  it("shows the empty state with a connect action when there are no lines", () => {
    render(<LinesView initial={result()} channel={null} />)
    expect(screen.getByText("No channels connected yet")).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Connect a number" })[0] as HTMLElement)
    expect(screen.getByTestId("connect-modal")).toBeInTheDocument()
  })

  it("lists channels with their connection, automations and the summary tiles", () => {
    render(
      <LinesView
        initial={result({
          lines: [
            line({ bots: [{ id: "b1", name: "Welcome", status: "active" }] }),
            line({ id: "w2", label: "Backup", status: "disconnected", lastEventAt: "2026-10-01T00:00:00Z", lastEventKind: "disconnected" }),
          ],
        })}
        channel={null}
      />
    )
    expect(screen.getByText("Sales line")).toBeInTheDocument()
    const card = screen.getByTestId("line-whatsapp-w1")
    expect(within(card).getByText("Automations").nextElementSibling).toHaveTextContent("1 active")
    expect(within(card).getByText("Connected")).toBeInTheDocument()
    expect(screen.getByText("Backup")).toBeInTheDocument()
    expect(within(screen.getByTestId("line-whatsapp-w2")).getByText(/does not send or receive messages/)).toBeInTheDocument()
    const tiles = screen.getByRole("region", { name: "Channels summary" })
    expect(within(tiles).getByText("Need attention").parentElement).toHaveTextContent("1")
  })

  it("filters by channel and explains an empty channel", () => {
    render(<LinesView initial={result({ lines: [line()] })} channel="instagram" />)
    expect(screen.queryByText("Sales line")).not.toBeInTheDocument()
    expect(screen.getByText("No Instagram channels")).toBeInTheDocument()
    const links = screen.getAllByRole("link", { name: /Manage channel in JSYNQ/ })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(link).toHaveAttribute("href", expect.stringContaining("/settings/workspace/messages/instagram"))
  })

  it("shows a per-channel load error and retries through the refresh action", async () => {
    ;(refreshLinesAction as jest.Mock).mockResolvedValue(result({ lines: [line()] }))
    render(<LinesView initial={result({ lines: [line()], failedChannels: ["sms"] })} channel={null} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the SMS channels.")
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(refreshLinesAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  })

  it("keeps the data and shows an error when a refresh throws", async () => {
    ;(refreshLinesAction as jest.Mock).mockRejectedValue(new Error("network"))
    render(<LinesView initial={result({ lines: [line()] })} channel={null} />)
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your channels")
    expect(screen.getByText("Sales line")).toBeInTheDocument()
  })

  it("opens the details drawer with the delivery explanation for the line", () => {
    render(<LinesView initial={result({ lines: [line({ transport: "whatsapp_cloud", choiceDelivery: "buttons" })] })} channel={null} />)
    fireEvent.click(screen.getByRole("button", { name: "Details of Sales line" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Real buttons and lists/)).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: "Reconnect" })).not.toBeInTheDocument()
  })

  it("offers Reconnect only for QR WhatsApp lines that dropped", () => {
    render(<LinesView initial={result({ lines: [line({ status: "disconnected" })] })} channel={null} />)
    fireEvent.click(screen.getByRole("button", { name: "Details of Sales line" }))
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Reconnect" })).toBeInTheDocument()
  })

  it("counts every channel like the tabs and says what each number counts", () => {
    const lines = [
      line({ id: "a" }),
      line({ id: "b" }),
      line({ id: "c" }),
      line({ id: "d", status: "disconnected" }),
      line({ id: "e", status: "disabled" }),
      line({ id: "f", status: "disabled" }),
    ]
    render(<LinesView initial={result({ lines })} channel={null} />)
    expect(screen.getByTestId("lines-stat-total")).toHaveTextContent("Channels64 active · 2 disabled")
    expect(screen.getByTestId("lines-stat-connected")).toHaveTextContent("Connected3of 4 active channels")
    expect(screen.getByTestId("lines-stat-attention")).toHaveTextContent("Need attention1")
    expect(screen.getByRole("link", { name: /All/ })).toHaveTextContent("6")
  })

  it("shows a dash, never 0, when automations or AI agents could not be loaded", () => {
    render(<LinesView initial={result({ lines: [line()], botsUnavailable: true, agentsUnavailable: true })} channel={null} />)
    expect(screen.getByTestId("lines-stat-automations")).toHaveTextContent("–Not available")
    expect(screen.getByTestId("lines-stat-agents")).toHaveTextContent("–Not available")
  })

  it("names the AI agent on each channel with its state", () => {
    render(
      <LinesView
        initial={result({ lines: [line({ agents: [{ id: "a1", name: "SDR Bia", status: "live", active: true }] })] })}
        channel={null}
      />
    )
    const card = screen.getByTestId("line-whatsapp-w1")
    expect(within(card).getByText("SDR Bia")).toBeInTheDocument()
    expect(within(card).getByText("AI active")).toBeInTheDocument()
    expect(screen.getByTestId("lines-stat-agents")).toHaveTextContent("1")
    fireEvent.click(screen.getByRole("button", { name: "Details of Sales line" }))
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Open AI agent SDR Bia" })).toHaveAttribute("href", "/ai-agents/a1")
  })

  it("reconnects straight from the card with the existing reconnect flow", async () => {
    ;(reconnectWhatsAppSessionAction as jest.Mock).mockResolvedValue({ success: true, data: { _id: "w1", label: "Sales line", status: "qr_pending" } })
    render(<LinesView initial={result({ lines: [line({ status: "disconnected" })] })} channel={null} />)
    fireEvent.click(screen.getByRole("button", { name: "Reconnect Sales line" }))
    await waitFor(() => expect(reconnectWhatsAppSessionAction).toHaveBeenCalledWith("w1"))
    expect(await screen.findByTestId("connect-modal")).toBeInTheDocument()
  })

  it("sends channels fixed in JSYNQ there instead of offering an in-app reconnect", () => {
    render(<LinesView initial={result({ lines: [line({ channel: "instagram", transport: "instagram", status: "disconnected" })] })} channel={null} />)
    expect(screen.queryByRole("button", { name: "Reconnect Sales line" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Reconnect Sales line in JSYNQ/ })).toHaveAttribute("href", expect.stringContaining("/instagram"))
  })

  it("opens the channel from a side-menu deep link", () => {
    render(<LinesView initial={result({ lines: [line()] })} channel="whatsapp" initialLineKey="whatsapp:w1" />)
    expect(within(screen.getByRole("dialog")).getByText("Sending and receiving messages.")).toBeInTheDocument()
  })

  it("starts the reconnect from a side-menu deep link with reconnect=1", async () => {
    ;(reconnectWhatsAppSessionAction as jest.Mock).mockResolvedValue({ success: true, data: { _id: "w1", label: "Sales line", status: "qr_pending" } })
    render(<LinesView initial={result({ lines: [line({ status: "disconnected" })] })} channel="whatsapp" initialLineKey="whatsapp:w1" autoReconnect />)
    await waitFor(() => expect(reconnectWhatsAppSessionAction).toHaveBeenCalledWith("w1"))
  })
})
