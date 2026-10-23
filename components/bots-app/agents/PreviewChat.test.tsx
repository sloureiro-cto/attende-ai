import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { TestResult } from "lib/attende/agents/types"
import { PreviewChat } from "./PreviewChat"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("actions/attende/agents", () => ({ testAttendeAgentAction: jest.fn() }))

const result = (over: Partial<TestResult> = {}): TestResult => ({
  mode: "dry_run",
  nothingSent: true,
  passed: true,
  wouldReply: true,
  reason: "ok",
  handoff: null,
  checks: [
    { key: "prompt", ok: true, severity: "blocking" },
    { key: "lines_connected", ok: true, severity: "blocking" },
    { key: "knowledge", ok: false, severity: "info" },
  ],
  ...over,
})

describe("PreviewChat", () => {
  it("is labelled as a rules check, not a conversation, and starts empty", () => {
    render(<PreviewChat agentId="a1" run={jest.fn()} />)
    expect(screen.getByText("Rules check, not an AI reply")).toBeInTheDocument()
    expect(screen.getByText(/It is not a conversation with the AI/)).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Check result" })).toHaveTextContent("Results of your checks appear here.")
  })

  it("shows the customer message, the outcome and the checks", async () => {
    const run = jest.fn().mockResolvedValue({ success: true, data: result() })
    const onResult = jest.fn()
    render(<PreviewChat agentId="a1" run={run} onResult={onResult} />)
    await userEvent.type(screen.getByLabelText("Example customer message (optional)"), "How much is a cleaning?")
    await userEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(run).toHaveBeenCalledWith("a1", { message: "How much is a cleaning?" })
    expect(await screen.findByText("Message checked: How much is a cleaning?")).toBeInTheDocument()
    expect(screen.getByText("The rules allow the agent to answer this message.")).toBeInTheDocument()
    expect(screen.getByText("Instructions are ready")).toBeInTheDocument()
    expect(screen.getByText("Documents available")).toBeInTheDocument()
    expect(screen.getByText("Rules check passed")).toBeInTheDocument()
    expect(screen.getByText("(recommended)")).toBeInTheDocument()
    expect(screen.getByLabelText("Example customer message (optional)")).toHaveValue("")
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ passed: true }))
  })

  it.each([
    [{ reason: "handoff_requested", wouldReply: false, handoff: { by: "keyword" as const, value: "agent" } }, "This message would call a person (agent)."],
    [{ reason: "outside_working_hours", wouldReply: false }, "It is outside working hours, so your agent would stay quiet."],
    [{ reason: "no_line_connected", wouldReply: false, passed: false }, "No channel is connected, so nothing would be answered."],
  ])("explains %j in plain words", async (over, text) => {
    const run = jest.fn().mockResolvedValue({ success: true, data: result(over) })
    render(<PreviewChat agentId="a1" run={run} />)
    await userEvent.type(screen.getByLabelText("Example customer message (optional)"), "hi")
    await userEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it("shows a friendly error when the check fails to run", async () => {
    const run = jest.fn().mockResolvedValue({ success: false, status: 0, message: "network" })
    render(<PreviewChat agentId="a1" run={run} />)
    await userEvent.type(screen.getByLabelText("Example customer message (optional)"), "hello")
    await userEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(await screen.findByText("We could not reach the server. Check your connection.")).toBeInTheDocument()
    // The message is kept so the retry sends the same text.
    expect(screen.getByLabelText("Example customer message (optional)")).toHaveValue("hello")
    run.mockResolvedValueOnce({ success: true, data: result() })
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(run).toHaveBeenLastCalledWith("a1", { message: "hello" })
    expect(await screen.findByText("The rules allow the agent to answer this message.")).toBeInTheDocument()
  })

  it("shows the server's own message when the error has no known code", async () => {
    const run = jest.fn().mockResolvedValue({ success: false, status: 500, message: "Agent configuration missing" })
    render(<PreviewChat agentId="a1" run={run} />)
    await userEvent.click(screen.getByRole("button", { name: "Check without a message" }))
    expect(run).toHaveBeenCalledWith("a1", {})
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument()
    expect(screen.getByText("Server response: Agent configuration missing")).toBeInTheDocument()
  })

  it("says who would be called when the handoff has no keyword", async () => {
    const run = jest.fn().mockResolvedValue({ success: true, data: result({ reason: "handoff_requested", wouldReply: false, handoff: { by: "builtin", value: "" } }) })
    render(<PreviewChat agentId="a1" run={run} />)
    await userEvent.type(screen.getByLabelText("Example customer message (optional)"), "talk to a human")
    await userEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(await screen.findByText("This message would call a person.")).toBeInTheDocument()
  })
})
