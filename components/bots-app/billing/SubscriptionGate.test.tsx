import { render, screen } from "@testing-library/react"
import { SubscriptionGate } from "./SubscriptionGate"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))

describe("SubscriptionGate", () => {
  it("blocks with the trial-ended message and points to billing and to a human", () => {
    render(<SubscriptionGate code="ATTENDE_TRIAL_EXPIRED" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Your free trial has ended")
    expect(screen.getByText(/agents, documents and conversations are kept/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/billing")
    const talk = screen.getByRole("link", { name: "Talk to us" })
    expect(talk).toHaveAttribute("href", expect.stringContaining("app.jsynq.com/book/"))
    expect(talk).toHaveAttribute("target", "_blank")
    expect(talk).toHaveAttribute("rel", expect.stringContaining("noopener"))
  })

  it("uses its own message for an inactive subscription", () => {
    render(<SubscriptionGate code="ATTENDE_SUBSCRIPTION_INACTIVE" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Your subscription is not active")
  })

  it.each([undefined, null, "ATTENDE_QUOTA_EXCEEDED", "SOMETHING_ELSE"])("renders nothing for %s", (code) => {
    const { container } = render(<SubscriptionGate code={code} />)
    expect(container).toBeEmptyDOMElement()
  })
})
