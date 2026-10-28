import { render, screen } from "@testing-library/react"
import { ErrorNotice } from "../PlanNotice"

let mockLanguage = "english"
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: mockLanguage }) }))

describe("ErrorNotice: an automation runs on the agent's lines", () => {
  beforeEach(() => {
    mockLanguage = "english"
  })

  it("names the lines and links to the automations, without a retry", () => {
    const onRetry = jest.fn()
    render(
      <ErrorNotice
        error={{
          success: false,
          status: 409,
          code: "ATTENDE_AUTOMATION_ON_LINE",
          details: {
            lines: [
              { channel: "whatsapp", sessionId: "S1" },
              { channel: "sms", sessionId: "s2" },
            ],
          },
        }}
        onRetry={onRetry}
        lineName={(l) => (l.sessionId === "S1" ? "Sales" : undefined)}
      />
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "An active automation already answers on Sales (WhatsApp) and SMS."
    )
    expect(screen.getByRole("link", { name: "Open automations" })).toHaveAttribute("href", "/bots")
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })

  it("speaks Brazilian Portuguese", () => {
    mockLanguage = "portuguese"
    render(<ErrorNotice error={{ success: false, status: 409, code: "ATTENDE_AUTOMATION_ON_LINE" }} />)
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Uma automação ativa já responde em um dos canais deste agente."
    )
    expect(screen.getByRole("link", { name: "Abrir automações" })).toBeInTheDocument()
  })
})
