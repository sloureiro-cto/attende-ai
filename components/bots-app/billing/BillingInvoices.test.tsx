import { fireEvent, render, screen } from "@testing-library/react"
import { BillingInvoices } from "./BillingInvoices"

const getInvoices = jest.fn()
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("actions/attende/billing", () => ({ getAttendeInvoicesAction: (...a: unknown[]) => getInvoices(...a) }))

describe("BillingInvoices", () => {
  it("tells an error (with retry) apart from an empty list", async () => {
    getInvoices.mockResolvedValueOnce({ success: false, error: "boom" })
    render(<BillingInvoices workspaceId="w1" />)
    expect(screen.getByRole("status")).toHaveTextContent("Loading invoices…")
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your invoices.")
    getInvoices.mockResolvedValueOnce({ success: true, data: [] })
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("No invoices yet.")).toBeInTheDocument()
    expect(getInvoices).toHaveBeenCalledTimes(2)
  })

  it("lists invoices in their own currency with status and links", async () => {
    getInvoices.mockResolvedValueOnce({
      success: true,
      data: [{ id: "in_1", number: "A-1", created: 1792700000, amountPaid: 49700, currency: "brl", status: "paid", hostedInvoiceUrl: "https://x/1", invoicePdf: "https://x/1.pdf" }],
    })
    render(<BillingInvoices workspaceId="w1" />)
    expect(await screen.findByText("R$497.00")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Download PDF of invoice A-1" })).toHaveAttribute("href", "https://x/1.pdf")
  })
})
