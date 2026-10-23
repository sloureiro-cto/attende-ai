import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { agentViewFixture, sdrTemplateFixture } from "lib/attende/agents/fixtures"
import { AgentsView } from "./AgentsView"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
const showToast = jest.fn()
jest.mock("app/utils/showToast", () => ({ showToast: (...a: unknown[]) => showToast(...a) }))
const goLiveAttendeAgentAction = jest.fn()
const pauseAttendeAgentAction = jest.fn()
jest.mock("actions/attende/agents", () => ({
  goLiveAttendeAgentAction: (...a: unknown[]) => goLiveAttendeAgentAction(...a),
  pauseAttendeAgentAction: (...a: unknown[]) => pauseAttendeAgentAction(...a),
}))

beforeEach(() => jest.clearAllMocks())

const cardsOf = () => screen.getAllByRole("listitem", { hidden: true }).filter((li) => li.querySelector("h2"))
const validForm = { businessName: "Clinic", businessDescription: "We clean, whiten and fix teeth for families in the city center, with evening hours.", assistantName: "Luna", tone: "friendly", sdr: { qualificationQuestions: ["Budget?"] } }

describe("AgentsView", () => {
  it("invites to create the first agent when there is none", () => {
    render(<AgentsView initialAgents={[]} />)
    expect(screen.getByRole("heading", { name: "Create your first agent" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Create your first agent" })).toHaveAttribute("href", "/ai-agents/new")
  })

  it("tells the four states apart and names each agent's channels", () => {
    render(
      <AgentsView
        templates={[sdrTemplateFixture]}
        initialAgents={[
          agentViewFixture({
            id: "a1",
            name: "SDR · Clinic",
            status: "live",
            form: validForm,
            lines: [
              { channel: "whatsapp", sessionId: "s1", label: "Main", exists: true, connected: true, active: true },
              { channel: "whatsapp", sessionId: "s2", label: "Support", exists: true, connected: true, active: true },
            ],
          }),
          agentViewFixture({ id: "a2", name: "Front desk", status: "draft", form: validForm, lines: [] }),
          agentViewFixture({ id: "a3", name: "Closer", status: "paused", form: validForm }),
          agentViewFixture({ id: "a4", name: "Half done", status: "draft", form: { businessName: "" }, lines: [] }),
        ]}
      />
    )
    const cards = cardsOf()
    expect(cards).toHaveLength(4)
    expect(screen.getByText("4 agents")).toBeInTheDocument()

    expect(within(cards[0]!).getByText("Lead qualifier")).toBeInTheDocument()
    expect(within(cards[0]!).getByText("On in 2 channels")).toBeInTheDocument()
    expect(within(cards[0]!).getByText("Main")).toBeInTheDocument()
    expect(within(cards[0]!).getByText("Support")).toBeInTheDocument()
    expect(within(cards[0]!).getAllByText("WhatsApp")).toHaveLength(2)
    expect(within(cards[0]!).getAllByText("Answers on this channel")).toHaveLength(2)
    expect(within(cards[0]!).getByRole("button", { name: /Pause/ })).toBeInTheDocument()
    expect(within(cards[0]!).getByRole("link", { name: /Edit/ })).toHaveAttribute("href", "/ai-agents/a1?tab=setup")
    expect(within(cards[0]!).getByRole("link", { name: /Check rules/ })).toHaveAttribute("href", "/ai-agents/a1#agent-try")

    expect(within(cards[1]!).getByText("No channels")).toBeInTheDocument()
    expect(within(cards[1]!).getByText("No channel attached")).toBeInTheDocument()
    expect(within(cards[1]!).queryByRole("button", { name: /Turn on/ })).not.toBeInTheDocument()
    expect(within(cards[1]!).getByRole("link", { name: /Attach a channel/ })).toHaveAttribute("href", "/ai-agents/a2")

    expect(within(cards[2]!).getByText("Paused")).toBeInTheDocument()
    expect(within(cards[2]!).getByText("Agent paused")).toBeInTheDocument()
    expect(within(cards[2]!).getByRole("button", { name: /Turn on/ })).toBeInTheDocument()

    expect(within(cards[3]!).getByText("Setup incomplete")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "New agent" })).toHaveAttribute("href", "/ai-agents/new")
  })

  it("does not present On as answering when its only channel dropped", () => {
    render(<AgentsView initialAgents={[agentViewFixture({ status: "live", lines: [{ channel: "whatsapp", sessionId: "s9", label: "Old", exists: true, connected: false, active: true }] })]} />)
    const card = cardsOf()[0]!
    expect(within(card).getByText("On, but no channel answering")).toBeInTheDocument()
    expect(within(card).getByText("1 channel disconnected")).toBeInTheDocument()
    expect(within(card).getByText("Not answering: channel not connected")).toBeInTheDocument()
    expect(within(card).getByText("Disconnected")).toBeInTheDocument()
  })

  it("pauses only after confirming, shows the request is running, then shows the server's state", async () => {
    let resolve: (v: unknown) => void = () => {}
    pauseAttendeAgentAction.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<AgentsView initialAgents={[agentViewFixture({ status: "live", lines: [{ channel: "whatsapp", sessionId: "s1", label: "Main", exists: true, connected: true, active: true }] })]} />)
    await userEvent.click(screen.getByRole("button", { name: /Pause/ }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Pause this agent?")).toBeInTheDocument()
    expect(within(dialog).getByText(/To take the AI out of a single conversation, use Take over/)).toBeInTheDocument()
    expect(pauseAttendeAgentAction).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole("button", { name: "Pause" }))
    expect(pauseAttendeAgentAction).toHaveBeenCalledWith("a1")
    // Still the confirmed state while the request runs.
    expect(screen.getByText("On in 1 channel")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Updating…" })).toBeDisabled()
    resolve({ success: true, data: agentViewFixture({ status: "paused" }) })
    expect(await screen.findByText("Paused")).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith("success", "Your agent is paused.")
  })

  it("keeps the dialog open with a plain message and the previous state when going live fails", async () => {
    goLiveAttendeAgentAction.mockResolvedValue({ success: false, status: 409, code: "ATTENDE_AGENT_LINE_NOT_CONNECTED", details: { lines: [] } })
    render(<AgentsView initialAgents={[agentViewFixture()]} />)
    await userEvent.click(screen.getByRole("button", { name: /Turn on/ }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Luna will answer new messages on 1 channel. You can pause it at any time.")).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Turn on" }))
    expect(await within(dialog).findByText("An attached channel is disconnected. Reconnect it and try again.")).toBeInTheDocument()
    expect(within(cardsOf()[0]!).getByText("Paused")).toBeInTheDocument()
  })

  it("does not offer Turn on while the agent knows too little about the business", () => {
    render(<AgentsView initialAgents={[agentViewFixture({ form: { businessName: "Clinic" }, documents: [] })]} />)
    expect(screen.queryByRole("button", { name: /Turn on/ })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Complete the information/ })).toHaveAttribute("href", "/ai-agents/a1")
  })

  it("a plan problem is explained as such, not as a loading failure", () => {
    render(<AgentsView initialAgents={[]} initialError={{ success: false, status: 402, code: "ATTENDE_TRIAL_EXPIRED" }} />)
    expect(screen.queryByText("We could not load your agents.")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/billing")
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument()
  })

  it("a real loading failure says so and offers a retry", () => {
    render(<AgentsView initialAgents={[]} initialError={{ success: false, status: 500 }} />)
    expect(screen.getByText("We could not load your agents.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("says plainly when the workspace has no Attende plan", () => {
    render(<AgentsView initialAgents={[]} initialError={{ success: false, status: 403, code: "ATTENDE_NOT_ENTITLED" }} />)
    expect(screen.getByText("This company has no Attende-ai plan, so AI agents are not available.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/billing")
  })
})
