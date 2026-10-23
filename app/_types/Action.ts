import { IPagination } from "./Pagination"

export type ActionOutput<Data> =
  | { success: true; data: Data; error?: undefined; pagination?: IPagination }
  | {
      success: false
      data?: undefined
      error: string
      status?: number
      expiredChallenge?: boolean
      pagination?: IPagination
    }
