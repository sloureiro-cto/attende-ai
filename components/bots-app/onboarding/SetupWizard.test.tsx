import { fireEvent, render, screen } from "@testing-library/react"
import type { ActivationData } from "lib/attende/activationData"
import { agentViewFixture as agent } from "lib/attende/agents/fixtures"
import type { BotsLine } from "lib/bots-app/lines"
import { SetupWizard } from "./SetupWizard"

const mockRefresh = jest.fn()
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh, push: jest.fn() }) }))
jest.mock("next/dynamic", () => () =>
  function ConnectMock({ open, onSessionUpsert }: { open: boolean; onSessionUpsert: () => void }) {
    return open ? <button onClick={() => onSessionUpsert()}>session saved</button> : null
  }
)

const line = { id: "s1", channel: "whatsapp", label: "Main", identifier: "+55", status: "connected" } as BotsLine
const data = (over: Partial<ActivationData> = {}): ActivationData => ({ lines: [], failedChannels: [], agents: [], inbox: null, teamMembers: null, ...over })

beforeEach(() => jest.clearAllMocks())

describe("SetupWizard", () => {
  it("uses the home's five steps and opens on the recommended one", () => {
    render(<SetupWizard data={data()} />)
    const steps = screen.getByRole("list", { name: "Setup steps" })
    expect(steps.querySelectorAll("li")).toHaveLength(5)
    expect(screen.getByRole("button", { name: /Connect a channel/ })).toHaveAttribute("aria-current", "step")
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Instagram or SMS" })).toHaveAttribute("href", "/lines")
  })

  it("connects WhatsApp in place and re-reads the state from the API (nothing is ticked by hand)", () => {
    render(<SetupWizard data={data()} />)
    expect(screen.queryByRole("button", { name: /Mark as done|Skip/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Connect WhatsApp" }))
    fireEvent.click(screen.getByRole("button", { name: "session saved" }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Check again" }))
    expect(mockRefresh).toHaveBeenCalledTimes(2)
  })

  it("follows real progress and lets the user browse the steps", () => {
    render(<SetupWizard data={data({ lines: [line], agents: [agent({ status: "draft", lines: [], form: { businessName: "Clinic" } })] })} />)
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add information" })).toHaveAttribute("href", "/ai-agents/a1?tab=knowledge")
    fireEvent.click(screen.getByRole("button", { name: "Next step" }))
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Choose the agent's channel" })).toHaveAttribute("href", "/ai-agents/a1?tab=setup")
    fireEvent.click(screen.getByRole("button", { name: /Connect a channel/ }))
    expect(screen.getByText("A channel is connected.")).toBeInTheDocument()
  })

  it("celebrates only when an agent really answers", () => {
    const live = agent({ status: "live", lines: [{ channel: "whatsapp", sessionId: "s1", exists: true, connected: true, active: true }] })
    render(<SetupWizard data={data({ lines: [line], agents: [live] })} />)
    expect(screen.getByRole("heading", { name: "Your AI agent is answering customers" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open conversations" })).toHaveAttribute("href", "/inbox")
  })

  it("shows an error with retry when nothing could be read", () => {
    render(<SetupWizard data={data({ failedChannels: ["whatsapp", "instagram", "sms"], agents: null })} />)
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(mockRefresh).toHaveBeenCalled()
  })
})
