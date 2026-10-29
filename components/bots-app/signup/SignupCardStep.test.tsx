import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SignupCardStep } from "./SignupCardStep"

const mockSetupIntent = jest.fn()
const mockStartTrial = jest.fn()
const mockSubmit = jest.fn()
const mockConfirmSetup = jest.fn()

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("actions/attende/signup", () => ({
  createSignupSetupIntentAction: (...args: unknown[]) => mockSetupIntent(...args),
  startAttendeTrialAction: (...args: unknown[]) => mockStartTrial(...args),
}))
jest.mock("@stripe/stripe-js", () => ({ loadStripe: jest.fn(() => Promise.resolve({})) }))
jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children, options }: { children: React.ReactNode; options: { clientSecret: string } }) => <div data-secret={options.clientSecret}>{children}</div>,
  PaymentElement: () => <div>card fields</div>,
  useStripe: () => ({ confirmSetup: (...args: unknown[]) => mockConfirmSetup(...args) }),
  useElements: () => ({ submit: (...args: unknown[]) => mockSubmit(...args) }),
}))

const plan = { slug: "attende-essencial" as const, tier: "essencial" as const, name: "Starter", limits: {}, prices: [{ currency: "usd", interval: "month" as const, amount: 9900 }] }
const trial = { days: 7, requiresCard: true, outboundCap: 50 }

const withKey = (key: string | undefined) => {
  if (key) process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = key
  else delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
}

beforeEach(() => {
  jest.clearAllMocks()
  withKey("pk_test_123")
  mockSetupIntent.mockResolvedValue({ success: true, data: { clientSecret: "seti_1_secret_a" } })
  mockSubmit.mockResolvedValue({})
  mockConfirmSetup.mockResolvedValue({ setupIntent: { payment_method: "pm_1" } })
  mockStartTrial.mockResolvedValue({ success: true, data: { workspaceId: "w1", subscriptionStatus: "trialing" } })
})

describe("SignupCardStep", () => {
  it("shows the trial promise with the synced price, then starts the trial with the confirmed card", async () => {
    const onStarted = jest.fn()
    render(<SignupCardStep planSlug="attende-essencial" planName="Starter" plan={plan} trial={trial} onStarted={onStarted} />)

    expect(await screen.findByText("card fields")).toBeInTheDocument()
    expect(screen.getByText("7 days free")).toBeInTheDocument()
    expect(screen.getByText(/Then \$99 per month\. Cancel anytime\./)).toBeInTheDocument()
    expect(screen.getByText(/up to 50 messages/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }))
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith({ workspaceId: "w1", subscriptionStatus: "trialing" }))
    expect(mockStartTrial).toHaveBeenCalledWith({ paymentMethodId: "pm_1", planSlug: "attende-essencial" })
  })

  it("says the price comes later when the plan is not synced", async () => {
    render(<SignupCardStep planSlug="attende-essencial" planName="Starter" plan={undefined} trial={trial} onStarted={jest.fn()} />)
    expect(await screen.findByText(/Then the price of your plan/)).toBeInTheDocument()
  })

  it("shows a friendly message when Stripe rejects the card and does not call the backend", async () => {
    mockConfirmSetup.mockResolvedValue({ error: { message: "Your card number is incomplete." } })
    render(<SignupCardStep planSlug="attende-essencial" planName="Starter" plan={plan} trial={trial} onStarted={jest.fn()} />)
    await screen.findByText("card fields")
    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Your card number is incomplete.")
    expect(mockStartTrial).not.toHaveBeenCalled()
  })

  it("asks for a fresh card form after a declined card, keeping the signup", async () => {
    mockStartTrial.mockResolvedValueOnce({ success: false, status: 402, reference: "SIGNUP_PAYMENT_FAILED" })
    mockSetupIntent.mockResolvedValueOnce({ success: true, data: { clientSecret: "seti_1_secret_a" } }).mockResolvedValueOnce({ success: true, data: { clientSecret: "seti_2_secret_b" } })
    const onStarted = jest.fn()
    const { container } = render(<SignupCardStep planSlug="attende-essencial" planName="Starter" plan={plan} trial={trial} onStarted={onStarted} />)
    await screen.findByText("card fields")
    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }))

    await waitFor(() => expect(mockSetupIntent).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(container.querySelector('[data-secret="seti_2_secret_b"]')).toBeInTheDocument())
    expect(onStarted).not.toHaveBeenCalled()
  })

  it("retries with the same card, without confirming the SetupIntent twice, after an error unrelated to the card", async () => {
    mockStartTrial.mockResolvedValueOnce({ success: false, status: 409, reference: "SIGNUP_TRIAL_IN_PROGRESS" })
    const onStarted = jest.fn()
    render(<SignupCardStep planSlug="attende-essencial" planName="Starter" plan={plan} trial={trial} onStarted={onStarted} />)
    await screen.findByText("card fields")

    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("already being created")
    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }))

    await waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1))
    expect(mockConfirmSetup).toHaveBeenCalledTimes(1)
    expect(mockStartTrial).toHaveBeenCalledTimes(2)
    expect(mockSetupIntent).toHaveBeenCalledTimes(1)
  })

  it("a card or e-mail that already had a trial: offers to subscribe without it, with the same confirmed card", async () => {
    mockStartTrial.mockResolvedValueOnce({ success: false, status: 409, reference: "SIGNUP_TRIAL_ALREADY_USED" })
    mockStartTrial.mockResolvedValueOnce({ success: true, data: { workspaceId: "w1", subscriptionStatus: "active" } })
    const onStarted = jest.fn()
    render(<SignupCardStep planSlug="attende-essencial" planName="Essencial" plan={plan} trial={trial} onStarted={onStarted} />)
    await screen.findByText("card fields")
    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("You can subscribe without the trial.")
    expect(screen.getByTestId("no-trial-offer")).toHaveTextContent("$99 is charged now to this card")
    expect(screen.queryByText("7 days free")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Subscribe and pay now" }))

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith({ workspaceId: "w1", subscriptionStatus: "active" }))
    expect(mockStartTrial).toHaveBeenLastCalledWith({ paymentMethodId: "pm_1", planSlug: "attende-essencial", withoutTrial: true })
    expect(mockConfirmSetup).toHaveBeenCalledTimes(1)
  })

  it("offers a retry when the SetupIntent cannot be created", async () => {
    mockSetupIntent.mockResolvedValueOnce({ success: false, status: 429, reference: "SIGNUP_RATE_LIMITED" })
    render(<SignupCardStep planSlug="attende-essencial" planName="Starter" plan={plan} trial={trial} onStarted={jest.fn()} />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("card fields")).toBeInTheDocument()
  })

  it("explains that payments are not configured when the publishable key is missing", () => {
    withKey(undefined)
    render(<SignupCardStep planSlug="attende-essencial" planName="Starter" plan={plan} trial={trial} onStarted={jest.fn()} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Payments are not configured")
    expect(mockSetupIntent).not.toHaveBeenCalled()
  })
})
