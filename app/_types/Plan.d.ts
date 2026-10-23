type PlanRules = {
  custom: {
    [key: string]: any
  }
  documents: {
    limit: number
    /** Module on/off gate — omitted/true = enabled. See docs/RESELLER_PROVIDER_STRIPE_CONNECT.md §6. */
    enabled?: boolean
  }
  projects: {
    limit: number
    private: boolean
    generateDescriptionWithAi: boolean
    generateSubtasksWithAi: boolean
  }
  /**
   * Named `timeTracker` (camelCase) to match the real API response (backend's Mongoose schema
   * field) — not snake_case, unlike several other fields in this file that are themselves
   * inconsistent with the wire format (e.g. `users.allow_guest`, `workspace.import_platform_data`
   * — pre-existing, unused by any real code, left alone here).
   */
  timeTracker: {
    projects: {
      limit: number
    }
    tags: {
      limit: number
    }
    enabled?: boolean
  }
  meet: {
    /** If omitted, frontend may fall back to transcriptions for recording eligibility */
    recordings?: boolean
    transcriptions: boolean
    time: number
    users: {
      limit: number
    }
    enabled?: boolean
  }
  users: {
    limit: number
    allow_guest: boolean
  }
  workspace: {
    roles: {
      limit: number
    }
    members: {
      limit: number
    }
    import_platform_data: {
      limit: number
    }
  }
  whiteboard: {
    limit: number
  }
  dashboard: {
    period: {
      "7days": boolean
      "2weeks": boolean
      "1month": boolean
      "3months": boolean
      all: boolean
    }
    enabled?: boolean
  }
  /** Agent workspace limits; `-1` means unlimited for that field. */
  agents?: {
    monthly_executions: number
    agent_creation: number
    skills: number
  }
  /** Per-channel messaging entitlements (WhatsApp / Instagram / SMS). */
  socialMedia?: Partial<
    Record<
      "whatsapp" | "instagram" | "sms",
      { enabled?: boolean; limit?: number; unpaidLimit?: number }
    >
  >
}

/** One Stripe price tier (licensed volume/graduated). Amounts in cents. */
interface IPlanAvailablePriceTier {
  upTo?: number | null
  unitAmount?: number | null
  flatAmount?: number | null
}

/** A single selectable Stripe price for a plan offering more than one (e.g. a provider plan with
 * both a monthly and an every-6-months option). See docs/RESELLER_PROVIDER_STRIPE_CONNECT.md §10 Q14. */
interface IPlanAvailablePrice {
  id: string
  amount: number
  currency: string
  interval: "month" | "year" | null
  intervalCount?: number
  /** Omitted/`per_unit` = fixed per-seat (default JSYNQ + most provider prices). */
  billingScheme?: "per_unit" | "tiered"
  tiersMode?: "graduated" | "volume"
  tiers?: IPlanAvailablePriceTier[]
}

interface IPlan {
  _id: string
  title: string
  interval: "monthly" | "yearly"
  slug: string
  /** Set only for a seller's provider-scoped plan — undefined = today's global platform plan. */
  landingPageId?: string
  stripePriceId: string
  price: number
  currency: string
  /** Mirrors the resolved Stripe price's `recurring.interval_count` (e.g. 6 for every-6-months).
   * `interval` alone maps any Stripe `month` price to `"monthly"` regardless of this — a plan
   * billed every 6 months and one billed every month are otherwise indistinguishable. */
  intervalCount?: number
  /** All active prices for this plan — render as a picker when there's more than one. */
  availablePrices?: IPlanAvailablePrice[]
  rules: PlanRules
  created_at: Date
  updated_at: Date
}

export { IPlan, IPlanAvailablePrice, IPlanAvailablePriceTier, PlanRules }
