import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { BotsLoginForm } from "./BotsLoginForm"

const push = jest.fn()
const refresh = jest.fn()
const update = jest.fn(async () => null)
let searchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => searchParams,
}))
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  useSession: () => ({ update }),
}))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("hooks/useVerifyOtpTranslation", () => ({ useVerifyOtpTranslation: () => ({ t: (k: string) => k }) }))
jest.mock("hooks/useAuthErrorMessage", () => ({
  useAuthErrorMessage: () => ({ resolveAuthErrorMessage: (e: string) => `resolved:${e}` }),
}))
jest.mock("components/VerifyOtpForm/VerifyOtpForm", () => ({
  __esModule: true,
  default: ({ email }: { email: string }) => <div data-testid="otp-form">otp for {email}</div>,
}))
jest.mock("actions/auth/loginWithPassword", () => ({ loginWithPassword: jest.fn() }))
jest.mock("actions/auth/resendLoginOtp", () => ({ resendLoginOtp: jest.fn() }))
jest.mock("actions/auth/verifyLoginOtp", () => ({ verifyLoginOtp: jest.fn() }))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signIn } = require("next-auth/react") as { signIn: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loginWithPassword } = require("actions/auth/loginWithPassword") as { loginWithPassword: jest.Mock }

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: password } })
}
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

describe("BotsLoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchParams = new URLSearchParams()
  })

  it("renders the sign-in form and hides Google when it is not configured", () => {
    render(<BotsLoginForm googleEnabled={false} />)
    expect(screen.getByRole("heading", { name: /Sign in to Attende-ai/ })).toBeInTheDocument()
    expect(screen.queryByText(/Continue with Google/)).not.toBeInTheDocument()
  })

  it("links to the signup page for new customers", () => {
    render(<BotsLoginForm googleEnabled={false} />)
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/signup")
  })

  it("shows Google when configured", () => {
    render(<BotsLoginForm googleEnabled />)
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeInTheDocument()
  })

  it("shows an inline error for an invalid email without calling the server", async () => {
    render(<BotsLoginForm googleEnabled={false} />)
    fill("not-an-email", "secret")
    submit()
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid e-mail")
    expect(loginWithPassword).not.toHaveBeenCalled()
  })

  it("shows the resolved server error when credentials fail", async () => {
    loginWithPassword.mockResolvedValue({ success: false, error: "CREDENTIALS_FAILED", status: 401 })
    render(<BotsLoginForm googleEnabled={false} />)
    fill("a@b.co", "wrong")
    submit()
    expect(await screen.findByRole("alert")).toHaveTextContent("resolved:CREDENTIALS_FAILED")
    expect(signIn).not.toHaveBeenCalled()
  })

  it("signs in and goes to the default destination", async () => {
    loginWithPassword.mockResolvedValue({ success: true, data: { ok: true } })
    signIn.mockResolvedValue({ ok: true })
    render(<BotsLoginForm googleEnabled={false} />)
    fill("a@b.co", "right")
    submit()
    await waitFor(() => expect(push).toHaveBeenCalledWith("/bots"))
    expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "a@b.co", callbackUrl: "/bots" }))
    expect(update).toHaveBeenCalled()
  })

  it("honours a safe callbackUrl and ignores an unsafe one", async () => {
    loginWithPassword.mockResolvedValue({ success: true, data: { ok: true } })
    signIn.mockResolvedValue({ ok: true })

    searchParams = new URLSearchParams({ callbackUrl: "/bots/abc" })
    const { unmount } = render(<BotsLoginForm googleEnabled={false} />)
    fill("a@b.co", "right")
    submit()
    await waitFor(() => expect(push).toHaveBeenCalledWith("/bots/abc"))
    unmount()

    push.mockClear()
    searchParams = new URLSearchParams({ callbackUrl: "https://evil.example" })
    render(<BotsLoginForm googleEnabled={false} />)
    fill("a@b.co", "right")
    submit()
    await waitFor(() => expect(push).toHaveBeenCalledWith("/bots"))
  })

  it("moves to the OTP step when the account requires 2FA", async () => {
    loginWithPassword.mockResolvedValue({ success: true, data: { requiresOtp: true, loginChallengeId: "c1", expiresIn: 300 } })
    render(<BotsLoginForm googleEnabled={false} />)
    fill("a@b.co", "right")
    submit()
    expect(await screen.findByTestId("otp-form")).toHaveTextContent("otp for a@b.co")
    expect(signIn).not.toHaveBeenCalled()
  })
})
