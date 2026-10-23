import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ActivationData } from "lib/attende/activationData"
import { agentViewFixture as agent } from "lib/attende/agents/fixtures"
import type { BotsLine } from "lib/bots-app/lines"
import { HomeView } from "./HomeView"

const mockRefresh = jest.fn()
let mockLanguage = "english"
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: mockLanguage }) }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh, push: jest.fn() }) }))

const line = (over: Partial<BotsLine> = {}) => ({ id: "s1", channel: "whatsapp", label: "Main", identifier: "+55", status: "connected", ...over }) as BotsLine
const liveAgent = agent({ name: "Luna", status: "live", lines: [{ channel: "whatsapp", sessionId: "s1", exists: true, connected: true, active: true }] })
const data = (over: Partial<ActivationData> = {}): ActivationData => ({
  lines: [],
  failedChannels: [],
  agents: [],
  inbox: { needsReply: 0, unread: 0 },
  teamMembers: 1,
  ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockLanguage = "english"
})

describe("HomeView", () => {
  it("new workspace: one recommended step with one primary action, five steps, optional tasks apart", () => {
    render(<HomeView data={data()} />)
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument()
    expect(screen.getByText("Next step · Step 1 of 5")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Connect a channel" })).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /Connect a channel/ })[0]).toHaveAttribute("href", "/lines")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
    expect(screen.getAllByText("0 of 5 steps done").length).toBeGreaterThan(0)

    const checklist = screen.getByRole("heading", { name: "Steps to your first AI conversation" }).closest("div")!.parentElement!
    expect(within(checklist).getAllByRole("listitem")).toHaveLength(5)
    // Steps that depend on the agent say so instead of repeating "Create AI agent".
    expect(within(checklist).getAllByRole("link", { name: /^Create AI agent/ })).toHaveLength(1)
    expect(within(checklist).getAllByText("Available after you create the agent.")).toHaveLength(3)

    const optional = screen.getByRole("region", { name: "Optional" })
    expect(within(optional).getByText("1 person in the company")).toBeInTheDocument()
    const demo = within(optional).getByRole("link", { name: /Book now/ })
    expect(demo).toHaveAttribute("target", "_blank")
    expect(within(optional).queryByText("Done")).not.toBeInTheDocument()
  })

  it("agent on a channel but paused: progress counts real data, next step is the business information", () => {
    render(<HomeView data={data({ lines: [line()], agents: [agent({ name: "Luna", form: { businessName: "Clinic" } })] })} />)
    expect(screen.getAllByText("2 of 5 steps done").length).toBeGreaterThan(0)
    expect(screen.getByText("Next step · Step 3 of 5")).toBeInTheDocument()
    expect(screen.getAllByText("Not enough yet: the business name alone doesn't tell the agent what to answer.")).toHaveLength(2)
    expect(screen.getByText("Luna is on a channel but turned off.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Turn the agent on: Turn the agent on in a channel" })).toHaveAttribute("href", "/ai-agents/a1")
  })

  it("shows a full error with retry when nothing could be read", () => {
    render(<HomeView data={data({ failedChannels: ["whatsapp", "instagram", "sms"], agents: null })} />)
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your setup")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it("says which steps could not be checked when agents fail to load", () => {
    render(<HomeView data={data({ lines: [line()], agents: null })} />)
    expect(screen.getByText(/Some information could not be loaded/)).toBeInTheDocument()
    expect(screen.getAllByText("Couldn't check").length).toBe(4)
    expect(screen.getAllByText("1 of 5 steps done").length).toBeGreaterThan(0)
  })

  it("after activation: day-to-day cards first, the checklist stays reachable", () => {
    render(
      <HomeView
        data={data({
          lines: [line(), line({ id: "s2", label: "Support", status: "disconnected" })],
          agents: [liveAgent],
          inbox: { needsReply: 3, unread: 1 },
        })}
      />
    )
    expect(screen.getByText("What needs you today.")).toBeInTheDocument()
    expect(screen.getByText("3 conversations")).toBeInTheDocument()
    expect(screen.getByText("1 channel needs attention")).toBeInTheDocument()
    expect(screen.getByText("WhatsApp · Disconnected")).toBeInTheDocument()
    expect(screen.getByText("1 agent answering")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open the guided setup" })).toHaveAttribute("href", "/setup")
    expect(screen.getByText("Still recommended")).toBeInTheDocument()
    expect(screen.queryByText(/Next step ·/)).not.toBeInTheDocument()
  })

  it("never shows a missing inbox counter as zero", () => {
    render(<HomeView data={data({ lines: [line()], agents: [liveAgent], inbox: null, teamMembers: null })} />)
    expect(screen.getByText("Not available right now.")).toBeInTheDocument()
    expect(screen.getByText("We couldn't check your team.")).toBeInTheDocument()
  })

  it("speaks Brazilian Portuguese with the glossary terms", () => {
    mockLanguage = "portuguese"
    render(<HomeView data={data({ lines: [line()], agents: [liveAgent], inbox: { needsReply: 1, unread: 0 } })} />)
    expect(screen.getByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument()
    expect(screen.getByText("Aguardando equipe")).toBeInTheDocument()
    expect(screen.getByText("1 conversa")).toBeInTheDocument()
    expect(screen.getByText("Canais")).toBeInTheDocument()
  })
})
