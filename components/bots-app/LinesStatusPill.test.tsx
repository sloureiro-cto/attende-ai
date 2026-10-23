import { fireEvent, render, screen, within } from "@testing-library/react"
import type { LinesPillAffected } from "lib/bots-app/lines"
import { LinesStatusPill } from "./LinesStatusPill"

let pathname = "/inbox"
jest.mock("next/navigation", () => ({ usePathname: () => pathname }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const affected = (over: Partial<LinesPillAffected> = {}): LinesPillAffected => ({
  id: "w1",
  channel: "whatsapp",
  label: "Sales",
  status: "disconnected",
  reconnectHere: true,
  ...over,
})

beforeEach(() => {
  pathname = "/inbox"
})

describe("LinesStatusPill", () => {
  it("names the one affected channel, links to it and offers a direct Reconnect, without claiming lost messages", () => {
    render(<LinesStatusPill status={{ state: "degraded", total: 6, affected: [affected()] }} />)
    const card = screen.getByRole("region", { name: "Channels status: 1 of 6 channels needs attention" })
    expect(card).toHaveTextContent("Sales: Disconnected")
    // Compact: the fix is visible at once; the rest waits behind "Details".
    expect(within(card).getByRole("link", { name: "Reconnect Sales" })).toBeVisible()
    expect(within(card).queryByRole("link", { name: "Open channel Sales" })).not.toBeInTheDocument()
    fireEvent.click(within(card).getByRole("button", { name: "Details" }))
    expect(within(card).getByRole("button", { name: "Hide" })).toHaveAttribute("aria-expanded", "true")
    expect(card).toHaveTextContent("Until it is connected again, it does not send or receive messages in Attende-ai.")
    expect(card).not.toHaveTextContent(/lose|miss/i)
    expect(within(card).getByRole("link", { name: "Reconnect Sales" })).toHaveAttribute("href", "/lines/whatsapp?line=whatsapp%3Aw1&reconnect=1")
    expect(within(card).getByRole("link", { name: "Open channel Sales" })).toHaveAttribute("href", "/lines/whatsapp?line=whatsapp%3Aw1")
  })

  it("lists several channels in one card (one alert, not one per channel) and sums up the rest", () => {
    const list = [
      affected(),
      affected({ id: "i1", channel: "instagram", label: "Brand", reconnectHere: false }),
      affected({ id: "w2", label: "Support", status: "reconnecting" }),
      affected({ id: "s1", channel: "sms", label: "Alerts", status: "pending_setup", reconnectHere: false }),
    ]
    render(<LinesStatusPill status={{ state: "degraded", total: 6, affected: list }} />)
    const card = screen.getByRole("region")
    expect(card).toHaveTextContent("4 channels need attention")
    fireEvent.click(within(card).getByRole("button", { name: "Details" }))
    expect(within(card).getByRole("link", { name: "Open channel Brand" })).toHaveAttribute("href", "/lines/instagram?line=instagram%3Ai1")
    expect(within(card).queryByRole("link", { name: "Reconnect Brand" })).not.toBeInTheDocument()
    expect(within(card).getByRole("link", { name: "Reconnect Support" })).toBeInTheDocument()
    expect(card).toHaveTextContent("1 more")
    expect(within(card).getByRole("link", { name: "See channels" })).toHaveAttribute("href", "/lines")
  })

  it("shrinks to a one-line link on /lines, where the page already shows the problems", () => {
    pathname = "/lines/whatsapp"
    render(<LinesStatusPill status={{ state: "degraded", total: 6, affected: [affected()] }} />)
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Channels status: 1 of 6 channels needs attention" })).toHaveAttribute("href", "/lines")
  })

  it("the phone icon goes straight to the single affected channel", () => {
    render(<LinesStatusPill variant="icon" status={{ state: "degraded", total: 2, affected: [affected()] }} />)
    expect(screen.getByRole("link", { name: "Channels status: 1 of 2 channels needs attention" })).toHaveAttribute("href", "/lines/whatsapp?line=whatsapp%3Aw1")
  })

  it("stays quiet when every channel is connected and says so when none is active", () => {
    const { container, rerender } = render(<LinesStatusPill status={{ state: "ok", total: 3, connected: 3 }} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<LinesStatusPill status={{ state: "none", total: 0 }} />)
    expect(screen.getByRole("link", { name: "Channels status: No active channels" })).toBeInTheDocument()
  })
})
