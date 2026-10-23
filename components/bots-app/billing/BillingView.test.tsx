import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { BillingLoad } from "actions/attende/billing"
import type { AttendeSubscription, AttendeUsage } from "lib/attende/billing/model"
import { BillingView } from "./BillingView"

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const mockPortal = jest.fn()
const mockReload = jest.fn()
const mockToast = jest.fn()
const assign = jest.fn()

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("actions/attende/billing", () => ({
  openBillingPortalAction: (...args: unknown[]) => mockPortal(...args),
  getAttendeBillingAction: (...args: unknown[]) => mockReload(...args),
}))
jest.mock("app/utils/showToast", () => ({ showToast: (...args: unknown[]) => mockToast(...args) }))
jest.mock("./BillingInvoices", () => ({
  BillingInvoices: ({ workspaceId }: { workspaceId: string }) => <div>invoices of {workspaceId}</div>,
}))

type Data = Extract<BillingLoad, { success: true }>["data"]
const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
const sub = (over: Partial<AttendeSubscription> = {}): AttendeSubscription => ({
  planSlug: "attende_growth",
  status: "active",
  price: { amount: 99, currency: "USD", interval: "month", intervalCount: 1 },
  trialEndsAt: null,
  currentPeriodEnd: "2026-11-22T12:00:00.000Z",
  canceledAt: null,
  ...over,
})
const usage: AttendeUsage = { month: "2026-10", rows: [{ key: "aiReplies", used: 1234, limit: 5000 }], trialOutbound: null }
const load = (billing: Partial<Data["billing"]>, extra: Partial<Omit<Data, "billing">> = {}): BillingLoad => ({
  success: true,
  data: {
    workspaceId: "w1",
    billing: { tier: "attende_growth", status: "active", limits: { lines: 3, agents: 3, aiRepliesPerMonth: 5000, seats: 5, docs: 100 }, trialEndsAt: null, trialOutboundCap: 0, trialOutboundUsed: 0, ...billing },
    subscription: sub(),
    usage,
    ...extra,
  },
})

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, "location", { value: { assign }, writable: true })
  mockPortal.mockResolvedValue({ success: true, url: "https://billing.stripe.test/session" })
})

describe("BillingView: plan summary", () => {
  it("answers plan, price with currency and period, and the next charge of an active subscription", () => {
    render(<BillingView initial={load({})} />)
    expect(screen.getByText("Growth")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("$99.00 per month")).toBeInTheDocument()
    expect(screen.getByText(/Next charge on .*2026: \$99\.00 per month/)).toBeInTheDocument()
    expect(screen.getByText("invoices of w1")).toBeInTheDocument()
  })

  it("trial with a Stripe subscription: says when it ends and what is charged after it", () => {
    render(<BillingView initial={load({ status: "trialing", trialEndsAt: iso(5), trialOutboundCap: 50, trialOutboundUsed: 12 }, { subscription: sub({ status: "trialing", trialEndsAt: iso(5) }) })} />)
    expect(screen.getByText("Free trial")).toBeInTheDocument()
    expect(screen.getByText(/days left in your trial/)).toBeInTheDocument()
    expect(screen.getByText(/After the trial, \$99\.00 per month is charged automatically/)).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "12")
    expect(screen.queryByText("Active")).not.toBeInTheDocument()
  })

  it("trial without a Stripe subscription: no charge is scheduled, subscribing is the action, no portal", () => {
    render(<BillingView initial={load({ status: "trialing", trialEndsAt: iso(5) }, { subscription: null })} />)
    expect(screen.getByText(/No charge is scheduled/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Subscribe to a plan" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Change plan" })).not.toBeInTheDocument()
  })

  it("never manages another product's subscription on the same workspace", () => {
    // parseAttendeSubscription returns null for non-Attende plans; the page then shows no portal actions.
    render(<BillingView initial={load({}, { subscription: null })} />)
    expect(screen.queryByRole("button", { name: "Cancel subscription" })).not.toBeInTheDocument()
    expect(screen.getByText("No charge scheduled.")).toBeInTheDocument()
  })

  it("blocks with the trial-ended screen once the trial is over", () => {
    render(<BillingView initial={load({ status: "trialing", trialEndsAt: iso(-1) })} />)
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Your free trial has ended")
  })

  it("offers to subscribe (not the portal) to a workspace without an Attende plan", () => {
    render(<BillingView initial={load({ tier: null, status: "none", limits: null }, { subscription: null, usage: null })} />)
    expect(screen.getByText("No Attende-ai plan")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See plans and prices" })).toHaveAttribute("href", "/pricing")
    expect(screen.queryByRole("button", { name: "Change plan" })).not.toBeInTheDocument()
  })
})

describe("BillingView: included vs used", () => {
  it("separates the plan's allowance from this month's usage", () => {
    render(<BillingView initial={load({})} />)
    expect(screen.getByText("Included in your plan")).toBeInTheDocument()
    expect(screen.getByText("5,000")).toBeInTheDocument()
    expect(screen.getByText("1,234 of 5,000")).toBeInTheDocument()
    expect(screen.getAllByText("Channels").length).toBeGreaterThan(0)
  })

  it("says usage is unavailable instead of showing zeros", () => {
    render(<BillingView initial={load({}, { usage: null })} />)
    expect(screen.getByText(/Usage is not available right now\. It is not zero/)).toBeInTheDocument()
    expect(screen.queryByText("0 of 5,000")).not.toBeInTheDocument()
  })
})

describe("BillingView: managing", () => {
  it("warns about a failed payment and offers to update the card", async () => {
    render(<BillingView initial={load({ status: "past_due" })} />)
    expect(screen.getByText(/We could not charge your card/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Update card" }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://billing.stripe.test/session"))
    expect(mockPortal).toHaveBeenCalledWith("payment_method")
  })

  it("asks for confirmation before sending the person to cancel, and lets them keep the plan", async () => {
    render(<BillingView initial={load({})} />)
    fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }))
    expect(await screen.findByText("Cancel your subscription?")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Keep my plan" }))
    await waitFor(() => expect(screen.queryByText("Cancel your subscription?")).not.toBeInTheDocument())
    expect(mockPortal).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }))
    fireEvent.click(await screen.findByRole("button", { name: "Continue to cancel" }))
    await waitFor(() => expect(mockPortal).toHaveBeenCalledWith("manage"))
  })

  it("tells the user when the portal cannot be opened", async () => {
    mockPortal.mockResolvedValue({ success: false, error: "portal" })
    render(<BillingView initial={load({})} />)
    fireEvent.click(screen.getByRole("button", { name: "Update card" }))
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith("error", "We could not open the billing portal. Try again."))
    expect(assign).not.toHaveBeenCalled()
  })

  it("shows a retryable error when the data could not be loaded", async () => {
    mockReload.mockResolvedValue(load({}))
    render(<BillingView initial={{ success: false, error: "boom" }} />)
    expect(screen.getByText("We could not load your plan.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("Growth")).toBeInTheDocument()
  })
})
