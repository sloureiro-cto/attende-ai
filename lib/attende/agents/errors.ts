import type { AgentActionError } from "./types"

/** One friendly message key per backend code (the UI never shows the raw `message`). */
export type AgentErrorKey =
  | "errorValidation"
  | "errorLineNotFound"
  | "errorNotFound"
  | "errorTemplateNotFound"
  | "errorQuotaAgents"
  | "errorQuotaAgentsLimit"
  | "errorQuotaDocs"
  | "errorQuotaDocsLimit"
  | "errorQuotaReplies"
  | "errorQuota"
  | "errorTrialOutboundCap"
  | "errorNotReadyNoLines"
  | "errorLineNotConnected"
  | "errorFileMissing"
  | "errorFileSize"
  | "errorFileType"
  | "errorTrialExpired"
  | "errorInactive"
  | "errorNotEntitled"
  | "errorAuth"
  | "errorNetwork"
  | "errorGeneric"
  | "errWorkspaceMismatch"
  | "errJsynqUnavailable"

export function agentErrorKey(error: Pick<AgentActionError, "status" | "code" | "details">): AgentErrorKey {
  switch (error.code) {
    case "ATTENDE_AGENT_VALIDATION":
      return "errorValidation"
    case "ATTENDE_AGENT_LINE_NOT_FOUND":
      return "errorLineNotFound"
    case "ATTENDE_AGENT_NOT_FOUND":
      return "errorNotFound"
    case "ATTENDE_AGENT_TEMPLATE_NOT_FOUND":
      return "errorTemplateNotFound"
    case "ATTENDE_QUOTA_EXCEEDED": {
      // The agents routes send `resource`; the shared plan gate sends `quota`. Accept both.
      const resource = error.details?.resource ?? error.details?.quota
      if (resource === "agents") return "errorQuotaAgents"
      if (resource === "docs") return "errorQuotaDocs"
      if (resource === "aiReplies" || resource === "aiRepliesPerMonth") return "errorQuotaReplies"
      return "errorQuota"
    }
    case "ATTENDE_TRIAL_OUTBOUND_CAP":
      return "errorTrialOutboundCap"
    case "ATTENDE_AGENT_NOT_READY":
      return "errorNotReadyNoLines"
    case "ATTENDE_AGENT_LINE_NOT_CONNECTED":
      return "errorLineNotConnected"
    case "ATTENDE_AGENT_FILE_REJECTED":
      return error.details?.reason === "size" ? "errorFileSize" : error.details?.reason === "type" ? "errorFileType" : "errorFileMissing"
    case "ATTENDE_TRIAL_EXPIRED":
      return "errorTrialExpired"
    case "ATTENDE_SUBSCRIPTION_INACTIVE":
      return "errorInactive"
    case "ATTENDE_NOT_ENTITLED":
      return "errorNotEntitled"
    case "WORKSPACE_TOKEN_MISMATCH":
      return "errWorkspaceMismatch"
    case "JSYNQ_UNAVAILABLE":
      return "errJsynqUnavailable"
    default:
      break
  }
  if (error.status === 401) return "errorAuth"
  if (error.status === 402) return "errorInactive"
  if (error.status === 413) return "errorFileSize"
  if (error.status === 415) return "errorFileType"
  if (error.status === 0) return "errorNetwork"
  return "errorGeneric"
}

/**
 * The message key plus its values. A quota error that carries its `limit` says the number ("up to 3 agents");
 * without it the generic sentence is used, never a made-up number.
 */
export function agentErrorMessage(error: Pick<AgentActionError, "status" | "code" | "details">): { key: AgentErrorKey; params?: Record<string, number> } {
  const key = agentErrorKey(error)
  const limit = error.details?.limit
  const known = typeof limit === "number" && Number.isFinite(limit) && limit >= 0
  if (key === "errorQuotaAgents" && known) return { key: "errorQuotaAgentsLimit", params: { limit } }
  if (key === "errorQuotaDocs" && known) return { key: "errorQuotaDocsLimit", params: { limit } }
  return { key }
}

/** Errors whose fix is a plan change (limit reached, trial over, no Attende plan): the UI adds a "See plans" link to /billing. */
export const isPlanError = (error: Pick<AgentActionError, "status" | "code">): boolean =>
  error.code === "ATTENDE_QUOTA_EXCEEDED" ||
  error.code === "ATTENDE_TRIAL_OUTBOUND_CAP" ||
  error.code === "ATTENDE_TRIAL_EXPIRED" ||
  error.code === "ATTENDE_SUBSCRIPTION_INACTIVE" ||
  error.code === "ATTENDE_NOT_ENTITLED" ||
  error.status === 402

/** Errors a retry cannot fix (plan, missing agent): no "Try again" button. */
export const isRetryable = (error: Pick<AgentActionError, "status" | "code">): boolean =>
  !isPlanError(error) && error.code !== "ATTENDE_AGENT_NOT_FOUND" && error.code !== "ATTENDE_AGENT_VALIDATION" && error.status !== 401
