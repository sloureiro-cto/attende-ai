import { planBlockKind, planBlockMessage } from "../planBlock"

describe("plan block markers", () => {
  it("turns a refused plan check into a marker the UI translates", () => {
    expect(planBlockKind(planBlockMessage(403, "ATTENDE_QUOTA_EXCEEDED"))).toBe("quota")
    expect(planBlockKind(planBlockMessage(403, "ATTENDE_TRIAL_OUTBOUND_CAP"))).toBe("quota")
    expect(planBlockKind(planBlockMessage(402, "ATTENDE_TRIAL_EXPIRED"))).toBe("inactive")
    expect(planBlockKind(planBlockMessage(402))).toBe("inactive")
    expect(planBlockKind(planBlockMessage(403, "ATTENDE_NOT_ENTITLED"))).toBe("inactive")
    expect(planBlockKind(planBlockMessage(0))).toBe("unavailable")
  })

  it("leaves every other error alone", () => {
    expect(planBlockKind("Your plan reached its limit of lines")).toBeNull()
    expect(planBlockKind("ATTENDE_PLAN_BLOCK:other")).toBeNull()
    expect(planBlockKind(null)).toBeNull()
    expect(planBlockKind(undefined)).toBeNull()
  })
})
