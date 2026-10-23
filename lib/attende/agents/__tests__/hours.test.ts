import { applyPreset, applyToAllOpenDays, detectPreset, summarizeHours, toggleDay, validateHours } from "../hours"
import { DAY_LABELS } from "../samples"

describe("working hours", () => {
  it("has business hours and 24/7 presets", () => {
    const business = applyPreset("business", "UTC")
    expect(business?.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5])
    expect(detectPreset(business)).toBe("business")
    expect(applyPreset("always")).toBeNull()
    expect(detectPreset(null)).toBe("always")
    expect(detectPreset(toggleDay(business, 6, "UTC"))).toBe("custom")
  })

  it("validates custom schedules", () => {
    expect(validateHours(null)).toBeNull()
    expect(validateHours({ timezone: "UTC", days: [] })).toBe("no_days")
    expect(validateHours({ timezone: "UTC", days: [{ day: 1, open: "18:00", close: "09:00" }] })).toBe("order")
    expect(validateHours({ timezone: "UTC", days: [{ day: 1, open: "9", close: "18:00" }] })).toBe("bad_time")
  })

  it("summarizes in short words", () => {
    const hours = applyToAllOpenDays(toggleDay(applyPreset("business", "UTC"), 6, "UTC"), 1)
    expect(summarizeHours(hours, DAY_LABELS.en, "Always")).toBe("Mon-Sat 09:00-18:00")
    expect(summarizeHours(null, DAY_LABELS.en, "Always")).toBe("Always")
  })
})
