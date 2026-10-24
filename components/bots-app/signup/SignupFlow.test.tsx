import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SignupFlow } from "./SignupFlow"

const mockCreate = jest.fn()
const mockVerify = jest.fn()
const mockResend = jest.fn()
const mockLogin = jest.fn()
const mockSignIn = jest.fn()
const mockUpdate = jest.fn()
const mockPush = jest.fn()
let startedCallback: ((data: unknown) => Promise<void> | void) | null = null

// The Radix checkbox measures itself with ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }) }))
jest.mock("next-auth/react", () => ({ signIn: (...args: unknown[]) => mockSignIn(...args), useSession: () => ({ update: mockUpdate }) }))
jest.mock("actions/auth/loginWithPassword", () => ({ loginWithPassword: (...args: unknown[]) => mockLogin(...args) }))
jest.mock("types/auth/login", () => ({ isLoginChallenge: (data: { loginChallengeId?: string }) => Boolean(data?.loginChallengeId) }))
jest.mock("actions/attende/signup", () => ({
  createSignupAction: (...args: unknown[]) => mockCreate(...args),
  verifySignupAction: (...args: unknown[]) => mockVerify(...args),
  resendSignupAction: (...args: unknown[]) => mockResend(...args),
}))
jest.mock("components/VerifyOtpForm/VerifyOtpForm", () => ({
  __esModule: true,
  default: ({ handleVerifyCode, email }: { handleVerifyCode: (code: string) => void; email: string }) => (
    <div>
      <span>otp for {email}</span>
      <button onClick={() => handleVerifyCode("123456")}>submit code</button>
    </div>
  ),
}))
jest.mock("./SignupCardStep", () => ({
  SignupCardStep: ({ planSlug, onStarted }: { planSlug: string; onStarted: (data: unknown) => Promise<void> | void }) => {
    startedCallback = onStarted
    return <div>card step for {planSlug}</div>
  },
}))

const catalog = { trial: { days: 7, requiresCard: true, outboundCap: 50 }, plans: [] }

const fillAccount = () => {
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Maria Silva" } })
  fireEvent.change(screen.getByLabelText("Work e-mail"), { target: { value: "Maria@Empresa.com.br" } })
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Segura#1" } })
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Clínica Sorriso" } })
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLogin.mockResolvedValue({ success: true, data: { id: "u1" } })
  mockSignIn.mockResolvedValue({ ok: true })
  mockUpdate.mockResolvedValue(undefined)
})

describe("SignupFlow", () => {
  it("walks account -> code -> card and signs in after the code", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { email: "maria@empresa.com.br", nextStep: "verify_email" } })
    mockVerify.mockResolvedValue({ success: true, data: { id: "u1" } })
    render(<SignupFlow catalog={catalog} initialPlan="growth" />)

    fillAccount()
    await screen.findByText("otp for maria@empresa.com.br")
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ email: "Maria@Empresa.com.br", businessName: "Clínica Sorriso", locale: "en", planSlug: "attende_growth" }))

    fireEvent.click(screen.getByText("submit code"))
    await screen.findByText("card step for attende_growth")
    expect(mockVerify).toHaveBeenCalledWith({ email: "maria@empresa.com.br", otp: "123456" })
    expect(mockSignIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "maria@empresa.com.br", password: "Segura#1", redirect: false }))
  })

  it("sends an e-mail that already has an account to sign in, then back to the card step", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { email: "maria@empresa.com.br", nextStep: "verify_email" } })
    mockVerify.mockResolvedValue({ success: false, status: 409, reference: "USER_EXISTS_UNMANAGED" })
    render(<SignupFlow catalog={catalog} initialPlan="growth" />)

    fillAccount()
    await screen.findByText("otp for maria@empresa.com.br")
    fireEvent.click(screen.getByText("submit code"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This e-mail already has an account. Sign in with it to start your trial."
    )
    const link = screen.getByRole("link", { name: "Sign in to continue" })
    expect(link).toHaveAttribute(
      "href",
      `/login?callbackUrl=${encodeURIComponent("/signup?existing=1&plan=attende_growth")}`
    )
    // No sign-in with the password typed here, and no code form to retry.
    expect(mockLogin).not.toHaveBeenCalled()
    expect(mockSignIn).not.toHaveBeenCalled()
    expect(screen.queryByText("submit code")).not.toBeInTheDocument()
  })

  it("explains a temporarily unavailable service on the code step", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { email: "maria@empresa.com.br", nextStep: "verify_email" } })
    mockVerify.mockResolvedValue({ success: false, status: 503, reference: "JSYNQ_UNAVAILABLE" })
    render(<SignupFlow catalog={catalog} />)
    fillAccount()
    await screen.findByText("otp for maria@empresa.com.br")
    fireEvent.click(screen.getByText("submit code"))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The service is temporarily unavailable. Wait a moment and try again."
    )
    expect(screen.getByText("submit code")).toBeInTheDocument()
  })

  it("maps a backend reference to a friendly message and keeps the user on the account step", async () => {
    mockCreate.mockResolvedValue({ success: false, status: 409, reference: "SIGNUP_EMAIL_IN_USE" })
    render(<SignupFlow catalog={catalog} />)
    fillAccount()
    expect(await screen.findByRole("alert")).toHaveTextContent("This e-mail already has an account")
    expect(screen.queryByText(/otp for/)).not.toBeInTheDocument()
  })

  it("shows the rate-limit message from the HTTP status when the reference is unknown", async () => {
    mockCreate.mockResolvedValue({ success: false, status: 429 })
    render(<SignupFlow catalog={catalog} />)
    fillAccount()
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts")
  })

  it("stays on the code step with a message when the code is wrong", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { email: "m@x.com", nextStep: "verify_email" } })
    mockVerify.mockResolvedValue({ success: false, status: 400, reference: "SIGNUP_OTP_INVALID" })
    render(<SignupFlow catalog={catalog} />)
    fillAccount()
    await screen.findByText(/otp for/)
    fireEvent.click(screen.getByText("submit code"))
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is not correct.")
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it("tells the user to sign in when the account verified but the session could not start", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { email: "m@x.com", nextStep: "verify_email" } })
    mockVerify.mockResolvedValue({ success: true, data: { id: "u1" } })
    mockSignIn.mockResolvedValue({ ok: false })
    render(<SignupFlow catalog={catalog} />)
    fillAccount()
    await screen.findByText(/otp for/)
    fireEvent.click(screen.getByText("submit code"))
    expect(await screen.findByRole("alert")).toHaveTextContent("could not sign you in")
  })

  it("refreshes the session with the new workspace and goes to onboarding once the trial started", async () => {
    render(<SignupFlow catalog={catalog} resumeAtCard initialPlan="scale" />)
    await screen.findByText("card step for attende_scale")
    await startedCallback!({ workspaceId: "w1" })
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ workspaceId: "w1" }))
    expect(mockPush).toHaveBeenCalledWith("/setup")
  })

  it("lets the user go back to fix the e-mail", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { email: "m@x.com", nextStep: "verify_email" } })
    render(<SignupFlow catalog={catalog} />)
    fillAccount()
    await screen.findByText(/otp for/)
    fireEvent.click(screen.getByRole("button", { name: "Use another e-mail" }))
    expect(await screen.findByLabelText("Work e-mail")).toBeInTheDocument()
  })
})
