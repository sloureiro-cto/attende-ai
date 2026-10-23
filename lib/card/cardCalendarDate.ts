import { isValid } from "date-fns"

export function isCardCalendarDateOnly(value: string | Date | null | undefined): boolean {
  if (value == null || value === "") return true
  const parsed = value instanceof Date ? value : new Date(value)
  if (!isValid(parsed)) return true
  return isUtcDateOnlyInstant(parsed)
}

function isUtcDateOnlyInstant(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  )
}

/** Map API calendar dates to local Date for pickers (UTC midnight → same calendar day locally). */
export function parseCardCalendarDate(value: string | Date | null | undefined): Date | undefined {
  if (value == null || value === "") return undefined
  const parsed = value instanceof Date ? value : new Date(value)
  if (!isValid(parsed)) return undefined
  if (isUtcDateOnlyInstant(parsed)) {
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  }
  return parsed
}

/** Serialize picker Date for card `date` / `startDate` API fields. */
export function serializeCardCalendarDate(date: Date): string {
  const hasLocalTime =
    date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0
  if (!hasLocalTime) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString()
  }
  return date.toISOString()
}

export function serializeCardDateField(value: Date | string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof Date) return serializeCardCalendarDate(value)
  const parsed = parseCardCalendarDate(value)
  return parsed ? serializeCardCalendarDate(parsed) : value
}

export function serializeCardDateFields<T extends { date?: unknown; startDate?: unknown }>(cardData: T): T {
  const next = { ...cardData }
  if (cardData.date !== undefined) {
    next.date = serializeCardDateField(cardData.date as Date | string | null | undefined) as T["date"]
  }
  if (cardData.startDate !== undefined) {
    next.startDate = serializeCardDateField(cardData.startDate as Date | string | null | undefined) as T["startDate"]
  }
  return next
}

export function serializeCardPayload<
  T extends { date?: unknown; startDate?: unknown; createdAt?: unknown; updatedAt?: unknown },
>(cardData: T): T {
  let next = serializeCardDateFields(cardData)
  if (cardData.createdAt instanceof Date) {
    next = { ...next, createdAt: cardData.createdAt.toISOString() as T["createdAt"] }
  }
  if (cardData.updatedAt instanceof Date) {
    next = { ...next, updatedAt: cardData.updatedAt.toISOString() as T["updatedAt"] }
  }
  return next
}
