import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { agentViewFixture, receptionistTemplateFixture, sdrTemplateFixture } from "lib/attende/agents/fixtures"
import type { BotsLine } from "lib/bots-app/lines"
import { AgentWizard } from "./AgentWizard"
import { resetHandoffMembersCache } from "./fields/HandoffTargetField"

const push = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: jest.fn(), replace: jest.fn() }), usePathname: () => "/ai-agents/new" }))
jest.mock("next/dynamic", () => () => () => null)
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))
jest.mock("lib/bots-app/linesActions", () => ({ refreshLinesAction: jest.fn() }))

const createAttendeAgentAction = jest.fn()
const getAttendeAgentAction = jest.fn()
const testAttendeAgentAction = jest.fn()
const goLiveAttendeAgentAction = jest.fn()
const listHandoffMembersAction = jest.fn()
jest.mock("actions/attende/agents", () => ({
  createAttendeAgentAction: (...a: unknown[]) => createAttendeAgentAction(...a),
  getAttendeAgentAction: (...a: unknown[]) => getAttendeAgentAction(...a),
  testAttendeAgentAction: (...a: unknown[]) => testAttendeAgentAction(...a),
  goLiveAttendeAgentAction: (...a: unknown[]) => goLiveAttendeAgentAction(...a),
  pauseAttendeAgentAction: jest.fn(),
  listAgentKnowledgeAction: jest.fn().mockResolvedValue({ success: true, data: [] }),
  listHandoffMembersAction: (...a: unknown[]) => listHandoffMembersAction(...a),
}))

const LINE: BotsLine = {
  id: "s1",
  channel: "whatsapp",
  label: "Main",
  identifier: "+55 11 99999-0000",
  transport: "whatsapp_qr",
  status: "connected",
  rawStatus: "connected",
  lastEventAt: null,
  lastEventKind: null,
  choiceDelivery: "buttons",
  bots: [],
}

const renderWizard = (over: Partial<Parameters<typeof AgentWizard>[0]> = {}) =>
  render(<AgentWizard templates={[sdrTemplateFixture]} lines={[LINE]} workspaceId="w1" {...over} />)

const user = () => userEvent.setup()

/** Selects the "Qualify leads" card and continues. */
async function pick(u: ReturnType<typeof user>) {
  await u.click(screen.getByRole("radio", { name: /Qualify leads/ }))
  await u.click(screen.getByRole("button", { name: "Continue with Qualify leads" }))
}

/** Picks the model and fills the two question steps, ending on the channels step. */
async function fillQuestions(u: ReturnType<typeof user>) {
  await pick(u)
  await u.type(await screen.findByLabelText(/Business name/), "Clinic")
  await u.click(screen.getByRole("button", { name: "Continue" }))
  await u.type(await screen.findByLabelText(/Questions to ask/), "What is your budget?{Enter}")
  await u.click(screen.getByRole("button", { name: "Continue" }))
  await screen.findByRole("heading", { name: "Which channels should this agent answer on?" })
}

beforeEach(() => {
  jest.clearAllMocks()
  resetHandoffMembersCache()
  listHandoffMembersAction.mockResolvedValue({ success: true, data: [{ id: "u1", name: "Ana", email: "ana@x.com" }] })
  window.sessionStorage.clear()
  window.localStorage.clear()
  window.history.replaceState(null, "", "/ai-agents/new")
})

describe("AgentWizard: picking a model", () => {
  it("leads with the outcome, keeps the role as secondary text and labels the example as illustrative", async () => {
    const u = user()
    renderWizard()
    expect(screen.getByRole("heading", { name: "What should your agent do?" })).toBeInTheDocument()
    const card = screen.getByRole("radio", { name: /Qualify leads/ })
    expect(card).toHaveAttribute("aria-checked", "false")
    expect(within(card).getByText("Pre-sales / SDR")).toBeInTheDocument()
    expect(within(card).getByText("Illustrative example", { selector: "span" })).toBeInTheDocument()
    expect(within(card).getByText(/Hours, prices and services come from what you register/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()

    await pick(u)
    expect(await screen.findByRole("heading", { name: "About your business" })).toHaveFocus()
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument()
    expect(window.location.search).toBe("?template=sdr")
  })

  it("moves the choice with the arrow keys and continues with Enter", async () => {
    const u = user()
    renderWizard({ templates: [sdrTemplateFixture, receptionistTemplateFixture] })
    const first = screen.getByRole("radio", { name: /Qualify leads/ })
    first.focus()
    await u.keyboard("{ArrowRight}")
    const second = screen.getByRole("radio", { name: /Answer and route/ })
    expect(second).toHaveAttribute("aria-checked", "true")
    expect(second).toHaveFocus()
    expect(screen.getByRole("button", { name: "Continue with Answer and route" })).toBeEnabled()
    await u.keyboard("{Enter}")
    expect(await screen.findByRole("heading", { name: "About your business" })).toBeInTheDocument()
    expect(window.location.search).toBe("?template=receptionist")
  })

  it("shows a friendly message when the models cannot be loaded", () => {
    renderWizard({ templates: [], templatesError: { success: false, status: 500 } })
    expect(screen.getByText("We could not load the models.")).toBeInTheDocument()
  })
})

describe("AgentWizard: step validation and navigation", () => {
  it("blocks Continue with an error summary that links to the field", async () => {
    const u = user()
    renderWizard({ initialTemplateKey: "sdr" })
    await screen.findByRole("heading", { name: "About your business" })
    await u.click(screen.getByRole("button", { name: "Continue" }))
    const summary = screen.getByText("Please fix 1 item to continue.").closest("[role=alert]") as HTMLElement
    expect(within(summary).getByRole("link", { name: /Business name: This field is required/ })).toHaveAttribute("href", "#agent-field-businessName")
    expect(screen.getByLabelText(/Business name/)).toHaveAttribute("aria-invalid", "true")

    await u.type(screen.getByLabelText(/Business name/), "Clinic")
    expect(screen.queryByText("Please fix 1 item to continue.")).not.toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: "Continue" }))
    expect(await screen.findByRole("heading", { name: "How to qualify" })).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByLabelText(/Business name/)).toHaveValue("Clinic")
  })

  it("previews the first message in the agent's language, with the notice when it is on", async () => {
    const u = user()
    renderWizard({ initialTemplateKey: "sdr" })
    await u.type(await screen.findByLabelText(/Business name/), "Clinic")
    await u.type(screen.getByLabelText(/Agent name/), "Luna")
    const preview = screen.getByRole("figure", { name: "First message preview" })
    expect(within(preview).getByText("Hi! I'm Luna, the virtual assistant of Clinic. How can I help?")).toBeInTheDocument()
    expect(within(preview).getByText("Says it is a virtual assistant")).toBeInTheDocument()

    await u.click(screen.getByRole("radio", { name: "Portuguese" }))
    expect(within(preview).getByText("Oi! Eu sou Luna, assistente virtual de Clinic. Como posso ajudar?")).toBeInTheDocument()
    expect(within(preview).getByText("In Portuguese")).toBeInTheDocument()
    // The screen stays in English.
    expect(screen.getByRole("heading", { name: "About your business" })).toBeInTheDocument()

    await u.click(screen.getByRole("checkbox", { name: /Say it is a virtual assistant/ }))
    expect(within(preview).getByText("Oi! Eu sou Luna, de Clinic. Como posso ajudar?")).toBeInTheDocument()
    expect(within(preview).queryByText("Says it is a virtual assistant")).not.toBeInTheDocument()
  })

  it("edits a structured price and sends the sentence the agent reads", async () => {
    const u = user()
    renderWizard({ initialTemplateKey: "sdr" })
    await u.type(await screen.findByLabelText(/Business name/), "Clinic")
    await u.click(screen.getByRole("button", { name: "Add a product or service" }))
    await u.type(screen.getByLabelText("Name"), "Cleaning")
    await u.selectOptions(screen.getByLabelText("Price type"), "from")
    await u.type(screen.getByLabelText("Amount"), "39")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    // Currency is never guessed: Continue is blocked until it is chosen.
    expect(screen.getByText("Choose the currency.")).toBeInTheDocument()
    expect(screen.getByLabelText("Amount")).toHaveValue("39")
    await u.selectOptions(screen.getByLabelText("Currency"), "USD")
    await u.selectOptions(screen.getByLabelText("Charged"), "month")
    expect(screen.getByText("The agent receives: from $39.00/month")).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: "Continue" }))
    expect(await screen.findByRole("heading", { name: "How to qualify" })).toBeInTheDocument()
  })

  it("shows the included handoff cases apart and keeps extra rules editable", async () => {
    const u = user()
    renderWizard({ initialTemplateKey: "sdr" })
    await u.type(await screen.findByLabelText(/Business name/), "Clinic")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    const input = await screen.findByLabelText(/Questions to ask/)
    await u.type(input, "Budget?{Enter}")
    await u.type(input, "When do you need it?")
    await u.click(screen.getAllByRole("button", { name: "Add" })[0]!)
    expect(screen.getByText("Budget?")).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: "Remove “Budget?”" }))
    expect(screen.queryByText("Budget?")).not.toBeInTheDocument()

    expect(screen.getByRole("heading", { name: "Already included (recommended)" })).toBeInTheDocument()
    expect(screen.getByText("The customer asks to talk to a person")).toBeInTheDocument()
    const suggestion = screen.getByRole("button", { name: "The customer asks for a custom quote" })
    await u.click(suggestion)
    expect(suggestion).toHaveAttribute("aria-pressed", "true")

    // Keywords live under "Customize", collapsed.
    const customize = screen.getByRole("button", { name: /Customize/ })
    expect(customize).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByLabelText(/Words that call a person/)).not.toBeVisible()
    await u.click(customize)
    expect(screen.getByLabelText(/Words that call a person/)).toBeVisible()
  })

  it("separates the AI's hours from the team and shows the time zone", async () => {
    const u = user()
    renderWizard({ initialTemplateKey: "sdr" })
    await u.type(await screen.findByLabelText(/Business name/), "Clinic")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    await screen.findByRole("heading", { name: "How to qualify" })
    expect(screen.getByText("When the AI answers")).toBeInTheDocument()
    expect(screen.getByText("These hours apply only to the AI; Attende has no team schedule.")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "24 hours, every day" })).toHaveAttribute("aria-checked", "true")

    await u.click(screen.getByRole("radio", { name: "Business hours" }))
    expect(screen.getByText(/Mon-Fri 09:00-18:00/)).toBeInTheDocument()
    expect(screen.getByText(/Time zone used:/)).toBeInTheDocument()
    await u.click(screen.getByRole("checkbox", { name: "Open on Sat" }))
    expect(screen.getByRole("radio", { name: "Custom" })).toHaveAttribute("aria-checked", "true")
  })

  it("sends the handoff to a chosen member, or to the whole team by default", async () => {
    const u = user()
    renderWizard({ initialTemplateKey: "sdr" })
    await u.type(await screen.findByLabelText(/Business name/), "Clinic")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    await screen.findByRole("heading", { name: "How to qualify" })
    expect(screen.getByRole("radio", { name: "The whole team" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText(/Outside these hours, the AI does not reply. Messages stay in the conversations inbox/)).toBeInTheDocument()
    await u.click(screen.getByRole("radio", { name: "A specific person" }))
    expect(screen.getByText(/stays visible to the team/)).toBeInTheDocument()
    await u.type(screen.getByLabelText(/Questions to ask/), "Budget?{Enter}")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    // A person must be chosen.
    expect(screen.getByText(/Who receives the conversation: This field is required/)).toBeInTheDocument()
    await u.selectOptions(await screen.findByLabelText("Person"), "u1")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    expect(await screen.findByRole("heading", { name: "Which channels should this agent answer on?" })).toBeInTheDocument()
    const saved = JSON.parse(window.sessionStorage.getItem("attende.agent.draft.w1.sdr") ?? "{}") as { form?: { handoff?: unknown } }
    expect(saved.form?.handoff).toMatchObject({ target: { kind: "user", userId: "u1" } })
  })

  it("reorders and edits qualification questions", async () => {
    const u = user()
    renderWizard({ initialTemplateKey: "sdr" })
    await u.type(await screen.findByLabelText(/Business name/), "Clinic")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    const input = await screen.findByLabelText(/Questions to ask/)
    await u.type(input, "First?{Enter}")
    await u.type(input, "Second?{Enter}")
    await u.click(screen.getByRole("button", { name: "Move “Second?” up" }))
    const items = screen.getAllByText(/First\?|Second\?/)
    expect(items.map((i) => i.textContent)).toEqual(["Second?", "First?"])
    await u.click(screen.getByRole("button", { name: "Edit “First?”" }))
    const edit = screen.getByRole("textbox", { name: "Edit “First?”" })
    await u.clear(edit)
    await u.type(edit, "Budget?{Enter}")
    expect(screen.getByText("Budget?")).toBeInTheDocument()
  })

  it("lets the documents step be skipped", async () => {
    const u = user()
    renderWizard()
    await fillQuestions(u)
    await u.click(screen.getByRole("button", { name: "Continue" }))
    await screen.findByRole("heading", { name: "Teach your agent about your business" })
    await u.click(screen.getByRole("button", { name: /Skip for now/ }))
    expect(await screen.findByRole("heading", { name: "Check everything before you create" })).toBeInTheDocument()
  })
})

describe("AgentWizard: drafts", () => {
  it("restores answers and step after a refresh, and asks before starting over", async () => {
    const u = user()
    const first = renderWizard({ initialTemplateKey: "sdr" })
    await u.type(await screen.findByLabelText(/Business name/), "Clinic")
    await u.click(screen.getByRole("button", { name: "Continue" }))
    await screen.findByRole("heading", { name: "How to qualify" })
    first.unmount()

    renderWizard({ initialTemplateKey: "sdr" })
    expect(await screen.findByRole("heading", { name: "How to qualify" })).toBeInTheDocument()
    expect(screen.getByText("We restored your previous answers.")).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: "Start over" }))
    const dialog = await screen.findByRole("alertdialog")
    await u.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(screen.getByRole("heading", { name: "How to qualify" })).toBeInTheDocument()

    await u.click(screen.getByRole("button", { name: "Start over" }))
    await u.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Erase and start over" }))
    expect(await screen.findByLabelText(/Business name/)).toHaveValue("")
  })

  it("says which picked files must be chosen again after a refresh", async () => {
    const u = user()
    const first = renderWizard()
    await fillQuestions(u)
    await u.click(screen.getByRole("button", { name: "Continue" }))
    await screen.findByRole("heading", { name: "Teach your agent about your business" })
    await u.upload(screen.getByLabelText(/Drag files here/), new File(["x"], "prices.pdf", { type: "application/pdf" }))
    expect(screen.getByText(/Until then they stay only in this tab/)).toBeInTheDocument()
    first.unmount()

    renderWizard({ initialTemplateKey: "sdr" })
    expect(await screen.findByText("Before the page reloaded you had picked: prices.pdf. Pick these files again to send them.")).toBeInTheDocument()
  })
})

describe("AgentWizard: review, create and turn on", () => {
  async function toReview(u: ReturnType<typeof user>, withChannel = true) {
    renderWizard()
    await fillQuestions(u)
    if (withChannel) await u.click(screen.getByRole("checkbox", { name: /Main/ }))
    await u.click(screen.getByRole("button", { name: "Continue" }))
    await u.click(await screen.findByRole("button", { name: /Skip for now/ }))
    await screen.findByRole("heading", { name: "Check everything before you create" })
  }

  it("shows the real answers and pending items, and Edit comes back to the review", async () => {
    const u = user()
    await toReview(u, false)
    const business = screen.getByRole("region", { name: "About your business" })
    expect(within(business).getByText("Clinic")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "How to qualify" })).getByText("What is your budget?")).toBeInTheDocument()
    expect(screen.getByText(/No channel chosen/)).toBeInTheDocument()
    expect(screen.getByText(/Little information about the business/)).toBeInTheDocument()

    await u.click(screen.getByRole("button", { name: "Edit About your business" }))
    const description = await screen.findByLabelText(/What the business does/)
    await u.type(description, "We clean and whiten teeth for families, with evening and weekend hours.")
    await u.click(screen.getByRole("button", { name: "Back to review" }))
    expect(await screen.findByRole("heading", { name: "Check everything before you create" })).toBeInTheDocument()
    expect(screen.queryByText(/Little information about the business/)).not.toBeInTheDocument()
    expect(screen.getByText(/We clean and whiten teeth/)).toBeInTheDocument()
  })

  it("creates paused, retries with the same request id and never turns on by itself", async () => {
    const u = user()
    await toReview(u)
    expect(screen.getByText("Main · WhatsApp · Connected")).toBeInTheDocument()
    expect(screen.getByText(/The agent is created paused/)).toBeInTheDocument()

    createAttendeAgentAction.mockResolvedValueOnce({ success: false, status: 0, message: "network" })
    await u.click(screen.getByRole("button", { name: "Create agent" }))
    expect(await screen.findByText("We could not reach the server. Check your connection.")).toBeInTheDocument()

    createAttendeAgentAction.mockResolvedValueOnce({ success: true, data: agentViewFixture() })
    await u.click(screen.getByRole("button", { name: "Create agent" }))
    expect(await screen.findByRole("heading", { name: "Agent created, still paused" })).toBeInTheDocument()

    const [firstCall, secondCall] = createAttendeAgentAction.mock.calls.map((c) => c[0])
    expect(firstCall.clientRequestId).toBeTruthy()
    expect(secondCall.clientRequestId).toBe(firstCall.clientRequestId)
    expect(secondCall).toMatchObject({ templateKey: "sdr", form: { businessName: "Clinic", sdr: { qualificationQuestions: ["What is your budget?"] } }, lines: [{ channel: "whatsapp", sessionId: "s1" }] })
    expect(goLiveAttendeAgentAction).not.toHaveBeenCalled()
    expect(screen.getByText("Rules check, not an AI reply")).toBeInTheDocument()
    const onboarding = JSON.parse(window.localStorage.getItem("attende:onboarding:w1") ?? "{}") as { steps?: { agent?: string } }
    expect(onboarding.steps?.agent).toBe("done")
  })

  it("sends the user back to the question the server rejected", async () => {
    const u = user()
    await toReview(u)
    createAttendeAgentAction.mockResolvedValueOnce({
      success: false,
      status: 400,
      code: "ATTENDE_AGENT_VALIDATION",
      details: { issues: [{ path: "sdr.qualificationQuestions", message: "Too vague" }] },
    })
    await u.click(screen.getByRole("button", { name: "Create agent" }))
    expect(await screen.findByRole("heading", { name: "How to qualify" })).toBeInTheDocument()
    expect(screen.getByText("Some answers need a second look. Check the highlighted fields.")).toBeInTheDocument()
    expect(screen.getAllByText(/Too vague/).length).toBeGreaterThan(0)
  })

  it("explains a plan limit with a link to the plans page", async () => {
    const u = user()
    await toReview(u)
    createAttendeAgentAction.mockResolvedValueOnce({ success: false, status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "agents", limit: 1 } })
    await u.click(screen.getByRole("button", { name: "Create agent" }))
    expect(await screen.findByText("Your plan's agent limit (1) was reached. Remove an agent or change your plan to create another.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/billing")
  })

  it("turns answering on only after a confirmation naming the channels, then opens the agent", async () => {
    const u = user()
    await toReview(u)
    createAttendeAgentAction.mockResolvedValueOnce({ success: true, data: agentViewFixture() })
    await u.click(screen.getByRole("button", { name: "Create agent" }))
    await screen.findByRole("heading", { name: "Agent created, still paused" })
    expect(screen.getByText("Luna will answer new messages on:")).toBeInTheDocument()

    await u.click(screen.getByRole("button", { name: /Turn answering on/ }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Turn on this agent?")).toBeInTheDocument()
    expect(within(dialog).getByText("Channels: Main (WhatsApp)")).toBeInTheDocument()
    expect(within(dialog).getByText("You have not checked the rules since the last change.")).toBeInTheDocument()
    expect(goLiveAttendeAgentAction).not.toHaveBeenCalled()

    goLiveAttendeAgentAction.mockResolvedValueOnce({ success: true, data: agentViewFixture({ status: "live" }) })
    await u.click(within(dialog).getByRole("button", { name: "Turn on" }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/ai-agents/a1"))
    expect(goLiveAttendeAgentAction).toHaveBeenCalledWith("a1")
    expect(window.sessionStorage.length).toBe(0)
  })

  it("keeps Turn answering on blocked while the agent knows too little", async () => {
    const u = user()
    await toReview(u)
    createAttendeAgentAction.mockResolvedValueOnce({ success: true, data: agentViewFixture({ form: { businessName: "Clinic" } }) })
    await u.click(screen.getByRole("button", { name: "Create agent" }))
    await screen.findByRole("heading", { name: "Agent created, still paused" })
    expect(screen.getByRole("button", { name: /Turn answering on/ })).toBeDisabled()
    expect(screen.getByText(/Before turning it on, complete the business description or add a document/)).toBeInTheDocument()
  })

  it("resumes on the last step after a refresh once the agent exists", async () => {
    const u = user()
    await toReview(u)
    createAttendeAgentAction.mockResolvedValueOnce({ success: true, data: agentViewFixture() })
    await u.click(screen.getByRole("button", { name: "Create agent" }))
    await screen.findByRole("heading", { name: "Agent created, still paused" })
    getAttendeAgentAction.mockResolvedValue({ success: true, data: agentViewFixture() })

    await act(async () => {
      document.body.innerHTML = ""
    })
    renderWizard({ initialTemplateKey: "sdr" })
    expect(await screen.findByRole("heading", { name: "Agent created, still paused" })).toBeInTheDocument()
    await waitFor(() => expect(getAttendeAgentAction).toHaveBeenCalledWith("a1"))
  })
})
