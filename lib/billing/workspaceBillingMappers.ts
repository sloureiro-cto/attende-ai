export type WorkspaceBillingPaymentMethodBrand = "visa" | "mastercard" | "amex" | "other"

export type StripeBillingPaymentMethod = {
  id: string
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  billing_details?: {
    name?: string
    address?: {
      city?: string
      country?: string
      line1?: string
      line2?: string
      postal_code?: string
      state?: string
    }
  }
  isDefault?: boolean
}

export type WorkspaceBillingPaymentMethod = {
  id: string
  last4: string
  brand: WorkspaceBillingPaymentMethodBrand
  bankName?: string
  expiryMonth: string
  expiryYear: string
  isDefault: boolean
}

export type WorkspaceInvoice = {
  id: string
  number: string | null
  created: number
  amountPaid: number
  currency: string
  status: string | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

export function mapBrand(brand: string): WorkspaceBillingPaymentMethodBrand {
  const normalized = brand.toLowerCase()
  if (normalized === "visa") return "visa"
  if (normalized === "mastercard") return "mastercard"
  if (normalized === "amex" || normalized === "american_express") return "amex"
  return "other"
}

export function mapWorkspaceBillingPaymentMethod(
  pm: StripeBillingPaymentMethod
): WorkspaceBillingPaymentMethod {
  return {
    id: pm.id,
    last4: pm.card.last4,
    brand: mapBrand(pm.card.brand),
    bankName: pm.billing_details?.address?.city
      ? `${pm.billing_details.address.city}${
          pm.billing_details.address.state ? `, ${pm.billing_details.address.state}` : ""
        }`
      : undefined,
    expiryMonth: pm.card.exp_month.toString().padStart(2, "0"),
    expiryYear: pm.card.exp_year.toString(),
    isDefault: Boolean(pm.isDefault),
  }
}

/** Stripe invoices return amounts in the smallest currency unit. */
export function invoiceAmountToMajorUnits(amountPaid: number): number {
  return amountPaid / 100
}
