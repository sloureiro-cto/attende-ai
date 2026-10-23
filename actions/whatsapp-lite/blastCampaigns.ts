"use server"

import { pickData } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import type {
  BlastCampaign,
  BlastCampaignAudienceSource,
  BlastCampaignCreateInput,
} from "./blastCampaignTypes"

const base = () => {
  const u = process.env.BACKEND_URL
  if (!u) throw new Error("BACKEND_URL is not defined")
  return `${u}/whatsapp-lite/blast-campaigns`
}

export type BlastActionOk<T> = { success: true; data: T }
export type BlastActionErr = { success: false; error: string }
export type BlastActionResult<T> = BlastActionOk<T> | BlastActionErr

export async function listBlastCampaignsAction(): Promise<BlastActionResult<BlastCampaign[]>> {
  try {
    const raw = await FetchClient.get<unknown>(base())
    const data = pickData<any>(raw)
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.campaigns)
      ? data.campaigns
      : Array.isArray(raw)
      ? (raw as BlastCampaign[])
      : []
    return { success: true, data: list }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function previewBlastAudienceAction(
  audienceSource: BlastCampaignAudienceSource
): Promise<BlastActionResult<{ count: number }>> {
  try {
    const raw = await FetchClient.post<unknown>(`${base()}/audience-preview`, { audienceSource })
    const data = pickData<{ count: number }>(raw) ?? (raw as { count: number })
    const count = Number(data?.count)
    if (!Number.isFinite(count)) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data: { count } }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function createBlastCampaignAction(
  input: BlastCampaignCreateInput
): Promise<BlastActionResult<BlastCampaign>> {
  try {
    const raw = await FetchClient.post<unknown>(base(), input)
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function getBlastCampaignAction(id: string): Promise<BlastActionResult<BlastCampaign>> {
  try {
    const raw = await FetchClient.get<unknown>(`${base()}/${encodeURIComponent(id)}`)
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Campaign not found" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function updateBlastCampaignAction(
  id: string,
  input: Partial<BlastCampaignCreateInput>
): Promise<BlastActionResult<BlastCampaign>> {
  try {
    const raw = await FetchClient.patch<unknown>(`${base()}/${encodeURIComponent(id)}`, input)
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function updateBlastCampaignStatusAction(
  id: string,
  status: "active" | "paused" | "completed" | "cancelled"
): Promise<BlastActionResult<BlastCampaign>> {
  try {
    const raw = await FetchClient.patch<unknown>(`${base()}/${encodeURIComponent(id)}/status`, { status })
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function retryFailedBlastCampaignAction(id: string): Promise<BlastActionResult<BlastCampaign>> {
  try {
    const raw = await FetchClient.patch<unknown>(`${base()}/${encodeURIComponent(id)}/retry-failed`, {})
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function retryBlastCampaignRecipientAction(
  id: string,
  recipientId: string
): Promise<BlastActionResult<BlastCampaign>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/${encodeURIComponent(id)}/recipients/${encodeURIComponent(recipientId)}/retry`,
      {}
    )
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function moveBlastCampaignRecipientCardAction(
  id: string,
  recipientId: string,
  columnId: string
): Promise<BlastActionResult<BlastCampaign>> {
  try {
    const raw = await FetchClient.patch<unknown>(
      `${base()}/${encodeURIComponent(id)}/recipients/${encodeURIComponent(recipientId)}/move-card`,
      { columnId }
    )
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    return { success: true, data }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function moveAllFailedBlastCampaignRecipientsCardsAction(
  id: string,
  columnId: string
): Promise<BlastActionResult<{ campaign: BlastCampaign; movedCount: number; failedCount: number }>> {
  try {
    const raw = await FetchClient.patch<unknown>(`${base()}/${encodeURIComponent(id)}/recipients/move-failed-cards`, {
      columnId,
    })
    const data = pickData<BlastCampaign>(raw) ?? (raw as BlastCampaign)
    if (!data?._id) {
      return { success: false, error: "Invalid response from server" }
    }
    const envelope = raw as { movedCount?: number; failedCount?: number }
    return {
      success: true,
      data: {
        campaign: data,
        movedCount: typeof envelope.movedCount === "number" ? envelope.movedCount : 0,
        failedCount: typeof envelope.failedCount === "number" ? envelope.failedCount : 0,
      },
    }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function deleteBlastCampaignAction(id: string): Promise<BlastActionResult<void>> {
  try {
    await FetchClient.delete<unknown>(`${base()}/${encodeURIComponent(id)}`)
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}
