import { IPlan, PlanRules } from "./Plan"

interface ISubscriptionUsageMetrics {
  _id: string
  subscription: ISubscription
  month: string
  metrics: {
    active_users: number
    projects: number
    cards: number
    documents: number
    whiteboard: number
    time_tracker: number
    meet: number
  }
  createdAt: Date
  updatedAt: Date
}

interface ISubscription {
  _id: string
  plan: IPlan
  /**
   * Optional legacy field; prefer `GET …/workspaces/:id/plan-agents-usage` for agent plan UI.
   */
  agentsUsage?: {
    monthly_executions?: number
  }
  workspace: string | IWorkspace
  stripeSubscriptionId: string
  stripeSubscriptionItemId: string
  stripePriceId: string
  stripeCurrentPeriodEnd: Date
  stripeClockTest?: string
  trialDaysRemaining?: number
  seats: number
  startDate: Date
  endDate?: Date
  stripeRequirePaymentMethod: boolean
  status: SubscriptionStripeStatusEnum
  trialEndDate: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  rules: PlanRules
  canceledAt?: Date
  createdAt: Date
  updatedAt: Date
}

export { ISubscription, SubscriptionStripeStatusEnum, ISubscriptionUsageMetrics }
