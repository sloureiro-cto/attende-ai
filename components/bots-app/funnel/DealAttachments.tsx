"use client"

import { Add, DocumentDownload, DocumentText, ExportSquare, Trash } from "iconsax-react"
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { deleteFunnelAttachmentAction, linkFunnelAttachmentAction, loadFunnelAttachmentsAction, loadFunnelUploadFolderAction } from "actions/attende/funnel"
import { formatDateTime, formatNumber } from "lib/attende/format"
import { ATTACHMENT_ACCEPT, attachmentFileHref, attachmentRejection, attachmentTypeKey, type DealAttachment } from "lib/attende/funnel/attachments"
import { uploadDocumentDirect } from "lib/uploadDocumentDirect"
import { IconAction, Section } from "./fields"
import type { AttendeFunnelT } from "./useAttendeFunnelT"
import { actionClass } from "../ui/actionStyles"

type Props = { cardId: string; projectId: string; t: AttendeFunnelT; language: string }

/** "1.2 MB" / "350 kB" in the user's locale; `null` (not shown) when the size is unknown. */
export function formatFileSize(bytes: number | null, language: string): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null
  const [value, unit] = bytes >= 1024 * 1024 ? [bytes / (1024 * 1024), "megabyte"] : bytes >= 1024 ? [bytes / 1024, "kilobyte"] : [bytes, "byte"]
  return formatNumber(value, language, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: value < 10 && unit !== "byte" ? 1 : 0 })
}

function AttachmentItem({ item, t, language, onDelete, onDownload }: { item: DealAttachment; t: AttendeFunnelT; language: string; onDelete: () => void; onDownload: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const name = item.name || t("attachmentUnnamed")
  const size = formatFileSize(item.size, language)
  const meta = [t(attachmentTypeKey(item)), size, item.createdAt ? formatDateTime(item.createdAt, language) : null].filter(Boolean).join(" · ")
  const canOpen = item.kind === "file" && !!item.documentId
  return (
    <li className="flex flex-col gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-10" data-testid="deal-attachment">
      <div className="flex min-h-9 items-center gap-2.5">
        <DocumentText size={18} aria-hidden className="shrink-0 text-neutral-500" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-13 font-medium text-neutral-900" title={name}>
            {name}
          </span>
          <span className="truncate text-body-12 text-neutral-500">{meta}</span>
        </div>
        {canOpen && item.documentId && (
          <a
            href={attachmentFileHref(item.documentId)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("attachmentOpen", { name })}
            title={t("attachmentOpen", { name })}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-10 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ExportSquare size={15} aria-hidden />
          </a>
        )}
        {canOpen && (
          <IconAction label={t("attachmentDownload", { name })} onClick={onDownload}>
            <DocumentDownload size={15} aria-hidden />
          </IconAction>
        )}
        {!confirming && !item.id.startsWith("pending-") && (
          <IconAction label={t("attachmentRemove", { name })} onClick={() => setConfirming(true)} danger>
            <Trash size={15} aria-hidden />
          </IconAction>
        )}
      </div>
      {confirming && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-error-clean px-3 py-2" role="group" aria-label={t("attachmentRemoveConfirm")}>
          <span className="text-body-12 font-medium text-error-darkest">{t("attachmentRemoveConfirm")}</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="h-7 rounded-md px-2.5 text-body-12 font-semibold text-neutral-700 hover:bg-white">
              {t("cancel")}
            </button>
            <button type="button" onClick={onDelete} className="h-7 rounded-md bg-error-dark px-2.5 text-body-12 font-semibold text-white hover:bg-error-darkest">
              {t("attachmentRemoveYes")}
            </button>
          </span>
        </div>
      )}
    </li>
  )
}

type Status = { kind: "ok" | "error"; text: string } | null

/**
 * The deal's attachments (the CRM card's attachments, including files the lead sent or received on WhatsApp):
 * list, open, download, add and remove. An upload goes to the funnel project's library folder and is then linked to
 * the deal, the same flow as the CRM.
 */
export function DealAttachments({ cardId, projectId, t, language }: Props) {
  const [items, setItems] = useState<DealAttachment[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const n = ++loadSeq.current
    setItems(null)
    setLoadError(false)
    const res = await loadFunnelAttachmentsAction(cardId)
    if (n !== loadSeq.current) return
    if (res.success) setItems(res.data)
    else setLoadError(true)
  }, [cardId])

  useEffect(() => {
    setStatus(null)
    void load()
    return () => {
      loadSeq.current++
    }
  }, [load])

  const upload = async (files: File[]) => {
    if (files.length === 0 || uploading) return
    setStatus(null)
    const refused: string[] = []
    const accepted: File[] = []
    for (const f of files) {
      const why = attachmentRejection(f)
      if (!why) accepted.push(f)
      else refused.push(why === "size" ? t("attachmentTooLarge", { name: f.name }) : why === "empty" ? t("attachmentEmpty", { name: f.name }) : t("attachmentTypeRefused", { name: f.name }))
    }
    if (accepted.length === 0) {
      setStatus({ kind: "error", text: refused.join(" ") })
      return
    }
    setUploading({ done: 0, total: accepted.length })
    const folder = await loadFunnelUploadFolderAction(projectId)
    const parentId = folder.success ? folder.data.folderId : null
    const failedNames: string[] = []
    let added = 0
    for (const [i, file] of accepted.entries()) {
      try {
        const doc = await uploadDocumentDirect(file, { parentId: parentId ?? undefined, accessScope: "workspace", status: "published" })
        const documentId = String(doc._id)
        const linked = await linkFunnelAttachmentAction(cardId, documentId)
        if (!linked.success) throw new Error("link")
        added++
        // Show it at once; the reload below brings the server's own entry.
        const optimistic: DealAttachment = linked.data ?? {
          id: `pending-${documentId}`,
          documentId,
          name: file.name,
          contentType: file.type || null,
          size: file.size,
          createdAt: new Date().toISOString(),
          kind: "file",
        }
        setItems((list) => [{ ...optimistic, name: optimistic.name || file.name }, ...(list ?? []).filter((a) => a.id !== optimistic.id)])
      } catch {
        failedNames.push(file.name)
      }
      setUploading({ done: i + 1, total: accepted.length })
    }
    setUploading(null)
    const problems = [...refused, ...failedNames.map((name) => t("attachmentUploadFailed", { name }))]
    if (problems.length > 0) setStatus({ kind: "error", text: problems.join(" ") })
    else setStatus({ kind: "ok", text: added === 1 ? t("attachmentAddedOne") : t("attachmentAddedOther", { count: formatNumber(added, language) }) })
    if (added > 0) {
      const res = await loadFunnelAttachmentsAction(cardId)
      if (res.success) setItems(res.data)
    }
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    void upload(files)
  }

  const remove = async (id: string) => {
    const index = items?.findIndex((a) => a.id === id) ?? -1
    const before = index >= 0 ? items?.[index] : undefined
    if (!before) return
    setStatus(null)
    setItems((list) => list?.filter((a) => a.id !== id) ?? list)
    const res = await deleteFunnelAttachmentAction(cardId, id)
    if (!res.success) {
      setItems((list) => {
        if (!list) return list
        const next = [...list]
        next.splice(Math.min(index, next.length), 0, before)
        return next
      })
      setStatus({ kind: "error", text: res.status === 403 ? t("attachmentRemoveForbidden") : t("attachmentRemoveFailed") })
      return
    }
    setStatus({ kind: "ok", text: t("attachmentRemoved") })
  }

  const download = async (item: DealAttachment) => {
    if (!item.documentId) return
    const href = attachmentFileHref(item.documentId, true)
    setStatus(null)
    try {
      const res = await fetch(href, { credentials: "same-origin" })
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = item.name || "file"
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setStatus({ kind: "error", text: t("attachmentDownloadFailed", { name: item.name || t("attachmentUnnamed") }) })
    }
  }

  const busy = uploading !== null

  return (
    <Section
      id="deal-attachments"
      title={t("attachmentsTitle")}
      aside={
        <>
          <input ref={inputRef} type="file" multiple accept={ATTACHMENT_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={onPick} data-testid="attachment-input" />
          <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} disabled={busy} onClick={() => inputRef.current?.click()}>
            <Add size={15} aria-hidden />
            {t("attachmentAdd")}
          </button>
        </>
      }
    >
      <p className="text-body-12 text-neutral-500">{t("attachmentsHint")}</p>
      {uploading && (
        <p role="status" aria-live="polite" className="text-body-12 text-neutral-700">
          {uploading.total === 1 ? t("attachmentUploadingOne") : t("attachmentUploadingMany", { done: formatNumber(uploading.done, language), total: formatNumber(uploading.total, language) })}
        </p>
      )}
      {status && (
        <p role={status.kind === "error" ? "alert" : "status"} className={cn("text-body-12", status.kind === "error" ? "text-error-dark" : "text-neutral-500")}>
          {status.text}
        </p>
      )}
      {loadError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body-13 text-neutral-500">{t("attachmentsLoadFailed")}</p>
          <button type="button" className={actionClass({ variant: "ghost", size: "sm" })} onClick={() => void load()}>
            {t("retry")}
          </button>
        </div>
      ) : items === null ? (
        <p className="text-body-13 text-neutral-500" aria-live="polite">
          {t("loading")}
        </p>
      ) : items.length === 0 ? (
        <p className="text-body-13 text-neutral-500">{t("attachmentsEmpty")}</p>
      ) : (
        <ul className="-mx-2 flex flex-col gap-0.5" aria-labelledby="deal-attachments">
          {items.map((a) => (
            <AttachmentItem key={a.id} item={a} t={t} language={language} onDelete={() => void remove(a.id)} onDownload={() => void download(a)} />
          ))}
        </ul>
      )}
    </Section>
  )
}
