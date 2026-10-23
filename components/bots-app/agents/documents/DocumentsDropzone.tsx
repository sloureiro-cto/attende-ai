"use client"

import { AlertCircle, CheckCircle2, FileText, Loader2, RotateCw, UploadCloud, X } from "lucide-react"
import { type DragEvent, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { agentErrorMessage, isPlanError } from "lib/attende/agents/errors"
import { ALLOWED_EXTENSIONS, formatBytes, maxUploadBytes } from "lib/attende/agents/files"
import type { IndexStatus } from "lib/attende/agents/types"
import type { QueueState } from "lib/attende/agents/uploadQueue"
import { formatPercent } from "lib/attende/format"
import { STATUS_KEY, STATUS_TONE } from "./indexStatus"
import { ErrorNotice } from "../PlanNotice"
import type { AttendeAgentsT } from "../useAttendeAgentsT"

type Props = {
  queue: QueueState
  t: AttendeAgentsT
  /** App language name, for numbers (sizes, percents). */
  appLanguage?: string
  onAddFiles: (files: FileList | File[]) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onClearRejected: () => void
  /** Files are not sent yet (creation wizard): show the "sent when you create" note. */
  waitingForAgent?: boolean
  disabled?: boolean
  /**
   * Reading status of a sent file, from the agent's document list. A sent file is never shown as ready until the
   * server says it was read: without a known status it shows "Waiting".
   */
  statusOf?: (documentId: string) => IndexStatus | undefined
}

const ISSUE_KEY = { size: "fileErrorSize", type: "fileErrorType", empty: "fileErrorEmpty", duplicate: "fileErrorDuplicate" } as const

/** Drag-and-drop (or click) area plus the list of files with their own progress, retry and remove. */
export function DocumentsDropzone({ queue, t, appLanguage = "english", onAddFiles, onRemove, onRetry, onClearRejected, waitingForAgent = false, disabled = false, statusOf }: Props) {
  const inputId = useId()
  const input = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const errorText = (error: Parameters<typeof agentErrorMessage>[0]) => {
    const { key, params } = agentErrorMessage(error)
    return t(key, params)
  }
  const maxMb = Math.round(maxUploadBytes() / (1024 * 1024))
  // A plan limit is explained once, with the way out (plans page), instead of only on each file.
  const planError = queue.items.find((i) => i.status === "failed" && i.error && isPlanError(i.error))?.error ?? null

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragging(false)
    if (!disabled && event.dataTransfer.files.length > 0) onAddFiles(event.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-white px-6 py-8 text-center transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          dragging ? "border-primary bg-primary-clean/60" : "border-neutral-100 hover:border-primary-lighter",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <UploadCloud className="size-8 text-primary-dark" aria-hidden />
        <span className="text-body-16 font-semibold text-neutral-900">{t("docsDrop")}</span>
        <span className="text-body-14 text-primary-dark underline underline-offset-2">{t("docsChoose")}</span>
        <span className="text-body-12 text-neutral-600">{t("docsFormats", { max: maxMb })}</span>
        <input
          ref={input}
          id={inputId}
          type="file"
          multiple
          disabled={disabled}
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onAddFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </label>

      {queue.rejected.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-warning-lighter bg-warning-clean p-3.5">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning-darkest" aria-hidden />
          <ul className="flex flex-1 flex-col gap-1 text-body-13 text-neutral-900">
            {queue.rejected.map((r, i) => (
              <li key={i}>{t(ISSUE_KEY[r.issue], { name: r.name, max: maxMb })}</li>
            ))}
          </ul>
          <button type="button" onClick={onClearRejected} aria-label={t("close")} className="shrink-0 text-neutral-500 hover:text-neutral-900">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {queue.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2" aria-label={t("docsListAria")}>
            {queue.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-neutral-border bg-white p-3.5">
                <FileText className="size-5 shrink-0 text-neutral-300" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-body-14 font-medium text-neutral-900">{item.name}</span>
                  <span className="text-body-12 text-neutral-600">{formatBytes(item.size, appLanguage)}</span>
                  {item.status === "uploading" && (
                    <div className="flex flex-col gap-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-50" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percent} aria-label={item.name}>
                        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${item.percent}%` }} />
                      </div>
                      <span className="text-body-12 text-neutral-500">{t("docsUploading", { percent: formatPercent(item.percent / 100, appLanguage) })}</span>
                    </div>
                  )}
                  {item.status === "failed" && item.error && <span className="text-body-12 font-medium text-error-dark">{errorText(item.error)}</span>}
                </div>
                {item.status === "done" && item.document ? (
                  <IndexBadge status={statusOf?.(item.document.documentId) ?? item.document.indexStatus ?? "pending"} t={t} />
                ) : (
                  <StatusIcon status={item.status} t={t} waiting={waitingForAgent} />
                )}
                {item.status === "failed" && (
                  <button type="button" onClick={() => onRetry(item.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-body-13 font-semibold text-primary-dark hover:bg-primary-clean">
                    <RotateCw className="size-4" aria-hidden />
                    {t("docsRetry")}
                  </button>
                )}
                {item.status !== "uploading" && (
                  <button type="button" onClick={() => onRemove(item.id)} aria-label={t("docsRemove", { name: item.name })} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-10 hover:text-neutral-900">
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {waitingForAgent && <p className="text-body-13 text-neutral-500">{t("docsQueuedNote")}</p>}
          <ErrorNotice error={planError} />
        </>
      )}
    </div>
  )
}

function IndexBadge({ status, t }: { status: IndexStatus; t: AttendeAgentsT }) {
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-body-12 font-semibold", STATUS_TONE[status])}>{t(STATUS_KEY[status])}</span>
}

function StatusIcon({ status, t, waiting }: { status: QueueState["items"][number]["status"]; t: AttendeAgentsT; waiting: boolean }) {
  if (status === "uploading") return <Loader2 className="size-5 shrink-0 animate-spin text-primary-dark motion-reduce:animate-none" aria-label={t("loading")} />
  if (status === "done") return <CheckCircle2 className="size-5 shrink-0 text-success-dark" aria-label={t("docsUploaded")} />
  if (status === "failed") return <AlertCircle className="size-5 shrink-0 text-error-dark" aria-label={t("docsFailed")} />
  return <span className="shrink-0 text-body-12 font-medium text-neutral-400">{waiting ? t("docsQueued") : t("docsStatusPending")}</span>
}
