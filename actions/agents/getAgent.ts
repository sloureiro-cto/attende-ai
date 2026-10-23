"use server"

import { normalizeAgentPayload } from "./normalizeAgentPayload"
import { AgentConfiguration } from "./types"
import { auth } from "../../auth"

interface GetAgentOutput {
  error?: string
  success: boolean
  data?: AgentConfiguration
}

export const getAgent = async (workspaceId: string, agentId: string): Promise<GetAgentOutput> => {
  try {
    const session = await auth()

    if (!session || !session.apiToken) {
      return { error: "unauthorized", success: false }
    }

    const backendUrl = process.env.BACKEND_URL

    if (!backendUrl) {
      return { error: "backend url is not defined", success: false }
    }

    void workspaceId
    const response = await fetch(`${backendUrl}/agents/${encodeURIComponent(agentId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.apiToken}`,
      },
    })

    if (!response.ok) {
      return {
        error: "something went wrong fetching agent",
        success: false,
      }
    }

    const raw = (await response.json()) as Record<string, unknown>
    const data = normalizeAgentPayload(raw)

    if (!data) {
      return { error: "invalid agent payload", success: false }
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    return { error: "something went wrong", success: false }
  }
}
