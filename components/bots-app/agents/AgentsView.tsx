"use client"

import { Bot, FlaskConical, Pencil, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { businessContext } from "lib/attende/agents/context"
import { isPlanError } from "lib/attende/agents/errors"
import type { AgentActionError, AgentTemplate, AgentView, JsynqAgentView } from "lib/attende/agents/types"
import { plural } from "lib/attende/format"
import { AttentionPill, LinesList, StatusPill, TemplateBadge } from "./AgentBadges"
import { AgentPowerControl } from "./AgentPowerControl"
import { JsynqAgentCard } from "./JsynqAgentCard"
import { ErrorNotice } from "./PlanNotice"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"
import { PageLayout } from "../ui/PageLayout"
import { PremiumCard } from "../ui/PremiumCard"

type Props = {
  initialAgents: AgentView[]
  /** Agents that exist only in JSYNQ: listed after Attende's own, with per-channel switches and a link to JSYNQ. */
  initialJsynqAgents?: JsynqAgentView[]
  initialError?: AgentActionError | null
  /** Templates, to tell "setup incomplete" from the other states. Empty when they failed: that state is then not shown. */
  templates?: AgentTemplate[]
}

/** The workspace's agents as cards (state, channels, actions), with a big "Create your first agent" when there is none. */
export function AgentsView({ initialAgents, initialJsynqAgents = [], initialError = null, templates = [] }: Props) {
  const { t, appLanguage } = useAttendeAgentsT()
  const router = useRouter()
  const [agents, setAgents] = useState(initialAgents)
  const [jsynqAgents, setJsynqAgents] = useState(initialJsynqAgents)
  const replace = (next: AgentView) => setAgents((all) => all.map((a) => (a.id === next.id ? { ...a, ...next } : a)))
  const replaceJsynq = (next: JsynqAgentView) => setJsynqAgents((all) => all.map((a) => (a.id === next.id ? next : a)))
  const total = agents.length + jsynqAgents.length
  const templateOf = (agent: AgentView) => templates.find((x) => x.key === agent.templateKey) ?? null

  return (
    <PageLayout
      title={t("listTitle")}
      subtitle={!initialError && total > 0 ? plural(total, appLanguage, { one: t("agentsCountOne"), other: t("agentsCountOther") }) : t("listSubtitle")}
      actions={
        !initialError &&
        total > 0 && (
          <Link href="/ai-agents/new" className={actionClass({ variant: "primary", size: "md" })}>
            <Plus className="size-4" aria-hidden />
            {t("newAgent")}
          </Link>
        )
      }
    >
      {initialError ? (
        <div className="flex flex-col gap-3">
          {/* A plan problem is not a loading failure: the notice alone explains it. */}
          {!isPlanError(initialError) && <p className="text-body-14 font-medium text-neutral-800">{t("listError")}</p>}
          <ErrorNotice error={initialError} onRetry={() => router.refresh()} />
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<Bot className="size-6" aria-hidden />}
          title={t("listEmptyTitle")}
          description={t("listEmptyHint")}
          className="py-20"
          action={
            <Link href="/ai-agents/new" className={actionClass({ variant: "primary", size: "lg" })}>
              <Plus className="size-4" aria-hidden />
              {t("listEmptyTitle")}
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {agents.length > 0 && (
            <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label={t("listTitle")}>
              {agents.map((agent) => {
                const href = `/ai-agents/${encodeURIComponent(agent.id)}`
                return (
                  <li key={agent.id} className="flex">
                    <PremiumCard className="flex w-full flex-col gap-5 p-5 sm:p-6">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <TemplateBadge templateKey={agent.templateKey} t={t} />
                          <StatusPill agent={agent} t={t} appLanguage={appLanguage} template={templateOf(agent)} />
                          <AttentionPill agent={agent} t={t} appLanguage={appLanguage} />
                        </div>
                        <h2 className="text-body-18 font-semibold text-neutral-900">
                          <Link href={href} className="break-words hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                            {agent.name}
                          </Link>
                        </h2>
                        <p className="text-body-13 text-neutral-600">{agent.lastTestPassedAt ? t("lastTestPassed") : t("neverTested")}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <h3 className="text-body-12 font-semibold uppercase tracking-wide text-neutral-500">{t("linesServed")}</h3>
                        <LinesList lines={agent.lines} t={t} showAgentState />
                      </div>
                      <div className="mt-auto flex flex-wrap gap-2">
                        {agent.lines.length > 0 && agent.status !== "live" && !businessContext(agent.form ?? {}).description && agent.documents.length === 0 ? (
                          // Not enough about the business to turn on: the agent page explains and offers the fixes.
                          <Link href={href} className={actionClass({ variant: "primary", size: "lg" })}>
                            {t("completeInfo")}
                            <span className="sr-only">: {agent.name}</span>
                          </Link>
                        ) : agent.lines.length > 0 ? (
                          <AgentPowerControl agent={agent} onChange={replace} />
                        ) : (
                          <Link href={href} className={actionClass({ variant: "primary", size: "lg" })}>
                            <Plus className="size-4" aria-hidden />
                            {t("chooseLines")}
                            <span className="sr-only">: {agent.name}</span>
                          </Link>
                        )}
                        <Link href={`${href}?tab=setup`} className={actionClass({ variant: "secondary", size: "lg" })}>
                          <Pencil className="size-4" aria-hidden />
                          {t("actionEdit")}
                          <span className="sr-only">: {agent.name}</span>
                        </Link>
                        <Link href={`${href}#agent-try`} className={actionClass({ variant: "secondary", size: "lg" })}>
                          <FlaskConical className="size-4" aria-hidden />
                          {t("actionTest")}
                          <span className="sr-only">: {agent.name}</span>
                        </Link>
                      </div>
                    </PremiumCard>
                  </li>
                )
              })}
            </ul>
          )}
          {jsynqAgents.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="jsynq-agents-title">
              <div className="flex flex-col gap-1">
                <h2 id="jsynq-agents-title" className="text-body-16 font-semibold text-neutral-900">
                  {t("jsynqSectionTitle")}
                </h2>
                <p className="text-body-13 text-neutral-600">{t("jsynqSectionHint")}</p>
              </div>
              <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label={t("jsynqSectionTitle")}>
                {jsynqAgents.map((agent) => (
                  <li key={agent.id} className="flex">
                    <JsynqAgentCard agent={agent} onChange={replaceJsynq} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </PageLayout>
  )
}
