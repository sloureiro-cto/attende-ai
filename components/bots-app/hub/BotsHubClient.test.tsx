import { fireEvent, render, screen } from "@testing-library/react"
import type { AdvancedAutomationListItem, AdvancedAutomationListResponse } from "lib/automations/types"
import { BotsHubClient } from "./BotsHubClient"

const push = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
// Echo the keys of the automation strings so assertions do not depend on copy.
jest.mock("components/automations/ui/useAutomationsT", () => ({
  useAutomationsT: () => ({ t: (key: string) => key, strict: (key: string) => key, language: "english" }),
  automationsKey: (key: string) => key,
}))
jest.mock("components/automations/ui/ChannelFilter", () => ({
  channelLabelKey: (c: string) => `label_${c}`,
  ChannelFilter: ({ onChange }: { onChange: (v: "all" | "whatsapp") => void }) => (
    <button type="button" onClick={() => onChange("whatsapp")}>
      filter-whatsapp
    </button>
  ),
}))
jest.mock("actions/messaging-automations/advancedAutomations", () => ({
  listAdvancedAutomationsAction: jest.fn().mockResolvedValue({ success: false, error: "" }),
  updateAdvancedAutomationAction: jest.fn(),
  deleteAdvancedAutomationAction: jest.fn(),
}))
jest.mock("actions/messaging-automations/automations", () => ({}))
jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))

const bot = (id: string): AdvancedAutomationListItem =>
  ({ id, name: `Bot ${id}`, status: "active", channels: [{ channel: "whatsapp", enabledSessionIds: [] }], stepCount: 4, version: 1, updatedAt: new Date().toISOString(), stats30d: { started: 10, completed: 5 } }) as AdvancedAutomationListItem
const page = (items: AdvancedAutomationListItem[]): AdvancedAutomationListResponse => ({
  items,
  total: items.length,
  page: 1,
  limit: 25,
  totals: { all: items.length, active: items.length, paused: 0, draft: 0 },
})

beforeEach(() => {
  push.mockClear()
})

describe("BotsHubClient", () => {
  it("shows only automations: no rules tab, header numbers with their base and the cards", () => {
    render(<BotsHubClient initial={{ data: page([bot("1"), bot("2")]), failed: false }} />)
    expect(screen.getByText("Bot 1")).toBeInTheDocument()
    expect(screen.getByText("Bot 2")).toBeInTheDocument()
    expect(screen.queryByText("automationsHubTabRules")).toBeNull()
    expect(screen.queryByRole("tab")).toBeNull()
    expect(screen.getByText("Active automations")).toBeInTheDocument()
    expect(screen.getByText(/An automation always follows the steps you draw/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See AI agents" })).toHaveAttribute("href", "/ai-agents")
    // The whole list is on the page, so the 30-day sum is real: 2 bots x 10 started.
    expect(screen.getByText("20")).toBeInTheDocument()
    // The completion rate always shows its base.
    expect(screen.getByText("50%")).toBeInTheDocument()
    expect(screen.getByText("10 of 20 conversations completed the flow")).toBeInTheDocument()
  })

  it("opens a bot in the bots app builder (/bots/<id>), never in /automation-studio", () => {
    render(<BotsHubClient initial={{ data: page([bot("abc")]), failed: false }} />)
    expect(screen.getByRole("link", { name: "Bot abc" })).toHaveAttribute("href", "/bots/abc")
  })

  it("New automation goes straight to /bots/new", () => {
    render(<BotsHubClient initial={{ data: page([bot("1")]), failed: false }} />)
    fireEvent.click(screen.getAllByRole("button", { name: "New automation" })[0] as HTMLElement)
    expect(push).toHaveBeenCalledWith("/bots/new")
  })

  it("a workspace without automations gets the empty state with a template shortcut", () => {
    render(<BotsHubClient initial={{ data: page([]), failed: false }} />)
    expect(screen.getByText("Create your first automation")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Start from the quote template" }))
    expect(push).toHaveBeenCalledWith("/bots/new?template=quote")
  })

  it("never shows a missing 30-day figure as 0 when only part of the list is loaded", () => {
    const partial = { ...page([bot("1")]), total: 30, totals: { all: 30, active: 30, paused: 0, draft: 0 } }
    render(<BotsHubClient initial={{ data: partial, failed: false }} />)
    expect(screen.getAllByText("Shown when every automation fits on one page")).toHaveLength(2)
    expect(screen.getAllByText("–")).toHaveLength(2)
  })

  it("shows a retry when the list could not be loaded", () => {
    render(<BotsHubClient initial={{ data: null, failed: true }} />)
    expect(screen.getByText("We could not load your automations")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})
