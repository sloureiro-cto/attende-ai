import type { WorkingDay, WorkingHours } from "./types"

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export const isValidTime = (value: string): boolean => TIME.test(value)

/** 0 = Sunday, as in the contract. Order shown to the user: Monday first. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export type HoursPreset = "business" | "always" | "custom"

export const DEFAULT_TIMEZONE = "America/Sao_Paulo"

export function browserTimezone(fallback = DEFAULT_TIMEZONE): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback
  } catch {
    return fallback
  }
}

const daysFor = (days: number[], open: string, close: string): WorkingDay[] => days.map((day) => ({ day, open, close }))

/** "Business hours": Monday to Friday, 09:00 to 18:00. `null` means always on (24/7). */
export function applyPreset(preset: Exclude<HoursPreset, "custom">, timezone = browserTimezone()): WorkingHours {
  if (preset === "always") return null
  return { timezone, days: daysFor([1, 2, 3, 4, 5], "09:00", "18:00") }
}

/** Which preset the current value matches, so the chips can show the active one. */
export function detectPreset(hours: WorkingHours): HoursPreset {
  if (hours === null) return "always"
  const business = applyPreset("business", hours.timezone)
  if (business && JSON.stringify(sortDays(hours.days)) === JSON.stringify(sortDays(business.days))) return "business"
  return "custom"
}

const sortDays = (days: WorkingDay[]): WorkingDay[] => [...days].sort((a, b) => a.day - b.day)

export function isDayOpen(hours: WorkingHours, day: number): boolean {
  return hours === null ? true : hours.days.some((d) => d.day === day)
}

export function dayWindow(hours: WorkingHours, day: number): WorkingDay | null {
  return hours?.days.find((d) => d.day === day) ?? null
}

/** Opens or closes a weekday. A newly opened day copies the window of the first open day (or 09:00 to 18:00). */
export function toggleDay(hours: WorkingHours, day: number, timezone = browserTimezone()): WorkingHours {
  const current: NonNullable<WorkingHours> = hours ?? { timezone, days: daysFor([0, 1, 2, 3, 4, 5, 6], "00:00", "23:59") }
  if (current.days.some((d) => d.day === day)) return { ...current, days: current.days.filter((d) => d.day !== day) }
  const template = current.days[0]
  return { ...current, days: sortDays([...current.days, { day, open: template?.open ?? "09:00", close: template?.close ?? "18:00" }]) }
}

export function setDayTime(hours: WorkingHours, day: number, patch: Partial<Pick<WorkingDay, "open" | "close">>): WorkingHours {
  if (!hours) return hours
  return { ...hours, days: hours.days.map((d) => (d.day === day ? { ...d, ...patch } : d)) }
}

/** Copies one day's window to every open day. */
export function applyToAllOpenDays(hours: WorkingHours, from: number): WorkingHours {
  if (!hours) return hours
  const source = hours.days.find((d) => d.day === from)
  if (!source) return hours
  return { ...hours, days: hours.days.map((d) => ({ ...d, open: source.open, close: source.close })) }
}

export type HoursIssue = "no_days" | "bad_time" | "order"

/** `null` (always on) is valid. A custom schedule needs at least one open day, valid times and open before close. */
export function validateHours(hours: WorkingHours): HoursIssue | null {
  if (hours === null) return null
  if (hours.days.length === 0) return "no_days"
  for (const d of hours.days) {
    if (!isValidTime(d.open) || !isValidTime(d.close)) return "bad_time"
    if (d.open >= d.close) return "order"
  }
  return null
}

/** Groups equal windows on consecutive days: "Mon-Fri 09:00-18:00". `labels` are the 7 short day names, Sunday first. */
export function summarizeHours(hours: WorkingHours, labels: readonly string[], always: string): string {
  if (hours === null) return always
  if (hours.days.length === 0) return ""
  const ordered = DAY_ORDER.map((d) => hours.days.find((x) => x.day === d)).filter((d): d is WorkingDay => !!d)
  const parts: string[] = []
  let i = 0
  while (i < ordered.length) {
    let j = i
    while (j + 1 < ordered.length && ordered[j + 1]!.open === ordered[i]!.open && ordered[j + 1]!.close === ordered[i]!.close && isNext(ordered[j]!.day, ordered[j + 1]!.day)) j += 1
    const a = labels[ordered[i]!.day] ?? ""
    const b = labels[ordered[j]!.day] ?? ""
    parts.push(`${i === j ? a : `${a}-${b}`} ${ordered[i]!.open}-${ordered[i]!.close}`)
    i = j + 1
  }
  return parts.join(", ")
}

const isNext = (a: number, b: number): boolean => DAY_ORDER.indexOf(b as (typeof DAY_ORDER)[number]) === DAY_ORDER.indexOf(a as (typeof DAY_ORDER)[number]) + 1
