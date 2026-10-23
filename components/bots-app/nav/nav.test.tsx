import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BookDemoButton } from "./BookDemoButton"
import { MobileNav } from "./MobileNav"
import { isNavActive, NAV_GROUPS, NAV_ITEMS } from "./navItems"
import { PrimaryNav } from "./PrimaryNav"
import { trialDaysLeft } from "./trial"
import { TrialBanner } from "./TrialBanner"
import { UsageMeter } from "./UsageMeter"

let pathname = "/start"
let language: "english" | "portuguese" | "spanish" = "english"
jest.mock("next/navigation", () => ({ usePathname: () => pathname }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: language }) }))

beforeEach(() => {
  pathname = "/start"
  language = "english"
})

describe("nav items", () => {
  it("lists the nine sections in order, each with its own route and group", () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual(["/start", "/inbox", "/funnel", "/ai-agents", "/lines", "/bots", "/reports", "/team", "/billing"])
    expect(NAV_GROUPS.map((g) => NAV_ITEMS.filter((i) => i.group === g).length)).toEqual([4, 5])
  })
  it("treats a section as active for itself and its children only", () => {
    expect(isNavActive("/bots", "/bots")).toBe(true)
    expect(isNavActive("/bots/abc/stats", "/bots")).toBe(true)
    expect(isNavActive("/botsx", "/bots")).toBe(false)
    expect(isNavActive("/lines", "/bots")).toBe(false)
  })
})

describe("PrimaryNav", () => {
  it("shows every section and marks exactly the current one", () => {
    pathname = "/ai-agents/abc/knowledge"
    render(<PrimaryNav />)
    expect(screen.getAllByRole("link")).toHaveLength(9)
    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page")
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent("AI agents")
  })

  it("keeps Bots active on a nested bot page but not Lines", () => {
    pathname = "/bots/abc/stats"
    render(<PrimaryNav />)
    expect(screen.getByRole("link", { name: "Automations" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Channels" })).not.toHaveAttribute("aria-current")
  })

  it("translates the labels", () => {
    language = "portuguese"
    render(<PrimaryNav />)
    for (const label of ["Início", "Conversas", "Funil", "Agentes de IA", "Canais", "Relatórios", "Equipe", "Cobrança"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument()
    }
  })

  it("is a labeled landmark", () => {
    render(<PrimaryNav />)
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument()
  })
})

describe("MobileNav", () => {
  it("shows the four main tabs, and every section and the booking CTA behind More", async () => {
    const user = userEvent.setup()
    pathname = "/inbox/abc"
    render(<MobileNav footer={<span>usage</span>} />)
    const bar = screen.getByRole("navigation", { name: "Main navigation" })
    expect(within(bar).getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Conversations", "Funnel", "AI agents"])
    expect(within(bar).getByRole("link", { name: "Conversations" })).toHaveAttribute("aria-current", "page")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Open menu" }))
    const sheet = await screen.findByRole("dialog")
    expect(within(within(sheet).getByRole("navigation")).getAllByRole("link")).toHaveLength(9)
    expect(screen.getByRole("link", { name: "Book a demo or training" })).toHaveAttribute("href", "https://app.jsynq.com/book/uUcE1FEPp94")
    expect(screen.getByText("usage")).toBeInTheDocument()
  })

  it("closes after choosing a section", async () => {
    const user = userEvent.setup()
    render(<MobileNav />)
    await user.click(screen.getByRole("button", { name: "Open menu" }))
    await user.click(await screen.findByRole("link", { name: "Team" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("BookDemoButton", () => {
  it("opens the booking page in a new tab safely, in every language", () => {
    for (const [lang, label] of [
      ["english", "Book a demo or training"],
      ["portuguese", "Agendar demonstração ou treinamento"],
      ["spanish", "Agendar demo o capacitación"],
    ] as const) {
      language = lang
      const { unmount } = render(<BookDemoButton />)
      const link = screen.getByRole("link", { name: label })
      expect(link).toHaveAttribute("href", "https://app.jsynq.com/book/uUcE1FEPp94")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link.getAttribute("rel")).toContain("noopener")
      expect(link.getAttribute("rel")).toContain("noreferrer")
      unmount()
    }
  })
  it("has a short label for tight headers", () => {
    render(<BookDemoButton short />)
    expect(screen.getByRole("link", { name: "Book a demo" })).toBeInTheDocument()
  })
})

describe("trialDaysLeft", () => {
  const now = new Date("2026-10-22T12:00:00Z")
  it("rounds up to whole days", () => {
    expect(trialDaysLeft("2026-10-29T12:00:00Z", now)).toBe(7)
    expect(trialDaysLeft("2026-10-23T11:00:00Z", now)).toBe(1)
    expect(trialDaysLeft("2026-10-22T18:00:00Z", now)).toBe(1)
  })
  it("never goes negative and tolerates bad input", () => {
    expect(trialDaysLeft("2026-10-01T00:00:00Z", now)).toBe(0)
    expect(trialDaysLeft(null, now)).toBeNull()
    expect(trialDaysLeft("not a date", now)).toBeNull()
    expect(trialDaysLeft(new Date("2026-10-25T12:00:00Z"), now)).toBe(3)
  })
})

describe("TrialBanner", () => {
  const now = new Date("2026-10-22T12:00:00Z")

  it("counts the days left and links to billing", () => {
    render(<TrialBanner status="trialing" trialEndsAt="2026-10-27T12:00:00Z" now={now} />)
    expect(screen.getByRole("status")).toHaveTextContent("5 days left in your trial")
    expect(screen.getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/billing")
  })

  it("uses the singular for one day and a warning tone for the last days", () => {
    render(<TrialBanner status="trialing" trialEndsAt="2026-10-23T12:00:00Z" now={now} />)
    expect(screen.getByRole("status")).toHaveTextContent("1 day left in your trial")
    expect(screen.getByRole("status").className).toContain("warning")
  })

  it("says so when the trial has ended", () => {
    render(<TrialBanner status="trialing" trialEndsAt="2026-10-20T12:00:00Z" now={now} />)
    expect(screen.getByRole("status")).toHaveTextContent("Your trial has ended")
  })

  it("is translated", () => {
    language = "portuguese"
    render(<TrialBanner status="trialing" trialEndsAt="2026-10-27T12:00:00Z" now={now} />)
    expect(screen.getByRole("status")).toHaveTextContent("Restam 5 dias do seu teste")
    expect(screen.getByRole("link", { name: "Escolher um plano" })).toBeInTheDocument()
  })

  it("warns about a failed payment and a canceled subscription", () => {
    const { rerender } = render(<TrialBanner status="past_due" />)
    expect(screen.getByRole("status")).toHaveTextContent("We could not charge your card")
    expect(screen.getByRole("link", { name: "Update payment" })).toBeInTheDocument()
    rerender(<TrialBanner status="canceled" />)
    expect(screen.getByRole("status")).toHaveTextContent("Your subscription is canceled")
    expect(screen.getByRole("link", { name: "Reactivate" })).toBeInTheDocument()
  })

  it.each([["active"], ["none"], [undefined], [null]] as const)("renders nothing for %s", (status) => {
    const { container } = render(<TrialBanner status={status as never} trialEndsAt="2026-10-27T12:00:00Z" now={now} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing while trialing without a known end date", () => {
    const { container } = render(<TrialBanner status="trialing" trialEndsAt={null} now={now} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe("UsageMeter", () => {
  it("shows used of limit with an accessible progressbar", () => {
    render(<UsageMeter label="Seats" used={2} limit={5} />)
    const bar = screen.getByRole("progressbar", { name: "Seats" })
    expect(bar).toHaveAttribute("aria-valuenow", "2")
    expect(bar).toHaveAttribute("aria-valuemax", "5")
    expect(screen.getByText("2 of 5")).toBeInTheDocument()
  })
  it("flags 80% and the full limit", () => {
    const { rerender } = render(<UsageMeter label="Replies" used={8} limit={10} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Almost at the limit")
    rerender(<UsageMeter label="Replies" used={10} limit={10} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Limit reached")
    rerender(<UsageMeter label="Replies" used={14} limit={10} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10")
  })
  it("hides the bar when there is no limit", () => {
    render(<UsageMeter label="Replies" used={42} />)
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    expect(screen.getByText("42 used")).toBeInTheDocument()
  })
})
