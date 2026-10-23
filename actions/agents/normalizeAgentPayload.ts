import { pickData } from "actions/parseBackendEnvelope"

import type { AgentConfiguration } from "./types"

type AgentWithFlexibleId = Partial<AgentConfiguration> & {
  id?: string
  _id?: string
} & Record<string, unknown>

function coerceResponseGuidelines(camel: unknown, snake: unknown): string | undefined {
  const raw = camel !== undefined ? camel : snake
  if (typeof raw === "string") return raw
  if (!Array.isArray(raw)) return undefined
  const lines = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
  if (lines.length === 0) return ""
  return lines.map((line) => (/^\s*[•●◦*\-+]/.test(line) ? line : `• ${line}`)).join("\n")
}

/**
 * Normalize agent JSON from the REST API — ids, onboarding fields,
 * and `response_guidelines` when only snake_case is present.
 *
 * Workspace-backend GET/PATCH/POST agents return `{ success, data: agentDto }`; this unwraps via `pickData`.
 */
export function normalizeAgentPayload(raw: unknown): AgentConfiguration | null {
  const unwrapped = (pickData<unknown>(raw) ?? raw) as unknown
  if (!unwrapped || typeof unwrapped !== "object") return null
  const agent = unwrapped as AgentWithFlexibleId
  const normalizedId = String(agent._id ?? agent.id ?? "").trim()
  if (!normalizedId) return null

  const onboardingStatus =
    agent.onboardingStatus ?? (typeof agent.onboarding_status === "string" ? agent.onboarding_status : undefined)
  const onboardingCompleted =
    typeof agent.onboardingCompleted === "boolean"
      ? agent.onboardingCompleted
      : typeof agent.onboarding_completed === "boolean"
      ? agent.onboarding_completed
      : undefined

  const responseGuidelines = coerceResponseGuidelines(agent.responseGuidelines, agent.response_guidelines)

  const userId = typeof agent.userId === "string" && agent.userId.trim() ? agent.userId.trim() : undefined
  const accessScope = agent.accessScope === "private" ? "private" : "workspace"

  return {
    ...(agent as AgentConfiguration),
    _id: normalizedId,
    ...(userId ? { userId } : {}),
    accessScope,
    ...(onboardingStatus !== undefined ? { onboardingStatus } : {}),
    ...(onboardingCompleted !== undefined ? { onboardingCompleted } : {}),
    ...(responseGuidelines !== undefined ? { responseGuidelines } : {}),
  }
}
