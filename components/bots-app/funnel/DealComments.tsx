"use client"

import { Trash } from "iconsax-react"
import { type FormEvent, useEffect, useState } from "react"
import { addFunnelCommentAction, deleteFunnelCommentAction, loadFunnelCommentsAction } from "actions/attende/funnel"
import { type DealComment, type DealRef, LIMITS } from "lib/attende/funnel/deal"
import { formatRelativeTime } from "lib/attende/funnel/model"
import { Avatar } from "./atoms"
import { IconAction, Section, TextArea } from "./fields"
import type { AttendeFunnelT } from "./useAttendeFunnelT"
import { actionClass } from "../ui/actionStyles"

type Props = { dealRef: DealRef; t: AttendeFunnelT; language: string; now: Date }

function CommentItem({ comment, t, language, now, onDelete }: { comment: DealComment; t: AttendeFunnelT; language: string; now: Date; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const name = comment.mine ? t("commentYou") : comment.authorName || t("unnamed")
  return (
    <li className="flex gap-3" data-testid="deal-comment">
      <Avatar name={comment.authorName || name} url={comment.authorAvatar} size={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-h-8 items-center gap-2">
          <span className="truncate text-body-13 font-semibold text-neutral-900">{name}</span>
          <span className="shrink-0 text-body-12 text-neutral-500">{formatRelativeTime(comment.createdAt, now, language)}</span>
          {comment.mine && !confirming && (
            <IconAction label={t("commentDelete")} onClick={() => setConfirming(true)} danger className="ml-auto">
              <Trash size={15} aria-hidden />
            </IconAction>
          )}
        </div>
        <p className="whitespace-pre-wrap break-words text-body-13 text-neutral-700">{comment.text}</p>
        {confirming && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-error-clean px-3 py-2" role="group" aria-label={t("commentDeleteConfirm")}>
            <span className="text-body-12 font-medium text-error-darkest">{t("commentDeleteConfirm")}</span>
            <span className="ml-auto flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="h-7 rounded-md px-2.5 text-body-12 font-semibold text-neutral-700 hover:bg-white">
                {t("cancel")}
              </button>
              <button type="button" onClick={onDelete} className="h-7 rounded-md bg-error-dark px-2.5 text-body-12 font-semibold text-white hover:bg-error-darkest">
                {t("commentDeleteYes")}
              </button>
            </span>
          </div>
        )}
      </div>
    </li>
  )
}

/** The deal's comments (the CRM card comments): newest first, add one, delete your own. */
export function DealComments({ dealRef, t, language, now }: Props) {
  const [items, setItems] = useState<DealComment[] | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const { projectId, boardId, cardId } = dealRef

  useEffect(() => {
    let alive = true
    setItems(null)
    setPage(1)
    setLoadError(false)
    setError(null)
    void loadFunnelCommentsAction({ projectId, boardId, cardId }, 1).then((res) => {
      if (!alive) return
      if (res.success) {
        setItems(res.data.items)
        setHasMore(res.data.hasMore)
      } else setLoadError(true)
    })
    return () => {
      alive = false
    }
  }, [projectId, boardId, cardId])

  const ref = { projectId, boardId, cardId }

  const loadOlder = async () => {
    setLoadingMore(true)
    const res = await loadFunnelCommentsAction(ref, page + 1)
    setLoadingMore(false)
    if (!res.success) {
      setError(t("commentsLoadFailed"))
      return
    }
    setPage((p) => p + 1)
    setHasMore(res.data.hasMore)
    setItems((list) => {
      const seen = new Set((list ?? []).map((c) => c.id))
      return [...(list ?? []), ...res.data.items.filter((c) => !seen.has(c.id))]
    })
  }

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    const res = await addFunnelCommentAction(ref, text)
    setSending(false)
    if (!res.success) {
      setError(t("commentSaveFailed"))
      return
    }
    setItems((list) => [res.data, ...(list ?? [])])
    setDraft("")
  }

  const remove = async (id: string) => {
    const index = items?.findIndex((c) => c.id === id) ?? -1
    const before = index >= 0 ? items?.[index] : undefined
    if (!before) return
    setError(null)
    setItems((list) => list?.filter((c) => c.id !== id) ?? list)
    const res = await deleteFunnelCommentAction(ref, id)
    if (!res.success) {
      setItems((list) => {
        if (!list) return list
        const next = [...list]
        next.splice(Math.min(index, next.length), 0, before)
        return next
      })
      setError(t("commentDeleteFailed"))
    }
  }

  return (
    <Section id="deal-comments" title={t("commentsTitle")}>
      <form onSubmit={send} className="flex flex-col gap-2">
        <TextArea
          aria-label={t("commentAria")}
          placeholder={t("commentPlaceholder")}
          value={draft}
          rows={2}
          maxLength={LIMITS.comment}
          disabled={sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send()
          }}
        />
        {draft.trim() !== "" && (
          <div className="flex justify-end">
            <button type="submit" className={actionClass({ size: "sm" })} disabled={sending}>
              {sending ? t("saving") : t("commentSend")}
            </button>
          </div>
        )}
      </form>
      {error && (
        <p role="alert" className="text-body-12 text-error-dark">
          {error}
        </p>
      )}
      {loadError ? (
        <p className="text-body-13 text-neutral-500">{t("commentsLoadFailed")}</p>
      ) : items === null ? (
        <p className="text-body-13 text-neutral-500" aria-live="polite">
          {t("loading")}
        </p>
      ) : items.length === 0 ? (
        <p className="text-body-13 text-neutral-500">{t("commentsEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4" aria-labelledby="deal-comments">
          {items.map((c) => (
            <CommentItem key={c.id} comment={c} t={t} language={language} now={now} onDelete={() => void remove(c.id)} />
          ))}
        </ul>
      )}
      {hasMore && items && items.length > 0 && (
        <button type="button" onClick={() => void loadOlder()} disabled={loadingMore} className={actionClass({ variant: "ghost", size: "sm", className: "self-start" })}>
          {loadingMore ? t("loadingMore") : t("commentsOlder")}
        </button>
      )}
    </Section>
  )
}
