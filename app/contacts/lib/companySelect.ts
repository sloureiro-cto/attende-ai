export function filterCompaniesByQuery<T extends { name: string }>(companies: T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return companies
  return companies.filter((company) => company.name.toLowerCase().includes(needle))
}

export function canCreateCompanyFromQuery(companies: { name: string }[], query: string): boolean {
  const name = query.trim()
  if (!name) return false
  return !companies.some((company) => company.name.toLowerCase() === name.toLowerCase())
}

export function unwrapListPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []
  const record = payload as { data?: unknown; items?: unknown }
  if (Array.isArray(record.data)) return record.data as T[]
  if (Array.isArray(record.items)) return record.items as T[]
  return []
}
