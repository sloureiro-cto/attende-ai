export type UserCountry = "BR" | "INTL"
export type Currency = "brl" | "usd"

export type SessionWithUser = { user: { id?: string; stripeCustomerId?: string } } | null

/**
 * Get user country from request headers (set by geo middleware)
 * @param headers - Request headers from Next.js
 * @returns "BR" or "INTL"
 */
export function getUserCountry(headers: Headers): UserCountry {
  const country = headers.get("x-user-country")
  // Default to INTL if header is not set or not BR
  return (country === "BR" ? "BR" : "INTL") as UserCountry
}

/**
 * Get customer currency from Stripe
 * Checks customer.currency field directly
 * Server-side only - uses Stripe SDK
 * @param stripeCustomerId - Stripe customer ID
 * @returns Currency code (brl, usd) or null if customer not found or currency not set
 */
export async function getCustomerCurrency(stripeCustomerId: string): Promise<Currency | null> {
  // Lazy import to avoid loading Stripe in client components
  const { stripe } = await import("lib/stripe")

  try {
    // Retrieve customer from Stripe
    const customer = await stripe.customers.retrieve(stripeCustomerId)

    // Handle deleted customers or invalid customer
    if (customer.deleted || !customer || typeof customer === "string") {
      return null
    }

    // Check customer.currency field
    if (customer.currency && typeof customer.currency === "string") {
      const currency = customer.currency.toLowerCase()
      return currency === "brl" ? "brl" : "usd"
    }

    // No currency found, return null to use geo detection
    return null
  } catch (error) {
    console.error("Error fetching customer currency from Stripe:", error)
    // If error, fallback to geo detection
    return null
  }
}

/**
 * Determine currency based on customer currency or geo country
 * Priority: Customer currency > Geo country
 * @param customerCurrency - Currency from Stripe customer (brl, usd, or null)
 * @param userCountry - Country from geo detection (BR or INTL)
 * @returns "brl" for BRL/Brazil, "usd" for USD/International
 */
export function determineCurrency(customerCurrency: Currency | null, userCountry: UserCountry): Currency {
  if (customerCurrency !== null) {
    return customerCurrency
  }

  return userCountry === "BR" ? "brl" : "usd"
}

/**
 * Determine which pricing table source to use based on customer currency or country
 * Priority: Customer currency > Geo country
 * This method is required because Stripe doesn't allow customer with multiple currencies
 * @param customerCurrency - Currency from Stripe customer (brl, usd, or null)
 * @param userCountry - Country from geo detection (BR or INTL)
 * @returns "BR" for BRL/Brazil, "INTL" for USD/International
 */
export function determinePricingTableSource(customerCurrency: Currency | null, userCountry: UserCountry): UserCountry {
  // If customer has currency, use it
  if (customerCurrency === "brl") {
    return "BR"
  }
  if (customerCurrency === "usd") {
    return "INTL"
  }

  // Fallback to geo detection
  return userCountry
}

/**
 * Get locale from currency
 * Safe to use in client components
 * @param currency - Currency code (brl, usd)
 * @returns Locale string (pt-BR, en-US)
 */
export function getLocaleFromCurrency(currency: Currency | string): string {
  return currency.toLowerCase() === "brl" ? "pt-BR" : "en-US"
}

/**
 * Get currency symbol
 * Safe to use in client components
 * @param currency - Currency code (brl, usd)
 * @returns Currency symbol (R$, $)
 */
export function getCurrencySymbol(currency: Currency | string): string {
  return currency.toLowerCase() === "brl" ? "R$" : "$"
}

/**
 * Format price based on currency
 * Unified function that can format with or without currency symbol
 * Safe to use in client components (does not import Stripe)
 * @param price - Price value
 * @param currency - Currency code (brl, usd)
 * @param options - Formatting options
 * @param options.includeSymbol - Whether to include currency symbol (default: true)
 * @param options.locale - Locale string (pt-BR, en-US). If not provided, will be derived from currency
 * @param options.minimumFractionDigits - Min decimal places (default: 2). Use 0 for whole numbers to hide decimals.
 * @param options.maximumFractionDigits - Max decimal places (default: 2)
 * @returns Formatted price string
 */
export function formatPrice(
  price: number,
  currency: Currency | string,
  options?: {
    includeSymbol?: boolean
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string {
  const { includeSymbol = true, locale, minimumFractionDigits = 2, maximumFractionDigits = 2 } = options || {}
  const currencyCode = currency.toUpperCase()
  const resolvedLocale = locale || getLocaleFromCurrency(currency)

  if (includeSymbol) {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(price)
  }

  return new Intl.NumberFormat(resolvedLocale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(price)
}
