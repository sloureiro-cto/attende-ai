"use server"

import { headers } from "next/headers"
import { auth } from "auth"
import {
  type AttendeBilling,
  type AttendeInvoice,
  type AttendeSubscription,
  type AttendeUsage,
  parseAttendeBilling,
  parseAttendeInvoices,
  parseAttendeSubscription,
  parseAttendeUsage,
} from "lib/attende/billing/model"
import { attendeGet, attendePost } from "lib/attende/serverApi"

export type BillingData = {
  workspaceId: string
  billing: AttendeBilling
  /** The workspace's Attende-ai subscription; null when there is none. */
  subscription: AttendeSubscription | null
  /** Current month usage; null when unavailable (shown as such, never as zeros). */
  usage: AttendeUsage | null
}
/** `error` is the backend code when there is one (`JSYNQ_UNAVAILABLE`...), otherwise a short local reason. */
export type BillingLoad = { success: true; data: BillingData } | { success: false; error: string }

/**
 * Plan, status, trial clock, limits, subscription (price, period, next charge) and this month's usage, all from one read
 * of `GET /attende/entitlements` on the Attende backend.
 */
export async function getAttendeBillingAction(): Promise<BillingLoad> {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  if (!workspaceId) return { success: false, error: "no_workspace" }
  const result = await attendeGet<unknown>("/attende/entitlements")
  if (!result.success) return { success: false, error: result.reference ?? (result.status === 0 ? "network" : "load") }
  return {
    success: true,
    data: {
      workspaceId,
      billing: parseAttendeBilling(result.data),
      subscription: parseAttendeSubscription(result.data),
      usage: parseAttendeUsage(result.data),
    },
  }
}

export type PortalKind = "manage" | "payment_method"
export type PortalResult = { success: true; url: string } | { success: false; error: string }

async function returnUrl(): Promise<string | undefined> {
  const incoming = await headers()
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host")
  const proto = incoming.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  const origin = host ? `${proto}://${host}` : process.env.AUTH_URL
  // The backend only accepts its own frontend origin; without one it falls back to its default /billing page.
  return origin ? `${origin.replace(/\/+$/, "")}/billing` : undefined
}

/**
 * Opens the Stripe customer portal of the company's JSYNQ customer through the Attende backend
 * (`POST /attende/billing/portal`): card update, or the portal home (invoices).
 */
export async function openBillingPortalAction(kind: PortalKind): Promise<PortalResult> {
  const callback = await returnUrl()
  const result = await attendePost<{ url?: unknown }>("/attende/billing/portal", {
    kind,
    ...(callback ? { returnUrl: callback } : {}),
  })
  if (!result.success) return { success: false, error: result.reference ?? "portal" }
  return typeof result.data?.url === "string" && result.data.url
    ? { success: true, url: result.data.url }
    : { success: false, error: "portal" }
}

export type InvoicesLoad = { success: true; data: AttendeInvoice[] } | { success: false; error: string }

/**
 * Stripe invoices of the signed-in workspace (`GET /attende/billing/invoices` on the Attende backend), newest first. A
 * workspace without a Stripe customer gets an empty list; any failure is an error, never an empty list.
 */
export async function getAttendeInvoicesAction(limit = 24): Promise<InvoicesLoad> {
  const result = await attendeGet<unknown>("/attende/billing/invoices", { limit })
  if (!result.success) return { success: false, error: result.reference ?? (result.status === 0 ? "network" : "load") }
  return { success: true, data: parseAttendeInvoices(result.data) }
}

export type BillingActionResult = { success: true } | { success: false; error: string }

const billingAction = async (path: string, body: Record<string, unknown> = {}): Promise<BillingActionResult> => {
  const result = await attendePost<unknown>(path, body)
  return result.success ? { success: true } : { success: false, error: result.reference ?? "action" }
}

/** Ends the Attende subscription at the end of the current period (owner only). */
export async function cancelSubscriptionAction(): Promise<BillingActionResult> {
  return billingAction("/attende/billing/cancel")
}

/** Undoes a scheduled cancellation before the period ends (owner only). */
export async function resumeSubscriptionAction(): Promise<BillingActionResult> {
  return billingAction("/attende/billing/resume")
}

/** Moves the subscription to another tier, prorated (owner only). */
export async function changePlanAction(planSlug: string): Promise<BillingActionResult> {
  return billingAction("/attende/billing/change-plan", { planSlug })
}
