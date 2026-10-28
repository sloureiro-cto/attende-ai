import type { AutomationsTFn } from "../useAutomationsT"
import { automationErrorText, hasOwnErrorText } from "../automationErrorText"
import { resolveAgentConflict, showAutomationError } from "../agentConflict"

const listAttendeAgentsAction = jest.fn()
jest.mock("actions/attende/agents", () => ({ listAttendeAgentsAction: () => listAttendeAgentsAction() }))
const showToast = jest.fn()
jest.mock("app/utils/showToast", () => ({ showToast: (...a: unknown[]) => showToast(...a) }))

/** Echoes the key and its values, so the assertions read what was asked for. */
const t = ((key: string, values?: Record<string, string | number>) =>
  values ? `${key} ${JSON.stringify(values)}` : key) as AutomationsTFn

const agent = (
  id: string,
  name: string,
  lines: Array<{ channel: "whatsapp" | "sms"; sessionId: string; label?: string }>
) => ({ id, agentId: `j${id}`, name, lines })

beforeEach(() => jest.clearAllMocks())

describe("automation refused because an AI agent answers on the same account", () => {
  it("names the accounts and the Attende agent that answers them", async () => {
    listAttendeAgentsAction.mockResolvedValue({
      success: true,
      data: [agent("a1", "Ana", [{ channel: "whatsapp", sessionId: "S1", label: "Sales" }]), agent("a2", "Bia", [])],
    })
    const out = await resolveAgentConflict(
      [
        { channel: "whatsapp", sessionId: "s1" },
        { channel: "sms", sessionId: "x" },
      ],
      t,
      (s) => (s.sessionId === "x" ? "Support SMS" : undefined)
    )
    expect(out).toEqual({ lines: ["Sales", "Support SMS"], agent: { id: "a1", name: "Ana" } })
  })

  it("never shows a raw id: falls back to the channel name, and to the agents list without an owner", async () => {
    listAttendeAgentsAction.mockResolvedValue({ success: false, status: 503 })
    const out = await resolveAgentConflict([{ channel: "whatsapp", sessionId: "s9" }], t)
    expect(out).toEqual({ lines: ["whatsappLiteNav"], agent: null })
  })

  it("shows a toast that stays, with a way to open the agent", async () => {
    listAttendeAgentsAction.mockResolvedValue({
      success: true,
      data: [agent("a1", "Ana", [{ channel: "whatsapp", sessionId: "s1", label: "Sales" }])],
    })
    const navigate = jest.fn()
    await showAutomationError(
      {
        error: "An AI agent already answers…",
        code: "AUTOMATION_SESSION_HAS_AGENT",
        sessions: [{ channel: "whatsapp", sessionId: "s1" }],
      },
      t,
      "advancedAutomationSaveError",
      { language: "english", navigate }
    )
    const [type, message, config] = showToast.mock.calls[0]
    expect(type).toBe("error")
    expect(message).toBe('advancedAutomationErrSessionHasAgent {"lines":"Sales"}')
    expect(config).toMatchObject({ autoClose: false, actionLabel: 'advancedAutomationOpenAgent {"name":"Ana"}' })
    config.onAction()
    expect(navigate).toHaveBeenCalledWith("/ai-agents/a1")
  })

  it("other errors keep their own text", async () => {
    await showAutomationError({ error: "", code: "JSYNQ_UNAVAILABLE" }, t, "advancedAutomationSaveError", {
      language: "english",
      navigate: jest.fn(),
    })
    expect(showToast).toHaveBeenCalledWith("error", "advancedAutomationErrServiceUnavailable")
    expect(listAttendeAgentsAction).not.toHaveBeenCalled()
  })
})

describe("automationErrorText", () => {
  it("shows a quota or plan message, never the API's English sentence", () => {
    expect(
      automationErrorText(
        { error: "Your plan reached its limit", code: "ATTENDE_QUOTA_EXCEEDED" },
        t,
        "advancedAutomationSaveError"
      )
    ).toBe("advancedAutomationErrQuota")
    expect(automationErrorText({ error: "x", code: "ATTENDE_TRIAL_EXPIRED" }, t, "advancedAutomationSaveError")).toBe(
      "advancedAutomationErrPlanInactive"
    )
    expect(hasOwnErrorText({ code: "ATTENDE_QUOTA_EXCEEDED" })).toBe(true)
  })

  it("keeps the API message for validation problems, and the fallback without one", () => {
    expect(automationErrorText({ error: "Name is required" }, t, "advancedAutomationSaveError")).toBe(
      "Name is required"
    )
    expect(automationErrorText({ error: "" }, t, "advancedAutomationSaveError")).toBe("advancedAutomationSaveError")
    expect(hasOwnErrorText({ code: "SOMETHING" })).toBe(false)
  })
})
