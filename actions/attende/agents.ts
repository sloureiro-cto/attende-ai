"use server"

import { getUsersFromWorkspace } from "actions/users/getUsersFromWorkspace"
import { auth } from "auth"
import { agentsFetch } from "lib/attende/agents/api"
import type { AgentActionResult, AgentForm, AgentLine, AgentTemplate, AgentView, CreateAgentInput, CrmTarget, KnowledgeDocument, TestResult } from "lib/attende/agents/types"

const enc = encodeURIComponent

export async function listAgentTemplatesAction(): Promise<AgentActionResult<AgentTemplate[]>> {
  const result = await agentsFetch<{ templates: AgentTemplate[] }>("/templates")
  return result.success ? { success: true, data: result.data.templates ?? [] } : result
}

export async function listAttendeAgentsAction(): Promise<AgentActionResult<AgentView[]>> {
  const result = await agentsFetch<{ agents: AgentView[] }>("/")
  return result.success ? { success: true, data: result.data.agents ?? [] } : result
}

export async function getAttendeAgentAction(id: string): Promise<AgentActionResult<AgentView>> {
  return agentsFetch<AgentView>(`/${enc(id)}`)
}

/** Idempotent per `clientRequestId`: a retry returns the agent created the first time. The agent starts paused. */
export async function createAttendeAgentAction(input: CreateAgentInput): Promise<AgentActionResult<AgentView>> {
  return agentsFetch<AgentView>("/from-template", { method: "POST", body: input })
}

export async function updateAttendeAgentSetupAction(
  id: string,
  input: { form: AgentForm; lines?: AgentLine[]; crm?: CrmTarget | null }
): Promise<AgentActionResult<AgentView>> {
  return agentsFetch<AgentView>(`/${enc(id)}/setup`, { method: "PATCH", body: input })
}

export async function goLiveAttendeAgentAction(id: string): Promise<AgentActionResult<AgentView>> {
  return agentsFetch<AgentView>(`/${enc(id)}/go-live`, { method: "POST", body: {} })
}

export async function pauseAttendeAgentAction(id: string): Promise<AgentActionResult<AgentView>> {
  return agentsFetch<AgentView>(`/${enc(id)}/pause`, { method: "POST", body: {} })
}

/** Dry run: no model call and nothing sent. `at` simulates another moment for the working-hours check. */
export async function testAttendeAgentAction(id: string, input: { message?: string; at?: string } = {}): Promise<AgentActionResult<TestResult>> {
  return agentsFetch<TestResult>(`/${enc(id)}/test`, { method: "POST", body: input })
}

export async function listAgentKnowledgeAction(id: string): Promise<AgentActionResult<KnowledgeDocument[]>> {
  const result = await agentsFetch<{ documents: KnowledgeDocument[] }>(`/${enc(id)}/knowledge`)
  return result.success ? { success: true, data: result.data.documents ?? [] } : result
}

export async function deleteAgentKnowledgeAction(id: string, documentId: string): Promise<AgentActionResult<{ removed: boolean }>> {
  return agentsFetch<{ removed: boolean }>(`/${enc(id)}/knowledge/${enc(documentId)}`, { method: "DELETE" })
}

/** Workspace members a handoff can go to (same source as the Team page). Name and e-mail only. */
export async function listHandoffMembersAction(): Promise<AgentActionResult<Array<{ id: string; name: string; email: string }>>> {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  if (!workspaceId) return { success: false, status: 401, code: "AUTH_REQUIRED" }
  const result = await getUsersFromWorkspace(workspaceId)
  if (!result.success) return { success: false, status: 500 }
  return { success: true, data: (result.data ?? []).map((m) => ({ id: m.id, name: m.name, email: m.email })) }
}
