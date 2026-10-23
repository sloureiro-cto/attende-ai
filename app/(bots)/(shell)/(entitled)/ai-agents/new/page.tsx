import { Metadata } from "next"
import { listAgentTemplatesAction } from "actions/attende/agents"
import { auth } from "auth"
import { AgentWizard } from "components/bots-app/agents/AgentWizard"
import { TEMPLATE_KEYS, type TemplateKey } from "lib/attende/agents/types"
import { loadLines } from "lib/bots-app/loadLines"

export const metadata: Metadata = { title: "New agent" }

type Props = { searchParams?: { template?: string | string[] } }

/** Creation wizard. Templates (the questions) come from the backend; lines are read so the user can pick where to answer. */
export default async function NewAgentPage({ searchParams }: Props) {
  const [session, templates, lines] = await Promise.all([auth(), listAgentTemplatesAction(), loadLines({ withBots: false })])
  const requested = typeof searchParams?.template === "string" ? searchParams.template : null
  const initialTemplateKey = requested && (TEMPLATE_KEYS as readonly string[]).includes(requested) ? (requested as TemplateKey) : null

  return (
    <AgentWizard
      templates={templates.success ? templates.data : []}
      templatesError={templates.success ? null : templates}
      lines={lines.lines}
      linesFailed={lines.failedChannels.length > 0}
      workspaceId={session?.user?.workspaceId ?? ""}
      initialTemplateKey={initialTemplateKey}
    />
  )
}
