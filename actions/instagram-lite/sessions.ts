"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type { IInstagramSession, ResponseSlaRules } from "./types"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/instagram-lite`
}

export type IgActionOk<T> = { success: true; data: T }
export type IgActionErr = { success: false; error: string }
export type IgActionResult<T> = IgActionOk<T> | IgActionErr

export async function listInstagramSessionsAction(): Promise<IgActionResult<IInstagramSession[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/sessions`, { cache: "no-store" })
    const data = pickData<IInstagramSession[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as IInstagramSession[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listInstagramBillingStatusAction(): Promise<IgActionResult<IInstagramSession[]>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/billing/status`)
    const data = pickData<IInstagramSession[]>(raw)
    const list = Array.isArray(data) ? data : Array.isArray(raw) ? (raw as IInstagramSession[]) : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function createInstagramCheckoutAction(input: {
  label: string
  successUrl: string
  cancelUrl: string
}): Promise<IgActionResult<{ checkoutUrl: string; sessionId: string }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/billing/checkout`, input)
    const data = pickData<{ checkoutUrl: string; sessionId: string }>(raw)
    if (!data?.checkoutUrl) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function connectInstagramSessionAction(
  sessionId: string
): Promise<IgActionResult<{ url?: string; reconciled?: boolean; unipileAccountId?: string }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/sessions/${sessionId}/connect`, {})
    const data = pickData<{ url?: string; reconciled?: boolean; unipileAccountId?: string }>(raw)
    if (data?.reconciled) {
      return { success: true, data: { reconciled: true, unipileAccountId: data.unipileAccountId } }
    }
    if (!data?.url) {
      return { success: false, error: "No connect URL returned" }
    }
    return { success: true, data: { url: data.url } }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** After Unipile redirect (`?account_id=`), link the account to the pending session. */
export async function linkInstagramByUnipileAccountAction(
  accountId: string
): Promise<IgActionResult<{ sessionId: string; unipileAccountId: string }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/sessions/link-by-account`, {
      accountId,
    })
    const data = pickData<{ sessionId: string; unipileAccountId: string }>(raw)
    if (!data?.sessionId) {
      return { success: false, error: "Could not link Unipile account" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function updateInstagramSessionAction(
  sessionId: string,
  input: {
    label?: string
    responseSlaRules?: ResponseSlaRules | null
    prependAttendantNameEnabled?: boolean
  }
): Promise<IgActionResult<IInstagramSession>> {
  try {
    const body: Record<string, unknown> = {}
    if (input.label !== undefined) body.label = input.label.trim()
    if (input.responseSlaRules !== undefined) body.responseSlaRules = input.responseSlaRules
    if (input.prependAttendantNameEnabled !== undefined)
      body.prependAttendantNameEnabled = input.prependAttendantNameEnabled
    const raw = await FetchClient.patch<unknown>(`${base()}/sessions/${encodeURIComponent(sessionId)}`, body)
    const data = pickData<IInstagramSession>(raw) ?? (raw as IInstagramSession)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteInstagramSessionAction(sessionId: string): Promise<IgActionResult<void>> {
  try {
    await FetchClient.delete(`${base()}/sessions/${sessionId}`)
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function subscribeInstagramWithPaymentMethodAction(input: {
  label: string
  paymentMethodId: string
}): Promise<IgActionResult<{ sessionId: string }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/billing/subscribe`, input)
    const data = pickData<{ sessionId: string }>(raw)
    if (!data?.sessionId) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Whether this workspace can add its next Instagram account for free (paid plan, no accounts yet). */
export async function getInstagramFreeAccountEligibilityAction(): Promise<
  IgActionResult<{ freeAccountAvailable: boolean }>
> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/billing/eligibility`)
    const data = pickData<{ freeAccountAvailable: boolean }>(raw)
    return { success: true, data: { freeAccountAvailable: Boolean(data?.freeAccountAvailable) } }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Adds the workspace's free first Instagram account — no payment method needed. */
export async function addFreeInstagramAccountAction(label: string): Promise<IgActionResult<{ sessionId: string }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/billing/free`, { label })
    const data = pickData<{ sessionId: string }>(raw)
    if (!data?.sessionId) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

/** Resolved Stripe pricing (currency + amount) for the current user's next Instagram account. */
export async function getInstagramAccountPricingAction(): Promise<
  IgActionResult<{ currency: string; amount: number }>
> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/billing/pricing`)
    const data = pickData<{ currency: string; amount: number }>(raw)
    if (!data?.currency || typeof data.amount !== "number") {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export type InstagramSessionPost = {
  id: string
  caption: string
  thumbnailUrl: string | null
}

export async function listInstagramSessionPostsAction(
  sessionId: string,
  cursor?: string
): Promise<IgActionResult<{ posts: InstagramSessionPost[]; cursor?: string }>> {
  try {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
    const raw = await FetchClient.get<unknown>(
      `${base()}/sessions/${encodeURIComponent(sessionId)}/posts${qs}`
    )
    const data = pickData<{ posts?: InstagramSessionPost[]; cursor?: string }>(raw)
    return {
      success: true,
      data: {
        posts: Array.isArray(data?.posts) ? data.posts : [],
        cursor: data?.cursor,
      },
    }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
