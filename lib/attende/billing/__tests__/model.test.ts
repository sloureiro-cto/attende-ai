import { blockedBy, isSubscriptionBlockCode, limitRows, parseAttendeBilling, tierName, trialClock } from "../model"

describe("parseAttendeBilling", () => {
  it("reads the entitlements block and the trial outbound counter of /attende/entitlements", () => {
    const parsed = parseAttendeBilling({
      status: true,
      entitlements: {
        tier: "attende_growth",
        status: "trialing",
        limits: { lines: 3, seats: 5 },
        trialEndsAt: "2026-10-29T12:00:00.000Z",
        trialDaysLeft: 5,
      },
      usage: { trialOutbound: { used: 12, cap: 50 } },
    })
    expect(parsed).toEqual({
      tier: "attende_growth",
      status: "trialing",
      limits: { lines: 3, seats: 5 },
      trialEndsAt: "2026-10-29T12:00:00.000Z",
      trialOutboundCap: 50,
      trialOutboundUsed: 12,
    })
  })

  it("keeps an unreadable trial counter as unavailable (null), never 0", () => {
    const parsed = parseAttendeBilling({
      entitlements: { tier: "attende_starter", status: "trialing", limits: null },
      usage: { trialOutbound: { used: null, cap: 50 } },
    })
    expect(parsed.trialOutboundUsed).toBeNull()
    expect(parsed.trialOutboundCap).toBe(50)
  })

  it("never throws: a workspace without a plan, or with odd data, is 'none'", () => {
    const none = {
      tier: null,
      status: "none",
      limits: null,
      trialEndsAt: null,
      trialOutboundCap: 0,
      trialOutboundUsed: null,
    }
    expect(parseAttendeBilling(null)).toEqual(none)
    expect(parseAttendeBilling({})).toEqual(none)
    expect(parseAttendeBilling({ entitlements: null })).toEqual(none)
    expect(parseAttendeBilling({ entitlements: "x" })).toEqual(none)
    expect(parseAttendeBilling({ entitlements: { status: "weird", trialEndsAt: "nope", limits: 3 } })).toMatchObject({
      status: "none",
      trialEndsAt: null,
      limits: null,
    })
  })
})

describe("limitRows", () => {
  it("lists the limits the plan defines, flagging -1 as unlimited", () => {
    expect(limitRows({ lines: 3, agents: -1, aiRepliesPerMonth: 5000 })).toEqual([
      { key: "billLimitLines", value: 3, unlimited: false },
      { key: "billLimitAgents", value: -1, unlimited: true },
      { key: "billLimitReplies", value: 5000, unlimited: false },
    ])
    expect(limitRows(null)).toEqual([])
  })
})

describe("trialClock", () => {
  const now = new Date("2026-10-22T12:00:00.000Z")
  it("counts whole days, says 'today' on the last day and 'ended' afterwards", () => {
    expect(trialClock("trialing", "2026-10-29T12:00:00.000Z", now)).toEqual({ kind: "days", days: 7 })
    expect(trialClock("trialing", "2026-10-22T20:00:00.000Z", now)).toEqual({ kind: "today" })
    expect(trialClock("trialing", "2026-10-21T12:00:00.000Z", now)).toEqual({ kind: "ended" })
  })
  it("is silent outside a trial", () => {
    expect(trialClock("active", "2026-10-29T12:00:00.000Z", now)).toBeNull()
    expect(trialClock("trialing", null, now)).toBeNull()
  })
})

describe("plan state helpers", () => {
  it("names the tier", () => {
    expect(tierName("attende_growth")).toBe("Growth")
    expect(tierName(null)).toBeNull()
  })
  it("recognises the backend block codes and what blocks the person", () => {
    expect(isSubscriptionBlockCode("ATTENDE_TRIAL_EXPIRED")).toBe(true)
    expect(isSubscriptionBlockCode("ATTENDE_QUOTA_EXCEEDED")).toBe(false)
    expect(blockedBy("trialing", { kind: "ended" })).toBe("ATTENDE_TRIAL_EXPIRED")
    expect(blockedBy("past_due", null)).toBe("ATTENDE_SUBSCRIPTION_INACTIVE")
    expect(blockedBy("canceled", null)).toBe("ATTENDE_SUBSCRIPTION_INACTIVE")
    expect(blockedBy("active", null)).toBeNull()
  })
})
