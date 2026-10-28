import { agentErrorKey, agentErrorMessage, isPlanError, isRetryable } from "../errors"

describe("agent error mapping", () => {
  it.each([
    [{ status: 400, code: "ATTENDE_AGENT_VALIDATION" }, "errorValidation"],
    [{ status: 400, code: "ATTENDE_AGENT_LINE_NOT_FOUND" }, "errorLineNotFound"],
    [{ status: 404, code: "ATTENDE_AGENT_NOT_FOUND" }, "errorNotFound"],
    [{ status: 404, code: "ATTENDE_AGENT_TEMPLATE_NOT_FOUND" }, "errorTemplateNotFound"],
    [{ status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "agents" } }, "errorQuotaAgents"],
    [{ status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "docs" } }, "errorQuotaDocs"],
    [{ status: 402, code: "ATTENDE_QUOTA_EXCEEDED", details: { quota: "agents" } }, "errorQuotaAgents"],
    [{ status: 402, code: "ATTENDE_QUOTA_EXCEEDED", details: { quota: "aiReplies" } }, "errorQuotaReplies"],
    [{ status: 402, code: "ATTENDE_QUOTA_EXCEEDED" }, "errorQuota"],
    [{ status: 409, code: "ATTENDE_AGENT_NOT_READY" }, "errorNotReadyNoLines"],
    [{ status: 409, code: "ATTENDE_AGENT_LINE_NOT_CONNECTED" }, "errorLineNotConnected"],
    [{ status: 409, code: "ATTENDE_AUTOMATION_ON_LINE", details: { lines: [{ channel: "whatsapp", sessionId: "s1" }] } }, "errorAutomationOnLine"],
    [{ status: 413, code: "ATTENDE_AGENT_FILE_REJECTED", details: { reason: "size" } }, "errorFileSize"],
    [{ status: 415, code: "ATTENDE_AGENT_FILE_REJECTED", details: { reason: "type" } }, "errorFileType"],
    [{ status: 400, code: "ATTENDE_AGENT_FILE_REJECTED", details: { reason: "missing" } }, "errorFileMissing"],
    [{ status: 402, code: "ATTENDE_TRIAL_EXPIRED" }, "errorTrialExpired"],
    [{ status: 402, code: "ATTENDE_SUBSCRIPTION_INACTIVE" }, "errorInactive"],
    [{ status: 403, code: "ATTENDE_NOT_ENTITLED" }, "errorNotEntitled"],
    [{ status: 402, code: "ATTENDE_TRIAL_OUTBOUND_CAP" }, "errorTrialOutboundCap"],
    [{ status: 401, code: "AUTH_REQUIRED" }, "errorAuth"],
    [{ status: 503, code: "JSYNQ_UNAVAILABLE" }, "errJsynqUnavailable"],
    [{ status: 409, code: "WORKSPACE_TOKEN_MISMATCH" }, "errWorkspaceMismatch"],
    [{ status: 413 }, "errorFileSize"],
    [{ status: 0 }, "errorNetwork"],
    [{ status: 500 }, "errorGeneric"],
  ] as const)("%j -> %s", (error, key) => {
    expect(agentErrorKey(error as Parameters<typeof agentErrorKey>[0])).toBe(key)
  })

  it("flags plan problems so the UI can offer the plans page", () => {
    expect(isPlanError({ status: 403, code: "ATTENDE_QUOTA_EXCEEDED" })).toBe(true)
    expect(isPlanError({ status: 402, code: "ATTENDE_TRIAL_EXPIRED" })).toBe(true)
    expect(isPlanError({ status: 402, code: "ATTENDE_TRIAL_OUTBOUND_CAP" })).toBe(true)
    expect(isPlanError({ status: 403, code: "ATTENDE_NOT_ENTITLED" })).toBe(true)
    expect(isPlanError({ status: 400, code: "ATTENDE_AGENT_VALIDATION" })).toBe(false)
  })

  it("says the plan limit only when the API sent it", () => {
    expect(agentErrorMessage({ status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "agents", limit: 3 } })).toEqual({ key: "errorQuotaAgentsLimit", params: { limit: 3 } })
    expect(agentErrorMessage({ status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "docs", limit: 10 } })).toEqual({ key: "errorQuotaDocsLimit", params: { limit: 10 } })
    expect(agentErrorMessage({ status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "agents" } })).toEqual({ key: "errorQuotaAgents" })
  })

  it("offers a retry only when trying again can help", () => {
    expect(isRetryable({ status: 0 })).toBe(true)
    expect(isRetryable({ status: 500 })).toBe(true)
    expect(isRetryable({ status: 403, code: "ATTENDE_QUOTA_EXCEEDED" })).toBe(false)
    expect(isRetryable({ status: 400, code: "ATTENDE_AGENT_VALIDATION" })).toBe(false)
  })

  it("an automation on the line is fixed elsewhere, not by retrying", () => {
    expect(isRetryable({ status: 409, code: "ATTENDE_AUTOMATION_ON_LINE" })).toBe(false)
    expect(isPlanError({ status: 409, code: "ATTENDE_AUTOMATION_ON_LINE" })).toBe(false)
  })
})
