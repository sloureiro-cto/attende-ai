"use server"

import { ActionOutput } from "app/_types/Action"
import { IInvite } from "app/_types/Invite"
import { IPagination } from "app/_types/Pagination"
import { FetchClient, HttpError } from "lib/api"

type InviteStatus = "pending" | "failed" | "accepted" | "rejected" | "expired" | "canceled"

export type WorkspaceInvitesSortBy = "email" | "role" | "createdAt" | "status"

type GetWorkspaceInvitesInput = {
  status?: InviteStatus[]
  /** When true, filter invites that have `removedAt` set (not a status value). */
  removed?: boolean
  sortBy?: WorkspaceInvitesSortBy
  sortOrder?: "asc" | "desc"
  tags?: string[]
  search?: string
  page?: number
  limit?: number
}

type GetWorkspaceInvitesResponse = {
  invites: IInvite[]
  pagination?: IPagination
}

export async function getWorkspaceInvites({
  status,
  removed,
  sortBy,
  sortOrder,
  tags = [],
  search,
  page,
  limit,
}: GetWorkspaceInvitesInput): Promise<ActionOutput<{ invites: IInvite[]; pagination: IPagination }>> {
  try {
    const query: Record<string, string> = {}
    if (status) {
      query.status = status.join(",")
    }
    if (removed) {
      query.removed = "true"
    }
    if (sortBy) {
      query.sortBy = sortBy
    }
    if (sortOrder) {
      query.sortOrder = sortOrder
    }
    if (search) {
      query.search = search
    }
    if (page) {
      query.page = page.toString()
    }
    if (limit) {
      query.limit = limit.toString()
    }

    const data = await FetchClient.get<GetWorkspaceInvitesResponse>(`${process.env.BACKEND_URL}/invites/workspaces`, {
      query,
      next: { tags },
    })

    if (!data.invites || !data.pagination) {
      return { success: false, error: "Invalid response from server" }
    }

    return {
      success: true,
      data: { invites: data.invites, pagination: data.pagination },
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "Error fetching workspace invites.",
    }
  }
}
