/** Single place for the standalone app's identity: renaming the product is a one-line change here. */
export const BOTS_BRAND = {
  name: "Attende-ai",
  shortName: "Bots",
  /** Where "Back to JSYNQ" points. Configure per deployment. */
  jsynqUrl: process.env.NEXT_PUBLIC_JSYNQ_URL || "https://app.jsynq.com",
  /** Mail address shown on the not-entitled page. */
  contactEmail: process.env.NEXT_PUBLIC_BOTS_CONTACT_EMAIL || "support@jsynq.com",
  /** "Book a demo or training" target. One line to change; opens in a new tab. */
  bookingUrl: process.env.NEXT_PUBLIC_BOTS_BOOKING_URL || "https://app.jsynq.com/book/uUcE1FEPp94",
} as const

export const BOTS_ROUTES = {
  login: "/login",
  workspaces: "/workspaces",
  bots: "/bots",
  lines: "/lines",
  me: "/me",
  notEntitled: "/not-entitled",
  start: "/start",
  inbox: "/inbox",
  funnel: "/funnel",
  agents: "/ai-agents",
  reports: "/reports",
  team: "/team",
  billing: "/billing",
  settings: "/settings",
  onboarding: "/setup",
  signup: "/signup",
  pricing: "/pricing",
} as const
