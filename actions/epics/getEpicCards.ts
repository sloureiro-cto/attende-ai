"use server"

import { ActionOutput } from "app/_types/Action"
import { ICard } from "app/_types/Card"
import type { IPagination } from "app/_types/Pagination"
import { FetchClient, HttpError } from "lib/api"
import { BACKLOG_CARDS_PAGE_SIZE } from "lib/backlog/constants"

type GetEpicCardsInput = {
  projectId: string
  epicId: string
  page?: number
  limit?: number
}

type GetEpicCardsResponse = {
  success: boolean
  cards: ICard[]
  total: number
  pagination?: IPagination
}

function normalizePagination(raw: unknown, page: number, limit: number, fallbackTotal: number): IPagination {
  const value = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const total = typeof value.total === "number" ? value.total : fallbackTotal
  const resolvedLimit = typeof value.limit === "number" ? value.limit : limit
  const resolvedPage = typeof value.page === "number" ? value.page : page
  const totalPages =
    typeof value.totalPages === "number" ? value.totalPages : Math.max(1, Math.ceil(total / Math.max(resolvedLimit, 1)))
  return { total, page: resolvedPage, limit: resolvedLimit, totalPages }
}

export async function getEpicCardsAction({
  projectId,
  epicId,
  page,
  limit,
}: GetEpicCardsInput): Promise<ActionOutput<ICard[]> & { total: number; pagination?: IPagination }> {
  try {
    const query: Record<string, number> = {}
    if (limit !== undefined) {
      query.limit = limit
      query.page = page ?? 1
    }

    const data = await FetchClient.get<GetEpicCardsResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/epics/${epicId}/cards`,
      { query: Object.keys(query).length > 0 ? query : undefined }
    )

    const resolvedLimit = limit ?? BACKLOG_CARDS_PAGE_SIZE
    const resolvedPage = page ?? 1

    return {
      success: true,
      data: data.cards,
      total: data.total,
      pagination: data.pagination
        ? normalizePagination(data.pagination, resolvedPage, resolvedLimit, data.total)
        : undefined,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return {
        success: false,
        error: error.message,
        total: 0,
      }
    }

    return {
      success: false,
      error: "something went wrong fetching epic cards",
      total: 0,
    }
  }
}
