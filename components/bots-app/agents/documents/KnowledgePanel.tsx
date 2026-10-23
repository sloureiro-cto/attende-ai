"use client"

import { FileText, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { deleteAgentKnowledgeAction } from "actions/attende/agents"
import { showToast } from "app/utils/showToast"
import { agentErrorMessage } from "lib/attende/agents/errors"
import { formatBytes } from "lib/attende/agents/files"
import type { AgentActionError, KnowledgeDocument } from "lib/attende/agents/types"
import { plural } from "lib/attende/format"
import { DocumentsDropzone } from "./DocumentsDropzone"
import { STATUS_KEY, STATUS_TONE } from "./indexStatus"
import { useKnowledgeDocuments } from "./useKnowledgeDocuments"
import { useUploadQueue } from "./useUploadQueue"
import { actionClass } from "../../ui/actionStyles"
import { ConfirmDialog } from "../ConfirmDialog"
import { ErrorNotice } from "../PlanNotice"
import { useAttendeAgentsT } from "../useAttendeAgentsT"

type Props = {
  agentId: string
  initialDocuments: KnowledgeDocument[]
  /** The first load failed: show the error, not "No documents". */
  initialError?: AgentActionError | null
  /** Every change of the list (upload, reading status, removal), so the page can tell whether the agent knows enough. */
  onDocumentsChange?: (documents: KnowledgeDocument[]) => void
}

/** The agent's documents: list with reading status (refreshes while any is still being read), upload and remove. */
export function KnowledgePanel({ agentId, initialDocuments, initialError = null, onDocumentsChange }: Props) {
  const { t, appLanguage } = useAttendeAgentsT()
  const { documents, setDocuments, error: loadError, refreshing, refresh } = useKnowledgeDocuments(agentId, initialDocuments, initialError)
  const [toRemove, setToRemove] = useState<KnowledgeDocument | null>(null)
  const [removing, setRemoving] = useState(false)
  const alive = useRef(true)
  const onChangeRef = useRef(onDocumentsChange)
  onChangeRef.current = onDocumentsChange

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    onChangeRef.current?.(documents)
  }, [documents])

  const { state, addFiles, remove, retry, clearRejected } = useUploadQueue({ agentId, existingNames: documents.map((d) => d.name), onUploaded: () => void refresh() })

  const confirmRemove = async () => {
    if (!toRemove) return
    setRemoving(true)
    const result = await deleteAgentKnowledgeAction(agentId, toRemove.documentId)
    if (!alive.current) return
    setRemoving(false)
    if (result.success) {
      setDocuments((docs) => docs.filter((d) => d.documentId !== toRemove.documentId))
      setToRemove(null)
    } else {
      const { key, params } = agentErrorMessage(result)
      showToast("error", t(key, params))
      setToRemove(null)
    }
  }

  const uploading = state.items.filter((i) => i.status !== "done")

  return (
    <div className="flex flex-col gap-6">
      <DocumentsDropzone queue={{ ...state, items: uploading }} t={t} appLanguage={appLanguage} onAddFiles={addFiles} onRemove={remove} onRetry={retry} onClearRejected={clearRejected} />

      {loadError && <ErrorNotice error={loadError} onRetry={() => void refresh()} />}

      <section aria-labelledby="agent-docs-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="agent-docs-heading" className="text-body-16 font-semibold text-neutral-900">
            {t("docsTitle")}
          </h2>
          <button type="button" onClick={() => void refresh()} disabled={refreshing} aria-busy={refreshing || undefined} title={t("docsRefresh")} className={actionClass({ variant: "ghost", size: "sm" })}>
            <RefreshCw className={cn("size-4", refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden />
            <span className="sr-only">{t("docsRefresh")}</span>
          </button>
        </div>
        {documents.length === 0 && loadError ? null : documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-border p-6 text-center text-body-14 text-neutral-400">{t("docsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={t("docsListAria")}>
            {documents.map((doc) => (
              <li key={doc.documentId} className="flex items-center gap-3 rounded-2xl border border-neutral-border bg-white p-3.5">
                <FileText className="size-5 shrink-0 text-neutral-300" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-14 font-medium text-neutral-900">{doc.name}</span>
                  <span className="text-body-12 text-neutral-600">
                    {formatBytes(doc.sizeBytes, appLanguage)}
                    {doc.pageCount ? ` · ${plural(doc.pageCount, appLanguage, { one: t("docsPagesOne"), other: t("docsPagesOther") })}` : ""}
                  </span>
                  {doc.indexStatus === "failed" && <span className="text-body-12 font-medium text-error-dark">{t("docsFailedHint")}</span>}
                  {doc.indexStatus === "skipped" && <span className="text-body-12 text-neutral-600">{t("docsSkippedHint")}</span>}
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-body-12 font-semibold", STATUS_TONE[doc.indexStatus])}>{t(STATUS_KEY[doc.indexStatus])}</span>
                <button type="button" onClick={() => setToRemove(doc)} aria-label={t("docsRemove", { name: doc.name })} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-error-clean hover:text-error-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={t("docsDeleteTitle")}
        description={t("docsDeleteBody", { name: toRemove?.name ?? "" })}
        confirmLabel={t("docsDeleteConfirm")}
        cancelLabel={t("cancel")}
        onConfirm={() => void confirmRemove()}
        busy={removing}
        tone="danger"
      />
    </div>
  )
}
