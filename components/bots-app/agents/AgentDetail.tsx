"use client"

import * as Tabs from "@radix-ui/react-tabs"
import { ArrowLeft, ChevronDown, MessagesSquare } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { businessContext } from "lib/attende/agents/context"
import { AGENT_TABS, type AgentTab, AI_INBOX_HREF, brokenLines, displayStatus } from "lib/attende/agents/status"
import type { AgentActionError, AgentTemplate, AgentView, KnowledgeDocument, TestResult } from "lib/attende/agents/types"
import { formatDateTime, formatNumber } from "lib/attende/format"
import type { BotsLine } from "lib/bots-app/lines"
import { AttentionPill, statusHint, StatusPill, TemplateBadge } from "./AgentBadges"
import { AgentChannelsPanel } from "./AgentChannelsPanel"
import { AgentPowerControl } from "./AgentPowerControl"
import { AgentSetupEditor } from "./AgentSetupEditor"
import { KnowledgePanel } from "./documents/KnowledgePanel"
import { ErrorNotice } from "./PlanNotice"
import { PreviewChat } from "./PreviewChat"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"
import { PageLayout } from "../ui/PageLayout"
import { PremiumCard } from "../ui/PremiumCard"

type Props = {
  agent: AgentView
  template: AgentTemplate | null
  templatesError?: AgentActionError | null
  lines: BotsLine[]
  linesFailed?: boolean
  documents: KnowledgeDocument[]
  /** The documents list failed to load: the tab says so instead of "No documents". */
  documentsError?: AgentActionError | null
  initialTab?: AgentTab
}

const TAB_KEY = { overview: "tabOverview", setup: "tabSetup", knowledge: "tabKnowledge", activity: "tabActivity" } as const
const TAB_TRIGGER =
  "-mb-px min-h-11 shrink-0 border-b-2 border-transparent px-3 text-body-14 font-medium text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary data-[state=active]:border-primary-dark data-[state=active]:font-semibold data-[state=active]:text-neutral-900 sm:px-4"

/**
 * /ai-agents/[id]: the agent's state (on in N channels / paused / no channels / setup incomplete), its channels with
 * attach and detach, the simulation, setup editing, documents and a way to the real conversations.
 * Every state on screen is the one the server last confirmed.
 */
export function AgentDetail({ agent: initialAgent, template, templatesError = null, lines, linesFailed = false, documents, documentsError = null, initialTab = "overview" }: Props) {
  const { t, appLanguage } = useAttendeAgentsT()
  const [agent, setAgent] = useState(initialAgent)
  const [tab, setTab] = useState<AgentTab>(initialTab)
  const [docs, setDocs] = useState<KnowledgeDocument[]>(documents)
  // Opened by "Check rules" or a link to #agent-try (the list cards).
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  useEffect(() => {
    if (window.location.hash === "#agent-try") setDiagnosticsOpen(true)
  }, [])
  // Turning on waits until the agent knows the business (a real description or a document already read).
  // When the document list could not be read, the agent's own list counts (its reading status is unknown, not failed).
  const goLiveBlocked = agent.status !== "live" && !(documentsError ? businessContext(agent.form ?? {}).description || agent.documents.length > 0 : businessContext(agent.form ?? {}, docs).enough)
  const merge = (next: AgentView) => setAgent((a) => ({ ...a, ...next }))
  const broken = brokenLines(agent)
  const status = displayStatus(agent, template)

  const changeTab = (value: string) => {
    setTab(value as AgentTab)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", value)
      url.hash = ""
      window.history.replaceState(window.history.state, "", url.toString())
    } catch {
      // Ignore: only the deep link is lost.
    }
  }

  const dateLine =
    agent.status === "live" && agent.liveSince ? t("liveSince", { date: formatDateTime(agent.liveSince, appLanguage) }) : agent.updatedAt ? t("updatedAt", { date: formatDateTime(agent.updatedAt, appLanguage) }) : null

  return (
    <Tabs.Root value={tab} onValueChange={changeTab}>
      <PageLayout
        title={agent.name}
        subtitle={dateLine}
        actions={agent.lines.length > 0 || agent.status === "live" ? <AgentPowerControl agent={agent} onChange={merge} appearance="switch" goLiveBlocked={goLiveBlocked} /> : null}
        toolbar={
          <Tabs.List aria-label={t("tabsAria")} className="-mb-3 flex gap-1 overflow-x-auto">
            {AGENT_TABS.map((key) => (
              <Tabs.Trigger key={key} value={key} className={TAB_TRIGGER}>
                {t(TAB_KEY[key])}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        }
      >
        <div className="flex flex-col gap-5">
          <Link href="/ai-agents" className="inline-flex min-h-11 w-fit items-center gap-2 text-body-14 font-medium text-neutral-600 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToAgents")}
          </Link>

          <Tabs.Content value="overview" className="mx-auto flex w-full max-w-4xl flex-col gap-5 focus:outline-none data-[state=inactive]:hidden">
            {/* 1. State: what the agent does for customers right now. */}
            <PremiumCard className="flex flex-col gap-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <TemplateBadge templateKey={agent.templateKey} t={t} />
                <StatusPill agent={agent} t={t} appLanguage={appLanguage} template={template} />
                <AttentionPill agent={agent} t={t} appLanguage={appLanguage} />
              </div>
              <p className="text-body-14 text-neutral-700" role="status">
                {statusHint(agent, t, appLanguage, template)}
              </p>
            </PremiumCard>

            {/* 2. Channels: connection and whether the agent answers on each one. */}
            <PremiumCard className="p-5 sm:p-6">
              <AgentChannelsPanel agent={agent} lines={lines} linesFailed={linesFailed} template={template} onChange={merge} />
            </PremiumCard>

            {/* 3. Pending items, only when there are any. */}
            {(broken.length > 0 || (goLiveBlocked && status !== "incomplete") || status === "incomplete") && (
              <PremiumCard className="flex flex-col gap-3 p-5 sm:p-6" aria-labelledby="agent-pending-title">
                <h2 id="agent-pending-title" className="text-body-16 font-semibold text-neutral-900">
                  {t("overviewPendingTitle")}
                </h2>
                {broken.length > 0 && (
                  <p className="text-body-14 text-neutral-900">
                    {t("errorLineNotConnected")}{" "}
                    <Link href="/lines" className="font-semibold text-primary-dark underline underline-offset-2">
                      {t("linesManage")}
                    </Link>
                  </p>
                )}
                {goLiveBlocked && status !== "incomplete" && (
                  <div role="status" className="flex flex-col items-start gap-2 rounded-xl border border-warning-lighter bg-warning-clean p-3.5 text-body-14 text-neutral-900">
                    <p>{t("activateBlockedContext")}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => changeTab("setup")} className={actionClass({ variant: "secondary", size: "sm" })}>
                        {t("pendingCompleteDescription")}
                      </button>
                      <button type="button" onClick={() => changeTab("knowledge")} className={actionClass({ variant: "secondary", size: "sm" })}>
                        {t("pendingAddDocuments")}
                      </button>
                    </div>
                  </div>
                )}
                {status === "incomplete" && (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-body-14 text-neutral-900">{t("hintIncomplete")}</p>
                    <button type="button" onClick={() => changeTab("setup")} className={actionClass({ variant: "secondary", size: "sm" })}>
                      {t("tabSetup")}
                    </button>
                  </div>
                )}
              </PremiumCard>
            )}

            {/* 4. Actions. */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => changeTab("setup")} className={actionClass({ variant: "secondary", size: "lg" })}>
                {t("actionConfigure")}
              </button>
              <button type="button" onClick={() => changeTab("knowledge")} className={actionClass({ variant: "secondary", size: "lg" })}>
                {t("actionDocuments")} ({agent.documents.length > 0 ? formatNumber(agent.documents.length, appLanguage) : t("summaryNone")})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiagnosticsOpen(true)
                  requestAnimationFrame(() => document.getElementById("agent-try")?.scrollIntoView({ block: "start" }))
                }}
                className={actionClass({ variant: "secondary", size: "lg" })}
              >
                {t("tryTitle")}
              </button>
            </div>

            {/* Secondary: the rules check (not a conversation with the AI). */}
            <PremiumCard className="flex flex-col" id="agent-try">
              <button
                type="button"
                aria-expanded={diagnosticsOpen}
                aria-controls="agent-diagnostics"
                onClick={() => setDiagnosticsOpen((v) => !v)}
                className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 rounded-2xl p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-6"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-body-16 font-semibold text-neutral-900">{t("diagnosticsTitle")}</span>
                  <span className="text-body-13 text-neutral-600">
                    {t("lastTestPassed")}: {agent.lastTestPassedAt ? t("lastTestPassedAt", { date: formatDateTime(agent.lastTestPassedAt, appLanguage) }) : t("neverTested")}
                  </span>
                </span>
                <ChevronDown className={cn("size-5 shrink-0 text-neutral-500 transition-transform motion-reduce:transition-none", diagnosticsOpen && "rotate-180")} aria-hidden />
              </button>
              <div id="agent-diagnostics" hidden={!diagnosticsOpen} className="flex flex-col gap-3 border-t border-neutral-50 p-5 sm:p-6">
                <PreviewChat agentId={agent.id} onResult={(result: TestResult) => result.passed && setAgent((a) => ({ ...a, lastTestPassedAt: new Date().toISOString() }))} />
                <p className="text-body-13 text-neutral-600">{t("diagnosticsNoLiveTest")}</p>
              </div>
            </PremiumCard>
          </Tabs.Content>

          {/* Kept mounted so unsaved answers survive a look at another tab. */}
          <Tabs.Content value="setup" forceMount className="focus:outline-none data-[state=inactive]:hidden">
            {template ? (
              <AgentSetupEditor agent={agent} template={template} onSaved={merge} />
            ) : (
              <div className="flex flex-col gap-3">
                <EmptyState title={t("templatesError")} />
                <ErrorNotice error={templatesError} />
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="knowledge" className="flex flex-col gap-4 focus:outline-none data-[state=inactive]:hidden">
            <p className="max-w-2xl text-body-14 text-neutral-600">{t("docsHint")}</p>
            <KnowledgePanel agentId={agent.id} initialDocuments={documents} initialError={documentsError} onDocumentsChange={setDocs} />
          </Tabs.Content>

          <Tabs.Content value="activity" className="focus:outline-none data-[state=inactive]:hidden">
            <EmptyState
              icon={<MessagesSquare className="size-6" aria-hidden />}
              title={t("tabActivity")}
              description={t("activityHint")}
              action={
                <Link href={AI_INBOX_HREF} className={actionClass({ variant: "primary", size: "lg" })}>
                  {t("openInbox")}
                </Link>
              }
            />
          </Tabs.Content>
        </div>
      </PageLayout>
    </Tabs.Root>
  )
}
