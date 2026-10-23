"use server"

import { headers } from "next/headers"
import { getStripeUrlAction } from "actions/stripe/getStripeUrl"
import { getWorkspaceSubscription } from "actions/subscriptions/getWorkspaceSubscrition"
import { getWorkspaceAction } from "actions/workspaces/getWorkspace"
import { auth } from "auth"
import { type AttendeBilling, type AttendeSubscription, type AttendeUsage, parseAttendeBilling, parseAttendeSubscription, parseAttendeUsage } from "lib/attende/billing/model"
import { attendeGet } from "lib/attende/serverApi"

export type BillingData = {
  workspaceId: string
  billing: AttendeBilling
  /** The workspace's Attende subscription in Stripe; null when there is none (or it is another product's). "error" when it could not be read. */
  subscription: AttendeSubscription | null | "error"
  /** Current month usage from /api/attende/entitlements; null when unavailable (shown as such, never as zeros). */
  usage: AttendeUsage | null
}
export type BillingLoad = { success: true; data: BillingData } | { success: false; error: string }

/**
 * Plan, status, trial clock and limits (workspace entitlements, kept in sync with Stripe by the backend), plus the Stripe
 * subscription when it is an Attende plan (price, period, next charge) and this month's usage. One parallel read.
 */
export async function getAttendeBillingAction(): Promise<BillingLoad> {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  if (!workspaceId) return { success: false, error: "no_workspace" }
  const [workspace, subscription, entitlements] = await Promise.all([
    getWorkspaceAction({ id: workspaceId }),
    getWorkspaceSubscription(),
    attendeGet<unknown>("/attende/entitlements"),
  ])
  if (!workspace.success) return { success: false, error: workspace.error }
  const currency = (session?.user as { currency?: string | null } | undefined)?.currency ?? null
  return {
    success: true,
    data: {
      workspaceId,
      billing: parseAttendeBilling(workspace.data),
      // A workspace without any subscription answers with an error too: only a successful read can say "none".
      subscription: subscription.success ? parseAttendeSubscription(subscription.data, currency) : "error",
      usage: entitlements.success ? parseAttendeUsage(entitlements.data) : null,
    },
  }
}

export type PortalKind = "manage" | "payment_method" | "change_plan"
export type PortalResult = { success: true; url: string } | { success: false; error: string }

async function returnUrl(): Promise<string> {
  const incoming = await headers()
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host")
  const proto = incoming.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  return `${host ? `${proto}://${host}` : (process.env.AUTH_URL ?? "")}/billing`
}

/**
 * Opens the Stripe customer portal: card update, plan change (needs the subscription id) or the portal home (invoices, cancel).
 * Reuses the platform's portal action, so the customer is the same Stripe customer the signup created.
 */
export async function openBillingPortalAction(kind: PortalKind): Promise<PortalResult> {
  const callback = await returnUrl()
  if (kind === "payment_method") return toResult(await getStripeUrlAction(callback, { type: "payment_method_update" }))
  if (kind === "change_plan") {
    const subscription = await getWorkspaceSubscription()
    const subscriptionId = subscription.success ? subscription.data?.stripeSubscriptionId : undefined
    // Without a subscription id the portal home still lets the person pick another plan.
    return toResult(await getStripeUrlAction(callback, subscriptionId ? { type: "subscription_update", subscriptionId } : undefined))
  }
  return toResult(await getStripeUrlAction(callback))
}

function toResult(result: { data?: string; error?: string }): PortalResult {
  return result.data ? { success: true, url: result.data } : { success: false, error: result.error ?? "portal" }
}
