export interface IPagination {
  total: number
  totalRevenue?: number
  page: number
  limit: number
  totalPages: number
}

export type IPaginationParams = {
  page?: number
  limit?: number
  order?: "asc" | "desc"
  orderBy?: string
}
