"use server"

import { pickData, pickMeta } from "actions/parseBackendEnvelope"
import { FetchClient, HttpError } from "lib/api"
import { normalizeAgentPayload } from "./normalizeAgentPayload"
import { AgentConfiguration } from "./types"

interface GetAgentsOutput {
  error?: string
  success: boolean
  data?: AgentConfiguration[]
  total?: number
}

type GetAgentsResponse =
  | AgentConfiguration[]
  | {
      agents?: AgentConfiguration[]
      data?: AgentConfiguration[] | { agents?: AgentConfiguration[] }
    }

function normalizeListedAgent(agent: unknown): AgentConfiguration | null {
  return normalizeAgentPayload(agent)
}

function normalizeAgents(payload: GetAgentsResponse): AgentConfiguration[] {
  const rawAgents = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.agents)
    ? payload.agents
    : Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.data?.agents)
    ? payload.data.agents
    : []

  return rawAgents
    .map((agent) => normalizeListedAgent(agent))
    .filter((agent): agent is AgentConfiguration => Boolean(agent))
}

type GetAgentsOptions = {
  search?: string
  limit?: number
  offset?: number
  /**
   * Backend filter: only agents with this channel in `enabledChannels`.
   * Omit for WhatsApp Lite pickers — many agents omit the field (defaults apply on create) and the filter returns an empty list.
   */
  enabledChannel?: string
}

export const getAgents = async (workspaceId: string, options?: GetAgentsOptions): Promise<GetAgentsOutput> => {
  try {
    const query: Record<string, string | number> = { workspaceId }
    if (options?.search?.trim()) query.search = options.search.trim()
    if (options?.limit != null) query.limit = options.limit
    if (options?.offset != null) query.offset = options.offset
    if (options?.enabledChannel?.trim()) query.enabledChannel = options.enabledChannel.trim()

    const raw = await FetchClient.get<unknown>(`${process.env.BACKEND_URL}/agents`, {
      query,
    })
    const payload = (pickData<unknown>(raw) ?? raw) as GetAgentsResponse
    const data = normalizeAgents(payload)
    const total = pickMeta(raw).total

    return {
      success: true,
      data,
      total,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { error: error.message, success: false }
    }
    return { error: "something went wrong", success: false }
  }
}
