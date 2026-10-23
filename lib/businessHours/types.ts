export interface IBusinessHoursWindow {
  start: string
  end: string
}

export interface IBusinessHoursDay {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  windows: IBusinessHoursWindow[]
}

export interface IWorkspaceBusinessHours {
  enabled: boolean
  timezone: string
  schedule: IBusinessHoursDay[]
}

export const BUSINESS_HOURS_DAY_ORDER: Array<IBusinessHoursDay["day"]> = [1, 2, 3, 4, 5, 6, 0]

export function emptyBusinessHoursSchedule(): IBusinessHoursDay[] {
  return BUSINESS_HOURS_DAY_ORDER.map((day) => ({ day, windows: [] }))
}

export function normalizeBusinessHours(raw?: IWorkspaceBusinessHours | null): IWorkspaceBusinessHours {
  const schedule = emptyBusinessHoursSchedule().map((emptyDay) => {
    const existing = raw?.schedule?.find((d) => d.day === emptyDay.day)
    return {
      day: emptyDay.day,
      windows: existing?.windows?.length
        ? existing.windows.map((w) => ({ start: w.start || "09:00", end: w.end || "18:00" }))
        : [],
    }
  })

  return {
    enabled: Boolean(raw?.enabled),
    timezone: raw?.timezone?.trim() || "America/Sao_Paulo",
    schedule,
  }
}
