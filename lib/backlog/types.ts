import type { ICard } from "app/_types/Card"
import type { IPagination } from "app/_types/Pagination"
import type { ISprint } from "app/_types/Sprint"

export type BacklogCountKey = "todo" | "inProgress" | "done"

export type BacklogCounts = {
  todo: number
  inProgress: number
  done: number
  total: number
}

export type BacklogBucket = {
  cards: ICard[]
  pagination: IPagination
  counts: BacklogCounts
}

export type BacklogSummary = {
  backlog: BacklogBucket
  sprints: ISprint[]
}

export type BacklogCardsPage = {
  cards: ICard[]
  pagination: IPagination
}
