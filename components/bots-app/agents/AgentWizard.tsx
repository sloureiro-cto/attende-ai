"use client"

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { createAttendeAgentAction, getAttendeAgentAction } from "actions/attende/agents"
import { businessContext } from "lib/attende/agents/context"
import { clearDraft, loadDraft, newRequestId, saveDraft } from "lib/attende/agents/draft"
import { cleanForm, type FieldIssue, initialForm } from "lib/attende/agents/form"
import { serverIssuesToMap } from "lib/attende/agents/issueText"
import { pickLocal } from "lib/attende/agents/localize"
import type { AgentActionError, AgentForm, AgentLine, AgentTemplate, AgentView, TemplateKey, TestResult } from "lib/attende/agents/types"
import { buildFlow, clampStep, firstInvalidStep, issuesForStep, stepForServerError, visibleProgress, type WizardStep } from "lib/attende/agents/wizard"
import { localeOf, plural } from "lib/attende/format"
import type { BotsLine } from "lib/bots-app/lines"
import { refreshLinesAction } from "lib/bots-app/linesActions"
import { CHANNEL_KEY } from "./AgentBadges"
import { AgentPowerControl } from "./AgentPowerControl"
import { AgentSetupForm, IssuesSummary } from "./AgentSetupForm"
import { ConfirmDialog } from "./ConfirmDialog"
import { DocumentsDropzone } from "./documents/DocumentsDropzone"
import { useKnowledgeDocuments } from "./documents/useKnowledgeDocuments"
import { useUploadQueue } from "./documents/useUploadQueue"
import { LinesPicker } from "./LinesPicker"
import { markOnboardingStep } from "./onboardingSync"
import { ErrorNotice } from "./PlanNotice"
import { PreviewChat } from "./PreviewChat"
import { ReviewSummary, type ReviewTarget } from "./ReviewSummary"
import { TEMPLATE_COPY, TemplatePicker } from "./TemplatePicker"
import { type AttendeAgentsT, useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"
import { PageLayout } from "../ui/PageLayout"
import { PremiumCard } from "../ui/PremiumCard"

const WhatsAppConnect = dynamic(() => import("../lines/WhatsAppConnect").then((m) => m.WhatsAppConnect), { ssr: false })

type Props = {
  templates: AgentTemplate[]
  templatesError?: AgentActionError | null
  lines: BotsLine[]
  linesFailed?: boolean
  workspaceId: string
  /** From `?template=`: a refresh lands back on the same model (and its saved answers). */
  initialTemplateKey?: TemplateKey | null
}

type Session = {
  form: AgentForm
  lines: AgentLine[]
  step: number
  clientRequestId: string
  createdAgentId?: string
  returnToReview?: boolean
  docNames?: string[]
}

const primaryButton = actionClass({ variant: "primary", size: "lg" })
const secondaryButton = actionClass({ variant: "secondary", size: "lg" })

function stepTitle(step: WizardStep, template: AgentTemplate, t: AttendeAgentsT, language: Parameters<typeof pickLocal>[1]): string {
  switch (step.kind) {
    case "schema":
      return pickLocal(template.steps.find((s) => s.key === step.key)?.title, language)
    case "lines":
      return t("linesTitle")
    case "documents":
      return t("docsTitle")
    case "review":
      return t("reviewTitle")
    case "try":
      return t("createdTitle")
  }
}

const setUrlTemplate = (key: TemplateKey | null) => {
  try {
    window.history.replaceState(window.history.state, "", key ? `/ai-agents/new?template=${key}` : "/ai-agents/new")
  } catch {
    // Not in a browser that allows it: the draft is still in sessionStorage, only the refresh lands on the picker.
  }
}

const joinList = (items: string[], appLanguage: string): string => {
  try {
    return new Intl.ListFormat(localeOf(appLanguage), { style: "long", type: "conjunction" }).format(items)
  } catch {
    return items.join(", ")
  }
}

/**
 * /ai-agents/new: pick a model, answer its questions one step at a time, choose channels and documents, review and
 * create. Creating never turns the agent on: it is created paused, then the last step uploads the documents (with
 * their real reading status), runs the rules check and offers "Turn answering on" behind a confirmation that names
 * the channels. Answers are saved per tab (sessionStorage) on every change and restored after a refresh; picked
 * files cannot be kept that way, so their names are kept and the user is asked to pick them again.
 */
export function AgentWizard({ templates, templatesError = null, lines: initialLines, linesFailed = false, workspaceId, initialTemplateKey = null }: Props) {
  const { t, language, appLanguage } = useAttendeAgentsT()
  const router = useRouter()
  const [templateKey, setTemplateKey] = useState<TemplateKey | null>(() => (initialTemplateKey && templates.some((x) => x.key === initialTemplateKey) ? initialTemplateKey : null))
  const [lastKey, setLastKey] = useState<TemplateKey | null>(templateKey)
  const template = useMemo(() => templates.find((x) => x.key === templateKey) ?? null, [templates, templateKey])
  const flow = useMemo(() => (template ? buildFlow(template) : []), [template])

  const [session, setSession] = useState<Session | null>(null)
  const [restored, setRestored] = useState(false)
  const [lostDocs, setLostDocs] = useState<string[]>([])
  const [issues, setIssues] = useState<FieldIssue[]>([])
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<AgentActionError | null>(null)
  const [creating, setCreating] = useState(false)
  const [agent, setAgent] = useState<AgentView | null>(null)
  const [lines, setLines] = useState(initialLines)
  const [connectOpen, setConnectOpen] = useState(false)
  const [confirmStartOver, setConfirmStartOver] = useState(false)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const summaryRef = useRef<HTMLDivElement | null>(null)
  const moved = useRef(false)
  const creatingRef = useRef(false)

  const createdId = session?.createdAgentId ?? null
  const knowledge = useKnowledgeDocuments(createdId)
  const { refresh: refreshKnowledge } = knowledge
  const uploads = useUploadQueue({
    agentId: createdId,
    onUploaded: () => {
      markOnboardingStep(workspaceId, "docs")
      void refreshKnowledge()
    },
  })

  // Load (or start) the answers for the chosen model. sessionStorage is only readable after mount.
  useEffect(() => {
    if (!template) {
      setSession(null)
      return
    }
    const draft = loadDraft(workspaceId, template.key)
    const tryIndex = buildFlow(template).length - 1
    if (draft) {
      const created = !!draft.createdAgentId
      setSession({
        form: draft.form,
        lines: draft.lines ?? [],
        step: created ? tryIndex : clampStep(buildFlow(template), draft.step, false),
        clientRequestId: draft.clientRequestId || newRequestId(),
        createdAgentId: draft.createdAgentId,
        returnToReview: draft.returnToReview,
        docNames: [],
      })
      setLostDocs(created ? [] : (draft.docNames ?? []))
      setRestored(draft.step > 0 || created)
    } else {
      setSession({ form: initialForm(template, language), lines: [], step: 0, clientRequestId: newRequestId() })
      setLostDocs([])
      setRestored(false)
    }
    // `language` only seeds a new form; changing it later must not reset the answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, workspaceId])

  // Persist on every change, with the names of the files picked so far (the files themselves cannot be stored).
  const queuedNames = useMemo(() => uploads.state.items.map((i) => i.name), [uploads.state.items])
  useEffect(() => {
    if (template && session) saveDraft(workspaceId, { templateKey: template.key, ...session, docNames: session.createdAgentId ? [] : queuedNames })
  }, [template, session, workspaceId, queuedNames])

  // After a refresh on the last step, fetch the agent that was created and its documents.
  useEffect(() => {
    if (!createdId || agent?.id === createdId) return
    let alive = true
    void getAttendeAgentAction(createdId).then((result) => {
      if (alive && result.success) setAgent(result.data)
    })
    void refreshKnowledge()
    return () => {
      alive = false
    }
  }, [createdId, agent?.id, refreshKnowledge])

  // Move focus to the new step's heading so keyboard and screen reader users start at the top.
  const ready = !templateKey || !!session
  useEffect(() => {
    if (!moved.current || !ready) return
    moved.current = false
    headingRef.current?.focus()
  }, [session?.step, templateKey, ready])

  const update = useCallback((change: Partial<Session>) => setSession((s) => (s ? { ...s, ...change } : s)), [])

  const goTo = (index: number, extra: Partial<Session> = {}) => {
    moved.current = true
    setIssues([])
    setError(null)
    update({ step: index, ...extra })
  }

  const choose = (key: TemplateKey) => {
    moved.current = true
    setTemplateKey(key)
    setLastKey(key)
    setUrlTemplate(key)
    setIssues([])
    setServerErrors({})
    setError(null)
  }

  const backToPicker = () => {
    moved.current = true
    setTemplateKey(null)
    setUrlTemplate(null)
  }

  const reset = () => {
    if (!template) return
    clearDraft(workspaceId, template.key)
    for (const item of uploads.state.items) uploads.remove(item.id)
    setRestored(false)
    setLostDocs([])
    setIssues([])
    setServerErrors({})
    setError(null)
    setConfirmStartOver(false)
    moved.current = true
    setSession({ form: initialForm(template, language), lines: [], step: 0, clientRequestId: newRequestId() })
  }

  const hasData = (s: Session, tpl: AgentTemplate) => JSON.stringify(s.form) !== JSON.stringify(initialForm(tpl, language)) || s.lines.length > 0 || uploads.state.items.length > 0 || s.step > 0
  const startOver = () => {
    if (!template || !session) return
    if (hasData(session, template)) setConfirmStartOver(true)
    else reset()
  }

  const showIssues = (found: FieldIssue[]) => {
    setIssues(found)
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const reviewIndex = flow.findIndex((s) => s.kind === "review")

  /** Continue (or "Back to review" after an Edit): the current step must be valid first. */
  const next = (toReview = false) => {
    if (!template || !session) return
    const step = flow[session.step]
    if (!step) return
    const found = issuesForStep(step, template, session.form)
    if (found.length > 0) return showIssues(found)
    if (toReview) goTo(reviewIndex, { returnToReview: false })
    else goTo(session.step + 1, session.step + 1 === reviewIndex ? { returnToReview: false } : {})
  }

  const edit = (target: ReviewTarget) => {
    const index = flow.findIndex((s) => (target.kind === "schema" ? s.kind === "schema" && s.key === target.key : s.kind === target.kind))
    if (index >= 0) goTo(index, { returnToReview: true })
  }

  const create = async () => {
    if (!template || !session || creatingRef.current) return
    const invalid = firstInvalidStep(flow, template, session.form)
    if (invalid >= 0) {
      goTo(invalid, { returnToReview: true })
      showIssues(issuesForStep(flow[invalid]!, template, session.form))
      return
    }
    creatingRef.current = true
    setCreating(true)
    setError(null)
    setServerErrors({})
    const result = await createAttendeAgentAction({ templateKey: template.key, form: cleanForm(session.form), lines: session.lines, clientRequestId: session.clientRequestId })
    creatingRef.current = false
    setCreating(false)
    if (!result.success) {
      const target = stepForServerError(flow, template, result)
      if (target !== null && target >= 0 && target !== session.step) goTo(target, { returnToReview: true })
      setError(result)
      setServerErrors(Object.fromEntries(Object.entries(serverIssuesToMap(result.details?.issues)).map(([path, message]) => [path.replace(/^form\./, ""), message])))
      return
    }
    setAgent(result.data)
    markOnboardingStep(workspaceId, "agent")
    moved.current = true
    update({ createdAgentId: result.data.id, step: flow.length - 1, returnToReview: false })
  }

  const finish = (target: AgentView) => {
    if (template) clearDraft(workspaceId, template.key)
    router.push(`/ai-agents/${encodeURIComponent(target.id)}`)
  }

  const refreshLines = async () => {
    const result = await refreshLinesAction()
    setLines(result.lines)
  }

  // ---- Model picker ----
  if (!template) {
    return (
      <PageLayout title={t("newAgent")} subtitle={t("pickerSubtitle")}>
        <div className="flex flex-col gap-6">
          <WizardHeader title={t("pickerTitle")} headingRef={headingRef} />
          {templatesError || templates.length === 0 ? (
            <div className="flex flex-col gap-3">
              <EmptyState title={t("templatesError")} />
              {templatesError && <ErrorNotice error={templatesError} onRetry={() => router.refresh()} />}
            </div>
          ) : (
            <TemplatePicker templates={templates} onChoose={choose} selected={lastKey} />
          )}
        </div>
      </PageLayout>
    )
  }

  if (!session)
    return (
      <PageLayout title={t("newAgent")} width="narrow">
        <p className="text-body-14 text-neutral-600" role="status">
          {t("loading")}
        </p>
      </PageLayout>
    )

  const step = flow[session.step] ?? flow[0]!
  const progress = visibleProgress(flow, session.step)
  const title = stepTitle(step, template, t, language)
  const created = !!session.createdAgentId
  const uploadedDocs = uploads.state.items.flatMap((i) => (i.document ? [i.document] : []))
  const knownDocs = [...knowledge.documents, ...uploadedDocs.filter((d) => !knowledge.documents.some((k) => k.documentId === d.documentId))]
  // After creation the saved form is the reference (the wizard answers can no longer change it).
  const context = businessContext(agent?.form ?? session.form, knownDocs)
  const statusOf = (documentId: string) => knowledge.documents.find((d) => d.documentId === documentId)?.indexStatus
  const backToReview = !!session.returnToReview && step.kind !== "review" && step.kind !== "try" && reviewIndex > session.step

  return (
    <PageLayout title={t("newAgent")} subtitle={t(TEMPLATE_COPY[template.key].outcome)} width="narrow">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-body-13 text-neutral-600">
            <span aria-hidden>{t("stepOf", { current: progress.current, total: progress.total })}</span>
            {!created && (
              <button type="button" onClick={startOver} className={actionClass({ variant: "ghost", size: "sm" })}>
                {t("startOver")}
              </button>
            )}
          </div>
          <div
            className="flex h-1.5 w-full gap-1"
            role="progressbar"
            aria-label={t("progressAria")}
            aria-valuemin={1}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
            aria-valuetext={t("stepOfTitle", { current: progress.current, total: progress.total, title })}
          >
            {flow.map((s, i) => (
              <span key={i} className={cn("h-full flex-1 rounded-full", i < progress.current ? "bg-primary-dark" : "bg-neutral-50")} />
            ))}
          </div>
        </div>

        {restored && !created && (
          <p role="status" className="rounded-2xl bg-info-clean px-4 py-3 text-body-14 text-info-darkest">
            {t("restoredDraft")}
          </p>
        )}

        <PremiumCard className="flex flex-col gap-6 p-5 sm:p-8 [&_input]:scroll-mb-36 [&_select]:scroll-mb-36 [&_textarea]:scroll-mb-36">
          <h2 ref={headingRef} tabIndex={-1} className="text-[22px] font-semibold tracking-tight text-neutral-900 focus:outline-none">
            {title}
          </h2>

          <IssuesSummary ref={summaryRef} template={template} issues={issues} serverErrors={step.kind === "schema" ? serverErrors : {}} />

          {step.kind === "schema" && (
            <AgentSetupForm
              template={template}
              form={session.form}
              onChange={(form) => {
                update({ form })
                if (issues.length > 0) setIssues(issuesForStep(step, template, form))
              }}
              issues={issues}
              serverErrors={serverErrors}
              stepKey={step.key}
            />
          )}

          {step.kind === "lines" && (
            <div className="flex flex-col gap-4">
              <p className="text-body-14 text-neutral-600">{t("linesHint")}</p>
              <LinesPicker lines={lines} channels={template.channels} selected={session.lines} onChange={(nextLines) => update({ lines: nextLines })} onConnect={() => setConnectOpen(true)} loadFailed={linesFailed} />
              <WhatsAppConnect open={connectOpen} onOpenChange={setConnectOpen} onSessionUpsert={() => void refreshLines()} />
            </div>
          )}

          {step.kind === "documents" && (
            <div className="flex flex-col gap-4">
              <p className="text-body-14 text-neutral-600">{t("docsHint")}</p>
              {lostDocs.length > 0 && uploads.state.items.length === 0 && (
                <p role="status" className="rounded-2xl border border-warning-lighter bg-warning-clean px-4 py-3 text-body-14 text-neutral-900">
                  {t("docsRefreshLost", { names: joinList(lostDocs, appLanguage) })}
                </p>
              )}
              <DocumentsDropzone queue={uploads.state} t={t} appLanguage={appLanguage} onAddFiles={uploads.addFiles} onRemove={uploads.remove} onRetry={uploads.retry} onClearRejected={uploads.clearRejected} waitingForAgent />
              {uploads.state.items.length === 0 && <p className="text-body-13 text-neutral-600">{t("docsSkipHint")}</p>}
            </div>
          )}

          {step.kind === "review" && (
            <div className="flex flex-col gap-4">
              <p className="text-body-14 text-neutral-600">{t("reviewHint")}</p>
              {lostDocs.length > 0 && uploads.state.items.length === 0 && (
                <p role="status" className="rounded-2xl border border-warning-lighter bg-warning-clean px-4 py-3 text-body-14 text-neutral-900">
                  {t("docsRefreshLost", { names: joinList(lostDocs, appLanguage) })}
                </p>
              )}
              <ReviewSummary template={template} form={session.form} lines={session.lines} knownLines={lines} documents={queuedNames} onEdit={edit} />
              <p className="text-body-13 text-neutral-700">{t("reviewCreateNote")}</p>
            </div>
          )}

          {step.kind === "try" && session.createdAgentId && (
            <div className="flex flex-col gap-8">
              <p role="status" className="flex items-start gap-2 rounded-2xl bg-success-clean px-4 py-3 text-body-14 text-success-darkest">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                {t("createdHint")}
              </p>

              <section id="agent-created-docs" aria-labelledby="agent-created-docs-title" className="flex flex-col gap-3">
                <h3 id="agent-created-docs-title" className="text-body-18 font-semibold text-neutral-900">
                  {t("createdDocsTitle")}
                </h3>
                <p className="text-body-14 text-neutral-600">{t("docsHint")}</p>
                <DocumentsDropzone queue={uploads.state} t={t} appLanguage={appLanguage} onAddFiles={uploads.addFiles} onRemove={uploads.remove} onRetry={uploads.retry} onClearRejected={uploads.clearRejected} statusOf={statusOf} />
              </section>

              <PreviewChat agentId={session.createdAgentId} onResult={(result: TestResult) => result.passed && setAgent((a) => (a ? { ...a, lastTestPassedAt: new Date().toISOString() } : a))} />

              <ActivateSection agent={agent} context={context} t={t} appLanguage={appLanguage} uploadedDocs={uploadedDocs} onLive={(nextAgent) => {
                markOnboardingStep(workspaceId, "live")
                finish(nextAgent)
              }} />
            </div>
          )}

          <ErrorNotice error={error} onRetry={step.kind === "review" ? () => void create() : undefined} />

          <WizardNav>
            {step.kind === "try" ? (
              agent ? (
                <Link href={`/ai-agents/${encodeURIComponent(agent.id)}`} onClick={() => clearDraft(workspaceId, template.key)} className={secondaryButton}>
                  {t("keepPaused")}
                </Link>
              ) : (
                <span />
              )
            ) : (
              <>
                <button type="button" onClick={session.step === 0 ? backToPicker : () => goTo(session.step - 1)} className={secondaryButton}>
                  <ArrowLeft className="size-4" aria-hidden />
                  {session.step === 0 ? t("chooseAnotherModel") : t("back")}
                </button>
                {step.kind === "review" ? (
                  <button type="button" onClick={() => void create()} disabled={creating} aria-busy={creating || undefined} className={primaryButton}>
                    {creating && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                    {creating ? t("creating") : t("createAgent")}
                  </button>
                ) : backToReview ? (
                  <button type="button" onClick={() => next(true)} className={primaryButton}>
                    {t("backToReview")}
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                ) : (
                  <button type="button" onClick={() => next()} className={primaryButton}>
                    {step.kind === "documents" && uploads.state.items.length === 0 ? t("docsSkip") : t("next")}
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                )}
              </>
            )}
          </WizardNav>
        </PremiumCard>
      </div>

      <ConfirmDialog
        open={confirmStartOver}
        onOpenChange={setConfirmStartOver}
        title={t("startOverTitle")}
        description={t("startOverBody")}
        confirmLabel={t("startOverConfirm")}
        cancelLabel={t("cancel")}
        onConfirm={reset}
        tone="danger"
      />
    </PageLayout>
  )
}

/**
 * "Turn answering on": which agent, on which channels (with their state), what is still missing, and the button
 * that opens the confirmation. Nothing changes until the server confirms; the agent never turns on by itself.
 */
function ActivateSection({
  agent,
  context,
  t,
  appLanguage,
  uploadedDocs,
  onLive,
}: {
  agent: AgentView | null
  context: ReturnType<typeof businessContext>
  t: AttendeAgentsT
  appLanguage: string
  uploadedDocs: AgentView["documents"]
  onLive: (agent: AgentView) => void
}) {
  if (!agent) return null
  const name = String(agent.form?.assistantName || agent.name || "")
  return (
    <section aria-labelledby="agent-activate-title" className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-white p-4 sm:p-5">
      <h3 id="agent-activate-title" className="text-body-18 font-semibold text-neutral-900">
        {t("activateTitle")}
      </h3>
      {agent.lines.length > 0 ? (
        <>
          <p className="text-body-14 text-neutral-700">{t("activateWho", { agent: name })}</p>
          <ul className="flex flex-col gap-1 text-body-14 text-neutral-900">
            {agent.lines.map((line) => (
              <li key={`${line.channel}:${line.sessionId}`}>
                {t("channelWithState", {
                  name: line.label || t("lineUnnamed"),
                  channel: t(CHANNEL_KEY[line.channel]),
                  state: line.exists === false ? t("lineRemoved") : line.connected === false ? t("channelStateDisconnected") : t("channelStateConnected"),
                })}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-body-14 text-neutral-700">{t("errorNotReadyNoLines")}</p>
      )}

      {!context.enough && (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-warning-lighter bg-warning-clean p-3.5 text-body-14 text-neutral-900">
          <p>{t("activateBlockedContext")}</p>
          {context.readingDocuments > 0 && <p className="text-body-13">{plural(context.readingDocuments, appLanguage, { one: t("activateReadingOne"), other: t("activateReadingOther") })}</p>}
          <div className="flex flex-wrap gap-2">
            <Link href={`/ai-agents/${encodeURIComponent(agent.id)}?tab=setup`} className={actionClass({ variant: "secondary", size: "sm" })}>
              {t("pendingCompleteDescription")}
            </Link>
            <a href="#agent-created-docs" className={actionClass({ variant: "secondary", size: "sm" })}>
              {t("pendingAddDocuments")}
            </a>
          </div>
        </div>
      )}

      {agent.lines.length > 0 && (
        <div className="flex">
          <AgentPowerControl agent={{ ...agent, documents: [...agent.documents, ...uploadedDocs] }} onChange={onLive} goLiveLabel={t("activateGoLive")} goLiveBlocked={!context.enough} className="min-h-12 px-6" />
        </div>
      )}
    </section>
  )
}

function WizardHeader({ title, headingRef }: { title: string; headingRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <h2 ref={headingRef} tabIndex={-1} className="text-[22px] font-semibold leading-tight tracking-tight text-neutral-900 focus:outline-none">
      {title}
    </h2>
  )
}

/** Sticky at the bottom (above the phone tab bar and the safe area); fields scroll clear of it (scroll-mb on controls). */
function WizardNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-5 flex flex-col-reverse gap-3 border-t border-neutral-50 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:bottom-0">
      {children}
    </div>
  )
}
