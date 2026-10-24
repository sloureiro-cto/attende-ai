import { fireEvent, render, screen } from "@testing-library/react"
import { SignupAccountStep } from "./SignupAccountStep"

// The Radix checkbox measures itself with ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))

const base = {
  plans: [],
  planSlug: "attende_starter" as const,
  onPlanChange: jest.fn(),
  initial: { name: "", email: "", businessName: "" },
  error: null,
  emailInUse: false,
  isLoading: false,
}

const fill = () => {
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Maria Silva" } })
  fireEvent.change(screen.getByLabelText("Work e-mail"), { target: { value: "maria@empresa.com.br" } })
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Segura#1" } })
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Clínica Sorriso" } })
}

describe("SignupAccountStep", () => {
  it("blocks the submit and explains each missing field", () => {
    const onSubmit = jest.fn()
    render(<SignupAccountStep {...base} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByText("Fill in this field.").length).toBeGreaterThan(1)
    expect(screen.getByText("Accept the terms to continue.")).toBeInTheDocument()
  })

  it("submits the typed values once the terms are accepted", () => {
    const onSubmit = jest.fn()
    render(<SignupAccountStep {...base} onSubmit={onSubmit} />)
    fill()
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Maria Silva",
      email: "maria@empresa.com.br",
      password: "Segura#1",
      businessName: "Clínica Sorriso",
      acceptedTerms: true,
    })
  })

  it("rejects a weak password before calling the server", () => {
    const onSubmit = jest.fn()
    render(<SignupAccountStep {...base} onSubmit={onSubmit} />)
    fill()
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "abc#12" } })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument()
  })

  it("says which password rule is missing", () => {
    const onSubmit = jest.fn()
    render(<SignupAccountStep {...base} onSubmit={onSubmit} />)
    fill()
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "abcdefgh1" } })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Add at least one special character, like ! or #.")).toBeInTheDocument()
  })

  it("shows the server error and a sign-in link when the e-mail is taken", () => {
    render(<SignupAccountStep {...base} error="This e-mail already has an account." emailInUse onSubmit={jest.fn()} />)
    expect(screen.getByRole("alert")).toHaveTextContent("This e-mail already has an account.")
    // Signing in brings the person back to the card step of this signup.
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]!.getAttribute("href")).toMatch(
      /^\/login\?callbackUrl=%2Fsignup%3Fexisting%3D1%26plan%3D/
    )
  })

  it("lets the user pick a plan", () => {
    const onPlanChange = jest.fn()
    render(<SignupAccountStep {...base} onPlanChange={onPlanChange} onSubmit={jest.fn()} />)
    fireEvent.click(screen.getByRole("radio", { name: /Growth/ }))
    expect(onPlanChange).toHaveBeenCalledWith("attende_growth")
  })
})
