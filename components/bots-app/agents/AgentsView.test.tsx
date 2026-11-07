import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { agentViewFixture, sdrTemplateFixture } from "lib/attende/agents/fixtures"
import type { JsynqAgentView } from "lib/attende/agents/types"
import { AgentsView } from "./AgentsView"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
const showToast = jest.fn()
jest.mock("app/utils/showToast", () => ({ showToast: (...a: unknown[]) => showToast(...a) }))
const goLiveAttendeAgentAction = jest.fn()
const pauseAttendeAgentAction = jest.fn()
const setJsynqAgentLineAction = jest.fn()
jest.mock("actions/attende/agents", () => ({
  goLiveAttendeAgentAction: (...a: unknown[]) => goLiveAttendeAgentAction(...a),
  pauseAttendeAgentAction: (...a: unknown[]) => pauseAttendeAgentAction(...a),
  setJsynqAgentLineAction: (...a: unknown[]) => setJsynqAgentLineAction(...a),
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

  describe("agents created in JSYNQ", () => {
    const jsynqAgent = (over: Partial<JsynqAgentView> = {}): JsynqAgentView => ({
      kind: "jsynq",
      id: "j1",
      agentId: "j1",
      name: "Sales bot",
      model: "gpt-4.1-mini",
      role: "sales",
      status: "live",
      lines: [{ channel: "whatsapp", sessionId: "s1", bindingId: "b1", label: "Main", exists: true, connected: true, active: true }],
      editPath: "/agents/j1",
      ...over,
    })

    it("lists them apart from the Attende agents, says they are edited in JSYNQ and links there", () => {
      render(<AgentsView initialAgents={[agentViewFixture({ id: "a1", name: "Front desk", status: "draft", lines: [] })]} initialJsynqAgents={[jsynqAgent()]} />)
      expect(screen.getByText("2 agents")).toBeInTheDocument()
      const section = screen.getByRole("region", { name: "Created in JSYNQ" })
      const card = within(section).getByTestId("jsynq-agent-card")
      expect(within(card).getByRole("heading", { name: "Sales bot" })).toBeInTheDocument()
      expect(within(card).getByText("Model: gpt-4.1-mini")).toBeInTheDocument()
      expect(within(card).getByText(/cannot be edited here/)).toBeInTheDocument()
      expect(within(card).getByRole("link", { name: /Edit in JSYNQ/ })).toHaveAttribute("href", expect.stringMatching(/\/agents\/j1$/))
      // No Attende wizard actions on it.
      expect(within(card).queryByRole("link", { name: /^Edit:/ })).toBeNull()
    })

    it("a workspace with only JSYNQ agents is not told to create its first agent", () => {
      render(<AgentsView initialAgents={[]} initialJsynqAgents={[jsynqAgent()]} />)
      expect(screen.queryByRole("heading", { name: "Create your first agent" })).toBeNull()
      expect(screen.getByRole("link", { name: /New agent/ })).toHaveAttribute("href", "/ai-agents/new")
    })

    it("switches one channel through the binding action and shows the server's answer", async () => {
      setJsynqAgentLineAction.mockResolvedValueOnce({ success: true, data: jsynqAgent({ status: "paused", lines: [{ ...jsynqAgent().lines[0]!, active: false }] }) })
      render(<AgentsView initialAgents={[]} initialJsynqAgents={[jsynqAgent()]} />)
      const toggle = screen.getByRole("switch", { name: "Main" })
      expect(toggle).toHaveAttribute("aria-checked", "true")
      await userEvent.click(toggle)
      expect(setJsynqAgentLineAction).toHaveBeenCalledWith("j1", "b1", false)
      expect(await screen.findByRole("switch", { name: "Main" })).toHaveAttribute("aria-checked", "false")
      expect(showToast).toHaveBeenCalledWith("success", "Channel updated.")
    })

    it("explains a refused switch (an automation runs on the line) and keeps the state", async () => {
      setJsynqAgentLineAction.mockResolvedValueOnce({ success: false, status: 409, code: "ATTENDE_AUTOMATION_ON_LINE", details: { lines: [{ channel: "whatsapp", sessionId: "s1" }] } })
      const off = jsynqAgent({ status: "paused", lines: [{ ...jsynqAgent().lines[0]!, active: false }] })
      render(<AgentsView initialAgents={[]} initialJsynqAgents={[off]} />)
      await userEvent.click(screen.getByRole("switch", { name: "Main" }))
      expect(setJsynqAgentLineAction).toHaveBeenCalledWith("j1", "b1", true)
      expect(screen.getByRole("switch", { name: "Main" })).toHaveAttribute("aria-checked", "false")
      expect(await screen.findByText(/An active automation already answers on Main/)).toBeInTheDocument()
    })
  })
})
