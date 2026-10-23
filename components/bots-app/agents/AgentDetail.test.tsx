import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { agentViewFixture, sdrTemplateFixture } from "lib/attende/agents/fixtures"
import type { BotsLine } from "lib/bots-app/lines"
import { AgentDetail } from "./AgentDetail"
import { resetHandoffMembersCache } from "./fields/HandoffTargetField"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
const showToast = jest.fn()
jest.mock("app/utils/showToast", () => ({ showToast: (...a: unknown[]) => showToast(...a) }))
const updateAttendeAgentSetupAction = jest.fn()
const getAttendeAgentAction = jest.fn()
const listHandoffMembersAction = jest.fn()
const goLiveAttendeAgentAction = jest.fn()
jest.mock("actions/attende/agents", () => ({
  updateAttendeAgentSetupAction: (...a: unknown[]) => updateAttendeAgentSetupAction(...a),
  goLiveAttendeAgentAction: (...a: unknown[]) => goLiveAttendeAgentAction(...a),
  pauseAttendeAgentAction: jest.fn(),
  testAttendeAgentAction: jest.fn(),
  listAgentKnowledgeAction: jest.fn().mockResolvedValue({ success: true, data: [] }),
  deleteAgentKnowledgeAction: jest.fn(),
  getAttendeAgentAction: (...a: unknown[]) => getAttendeAgentAction(...a),
  listHandoffMembersAction: (...a: unknown[]) => listHandoffMembersAction(...a),
}))

const line = (id: string, label: string, status: BotsLine["status"] = "connected"): BotsLine => ({
  id,
  channel: "whatsapp",
  label,
  identifier: null,
  transport: "whatsapp_qr",
  status,
  rawStatus: status,
  lastEventAt: null,
  lastEventKind: null,
  choiceDelivery: "buttons",
  bots: [],
})

const form = { businessName: "Clinic", businessDescription: "We clean, whiten and fix teeth for families in the city center, with evening hours.", assistantName: "Luna", tone: "friendly", sdr: { qualificationQuestions: ["Budget?"] } }
const agent = agentViewFixture({ form })
const renderDetail = (over: Partial<Parameters<typeof AgentDetail>[0]> = {}) =>
  render(<AgentDetail agent={agent} template={sdrTemplateFixture} lines={[line("s1", "Main"), line("s2", "Support")]} documents={[]} {...over} />)

beforeEach(() => {
  jest.clearAllMocks()
  resetHandoffMembersCache()
  listHandoffMembersAction.mockResolvedValue({ success: true, data: [] })
})

describe("AgentDetail", () => {
  it("shows the state, what it means, the channels and the simulation", () => {
    renderDetail()
    expect(screen.getByRole("heading", { level: 1, name: "SDR · Clinic" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Paused")).toBeInTheDocument()
    expect(screen.getByText("Attached to 1 channel, but paused: it answers no one until you turn it on.")).toBeInTheDocument()
    expect(screen.getByText("Rules check, not an AI reply")).toBeInTheDocument()
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false")
    const channels = screen.getByRole("region", { name: "Channels" })
    expect(within(channels).getByText("Main")).toBeInTheDocument()
    expect(within(channels).getByText("Agent paused")).toBeInTheDocument()
  })

  it("explains that a live agent can still be taken over per conversation in the inbox", () => {
    renderDetail({ agent: { ...agent, status: "live", lines: [{ ...agent.lines[0]!, active: true }] } })
    expect(screen.getByText("On in 1 channel")).toBeInTheDocument()
    expect(screen.getByText(/To handle one conversation yourself, use Take over in the inbox/)).toBeInTheDocument()
  })

  it("confirms before turning on, then shows the confirmed state", async () => {
    goLiveAttendeAgentAction.mockResolvedValue({ success: true, data: agentViewFixture({ form, status: "live", liveSince: "2026-10-22T10:00:00Z", lines: [{ ...agent.lines[0]!, active: true }] }) })
    renderDetail()
    await userEvent.click(screen.getByRole("switch"))
    expect(await screen.findByText("Turn on this agent?")).toBeInTheDocument()
    expect(screen.getByText("No documents were added, so the agent only knows what you typed.")).toBeInTheDocument()
    expect(screen.getByText("Channels: Main (WhatsApp)")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Turn on" }))
    expect(await screen.findByRole("switch")).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText("Answers on this channel")).toBeInTheDocument()
  })

  it("keeps Turn on off until the agent knows the business, and says how to fix it", async () => {
    renderDetail({ agent: { ...agent, form: { ...form, businessDescription: "" } }, documents: [{ documentId: "d1", name: "prices.pdf", mimeType: "application/pdf", sizeBytes: 10, uploadedAt: "2026-10-22T10:00:00Z", indexStatus: "processing" }] })
    expect(screen.getByRole("switch")).toBeDisabled()
    expect(screen.getByText("Before turning it on, complete the business description or add a document and wait until it is read.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Add documents" }))
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Reading")).toBeInTheDocument()
  })

  it("attaches a channel only once the server confirms", async () => {
    let resolve: (v: unknown) => void = () => {}
    updateAttendeAgentSetupAction.mockReturnValue(new Promise((r) => (resolve = r)))
    renderDetail()
    const channels = screen.getByRole("region", { name: "Channels" })
    await userEvent.selectOptions(within(channels).getByLabelText("Channel to attach"), "whatsapp:s2")
    await userEvent.click(within(channels).getByRole("button", { name: "Attach" }))
    expect(updateAttendeAgentSetupAction).toHaveBeenCalledWith("a1", {
      form,
      lines: [
        { channel: "whatsapp", sessionId: "s1" },
        { channel: "whatsapp", sessionId: "s2" },
      ],
    })
    expect(within(channels).getByRole("button", { name: "Saving…" })).toBeDisabled()
    expect(within(channels).queryByText("Support")).not.toBeInTheDocument()
    resolve({ success: true, data: { ...agent, lines: [...agent.lines, { channel: "whatsapp", sessionId: "s2", label: "Support", exists: true, connected: true, active: false }] } })
    expect(await within(channels).findByText("Support")).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith("success", "Channel attached.")
    expect(screen.getByText("Attached to 2 channels, but paused: it answers no one until you turn it on.")).toBeInTheDocument()
  })

  it("keeps the channels as they were and explains a failed detach", async () => {
    updateAttendeAgentSetupAction.mockResolvedValue({ success: false, status: 0, message: "network" })
    renderDetail()
    const channels = screen.getByRole("region", { name: "Channels" })
    await userEvent.click(within(channels).getByRole("button", { name: "Detach Main" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("It is the agent's only channel: it will answer no one until you attach another.")).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Detach" }))
    expect(updateAttendeAgentSetupAction).toHaveBeenCalledWith("a1", { form, lines: [] })
    expect(await within(dialog).findByText("We could not reach the server. Check your connection.")).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(within(channels).getByText("Main")).toBeInTheDocument()
    expect(screen.getByText("Paused")).toBeInTheDocument()
  })

  it("shows the setup as compact sections with real summaries", () => {
    renderDetail({ initialTab: "setup" })
    const business = screen.getByRole("region", { name: "Business and products" })
    expect(within(business).getByText(/Clinic · No products registered/)).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Identity and language" })).toHaveTextContent("Luna · Portuguese · Friendly")
    expect(screen.getByRole("region", { name: "Hours" })).toHaveTextContent("24 hours, every day")
    expect(screen.getByRole("region", { name: "Advanced" })).toHaveTextContent("up to 40 replies per contact per day (default)")
    expect(screen.queryByLabelText(/Business name/)).not.toBeInTheDocument()
  })

  it("saves one section over the latest saved form, keeping other sections and changes made elsewhere", async () => {
    // Someone changed the tone elsewhere since the page loaded: it must survive this save.
    const latest = { ...agent, form: { ...form, tone: "formal" }, updatedAt: "2026-10-22T12:00:00Z" }
    getAttendeAgentAction.mockResolvedValue({ success: true, data: latest })
    updateAttendeAgentSetupAction.mockImplementation(async (_id: string, input: { form: Record<string, unknown> }) => ({ success: true, data: { ...latest, form: input.form, status: "live" } }))
    renderDetail({ initialTab: "setup" })
    await userEvent.click(screen.getByRole("button", { name: "Edit Business and products" }))
    const name = screen.getByLabelText(/Business name/)
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    await userEvent.clear(name)
    await userEvent.type(name, "Clinic Two")
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateAttendeAgentSetupAction).toHaveBeenCalledTimes(1))
    const sent = updateAttendeAgentSetupAction.mock.calls[0]![1] as { form: Record<string, unknown>; lines?: unknown }
    expect(sent.form).toMatchObject({ businessName: "Clinic Two", tone: "formal", sdr: { qualificationQuestions: ["Budget?"] } })
    expect(sent.lines).toBeUndefined()
    expect(await screen.findByText("Saved. It applies to the next messages the agent answers.")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Business and products" })).toHaveTextContent("Clinic Two")
  })

  it("keeps what was typed when saving fails, and asks before discarding", async () => {
    getAttendeAgentAction.mockResolvedValue({ success: true, data: agent })
    updateAttendeAgentSetupAction.mockResolvedValue({ success: false, status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "agents", limit: 2 } })
    renderDetail({ initialTab: "setup" })
    await userEvent.click(screen.getByRole("button", { name: "Edit Business and products" }))
    await userEvent.type(screen.getByLabelText(/Business name/), "!")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Your plan's agent limit (2) was reached. Remove an agent or change your plan to create another.")).toBeInTheDocument()
    expect(screen.getByLabelText(/Business name/)).toHaveValue("Clinic!")

    await userEvent.click(screen.getByRole("button", { name: "Edit Identity and language" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Discard changes?")).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }))
    expect(screen.getByLabelText(/Business name/)).toHaveValue("Clinic!")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Discard" }))
    expect(screen.queryByLabelText(/Business name/)).not.toBeInTheDocument()
  })

  it("does not overwrite a section someone else changed meanwhile", async () => {
    getAttendeAgentAction.mockResolvedValue({ success: true, data: { ...agent, form: { ...form, businessName: "Other name" }, updatedAt: "2026-10-22T12:00:00Z" } })
    renderDetail({ initialTab: "setup" })
    await userEvent.click(screen.getByRole("button", { name: "Edit Business and products" }))
    await userEvent.type(screen.getByLabelText(/Business name/), "!")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText(/This section was changed elsewhere/)).toBeInTheDocument()
    expect(updateAttendeAgentSetupAction).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Reload section" }))
    expect(screen.getByLabelText(/Business name/)).toHaveValue("Other name")
  })

  it("lists products compactly and tells no value, zero, starting at and on request apart", async () => {
    const withProducts = agentViewFixture({
      form: {
        ...form,
        offerings: [
          { name: "Cleaning", price: "R$ 150,00 por serviço" },
          { name: "Check-up", price: "R$ 0,00" },
          { name: "Plan", price: "a partir de US$ 39,00/mês" },
          { name: "Implant", price: "sob consulta" },
          { name: "Whitening" },
        ],
      },
    })
    renderDetail({ agent: withProducts, initialTab: "setup" })
    expect(screen.getByRole("region", { name: "Business and products" })).toHaveTextContent("5 products")
    await userEvent.click(screen.getByRole("button", { name: "Edit Business and products" }))
    const list = screen.getByRole("list", { name: "Products and services" })
    expect(within(list).getByText("Fixed price · R$150.00 · Per service")).toBeInTheDocument()
    expect(within(list).getByText("Fixed price · R$0.00")).toBeInTheDocument()
    expect(within(list).getByText("Starting at · $39.00 · Monthly")).toBeInTheDocument()
    expect(within(list).getByText("On request")).toBeInTheDocument()
    expect(within(list).getByText("No value")).toBeInTheDocument()

    await userEvent.click(within(list).getByRole("button", { name: "Remove Implant" }))
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }))
    expect(within(list).queryByText("Implant")).not.toBeInTheDocument()
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument()
  })

  it("lets the handoff go to a specific member and flags one who left the team", async () => {
    listHandoffMembersAction.mockResolvedValue({ success: true, data: [{ id: "u1", name: "Ana", email: "ana@x.com" }] })
    const gone = agentViewFixture({ form: { ...form, handoff: { triggers: [], keywords: [], target: { kind: "user", userId: "u9" } } } })
    renderDetail({ agent: gone, initialTab: "setup" })
    expect(await within(screen.getByRole("region", { name: "Human handling" })).findByText(/Person removed from the team/)).toBeInTheDocument()
  })

  it("says the documents could not be loaded instead of showing none", () => {
    renderDetail({ initialTab: "knowledge", documentsError: { success: false, status: 0, message: "network" } })
    expect(screen.getByText("We could not reach the server. Check your connection.")).toBeInTheDocument()
    expect(screen.queryByText("No documents yet")).not.toBeInTheDocument()
  })

  it("links the activity tab to the AI conversations in the inbox", async () => {
    renderDetail({ initialTab: "activity" })
    expect(screen.getByRole("link", { name: "Open conversations" })).toHaveAttribute("href", "/inbox?filter=ai")
  })
})
