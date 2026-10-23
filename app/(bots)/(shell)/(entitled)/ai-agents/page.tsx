import { Metadata } from "next"
import { listAgentTemplatesAction, listAttendeAgentsAction } from "actions/attende/agents"
import { AgentsView } from "components/bots-app/agents/AgentsView"

export const metadata: Metadata = { title: "AI agents" }

/** The workspace's AI agents (newest first). Templates load alongside to spot agents whose setup is incomplete. */
export default async function AgentsPage() {
  const [result, templates] = await Promise.all([listAttendeAgentsAction(), listAgentTemplatesAction()])
  return <AgentsView initialAgents={result.success ? result.data : []} initialError={result.success ? null : result} templates={templates.success ? templates.data : []} />
}
