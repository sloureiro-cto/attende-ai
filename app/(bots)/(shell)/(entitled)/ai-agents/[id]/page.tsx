import { Metadata } from "next"
import { getAttendeAgentAction, listAgentKnowledgeAction, listAgentTemplatesAction } from "actions/attende/agents"
import { AgentDetail } from "components/bots-app/agents/AgentDetail"
import { AgentLoadError } from "components/bots-app/agents/AgentLoadError"
import { AGENT_TABS, type AgentTab } from "lib/attende/agents/status"
import { loadLines } from "lib/bots-app/loadLines"

export const metadata: Metadata = { title: "AI agent" }

type Props = { params: { id: string }; searchParams?: { tab?: string | string[] } }

/** One agent: overview, setup, documents and activity. Every source loads in parallel and fails on its own. */
export default async function AgentPage({ params, searchParams }: Props) {
  const [agent, templates, lines, knowledge] = await Promise.all([
    getAttendeAgentAction(params.id),
    listAgentTemplatesAction(),
    loadLines({ withBots: false }),
    listAgentKnowledgeAction(params.id),
  ])
  if (!agent.success) return <AgentLoadError error={agent} />

  const requested = typeof searchParams?.tab === "string" ? searchParams.tab : "overview"
  const initialTab: AgentTab = (AGENT_TABS as readonly string[]).includes(requested) ? (requested as AgentTab) : "overview"
  const template = templates.success ? (templates.data.find((x) => x.key === agent.data.templateKey) ?? null) : null

  return (
    <AgentDetail
      agent={agent.data}
      template={template}
      templatesError={templates.success ? null : templates}
      lines={lines.lines}
      linesFailed={lines.failedChannels.length > 0}
      documents={knowledge.success ? knowledge.data : []}
      documentsError={knowledge.success ? null : knowledge}
      initialTab={initialTab}
    />
  )
}
