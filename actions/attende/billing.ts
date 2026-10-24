"use server"

import { headers } from "next/headers"
import { auth } from "auth"
import {
  type AttendeBilling,
  type AttendeSubscription,
  type AttendeUsage,
  parseAttendeBilling,
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

export type PortalKind = "manage" | "payment_method" | "change_plan"
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
 * Opens the Stripe customer portal through the Attende backend (`POST /attende/billing/portal`): card update, plan change
 * or the portal home (invoices, cancel).
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
