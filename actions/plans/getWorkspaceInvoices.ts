"use server"

import type { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"
import type { WorkspaceInvoice } from "lib/billing/workspaceBillingMappers"

export type { WorkspaceInvoice }

type GetWorkspaceInvoicesResponse = {
  invoices: WorkspaceInvoice[]
}

export async function getWorkspaceInvoicesAction({
  workspaceId,
}: {
  workspaceId: string
}): Promise<ActionOutput<WorkspaceInvoice[]>> {
  if (!workspaceId) {
    return { success: false, error: "workspaceId is required" }
  }

  try {
    const data = await FetchClient.get<GetWorkspaceInvoicesResponse>(
      `${process.env.BACKEND_URL}/workspaces/${encodeURIComponent(workspaceId)}/billing/invoices`,
      { cache: "no-store" }
    )
    return { success: true, data: data?.invoices ?? [] }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to load workspace invoices" }
  }
}
