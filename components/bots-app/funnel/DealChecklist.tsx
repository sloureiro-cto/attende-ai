"use client"

import { Edit2, Trash } from "iconsax-react"
import { type FormEvent, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { addFunnelChecklistItemAction, deleteFunnelChecklistItemAction, loadFunnelChecklistAction, updateFunnelChecklistItemAction } from "actions/attende/funnel"
import { type ChecklistItem, type DealRef, LIMITS } from "lib/attende/funnel/deal"
import { IconAction, Input, Section } from "./fields"
import type { AttendeFunnelT } from "./useAttendeFunnelT"

type Props = { dealRef: DealRef; t: AttendeFunnelT }

function ItemRow({ item, t, onToggle, onRename, onDelete }: { item: ChecklistItem; t: AttendeFunnelT; onToggle: () => void; onRename: (title: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = title.replace(/\s+/g, " ").trim()
    if (next && next !== item.title) onRename(next)
    else setTitle(item.title)
  }

  return (
    <li className="group flex min-h-10 items-center gap-2.5 rounded-lg px-2 hover:bg-neutral-10" data-testid="checklist-item">
      <input
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer accent-primary"
        checked={item.done}
        onChange={onToggle}
        aria-label={item.title || t("checklistUntitled")}
        id={`funnel-check-${item.id}`}
      />
      {editing ? (
        <Input
          ref={inputRef}
          data-escape-local
          aria-label={t("checklistRename", { title: item.title })}
          value={title}
          maxLength={LIMITS.checklistTitle}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              e.stopPropagation()
              setTitle(item.title)
              setEditing(false)
            }
          }}
          className="h-8"
        />
      ) : (
        <label htmlFor={`funnel-check-${item.id}`} className={cn("min-w-0 flex-1 cursor-pointer break-words py-2 text-body-13", item.done ? "text-neutral-500 line-through" : "text-neutral-900")}>
          {item.title || t("checklistUntitled")}
        </label>
      )}
      {!editing && (
        <span className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:transition-opacity sm:focus-within:opacity-100 sm:group-hover:opacity-100">
          <IconAction label={t("checklistRename", { title: item.title })} onClick={() => setEditing(true)}>
            <Edit2 size={15} aria-hidden />
          </IconAction>
          <IconAction label={t("checklistDelete", { title: item.title })} onClick={onDelete} danger>
            <Trash size={15} aria-hidden />
          </IconAction>
        </span>
      )}
    </li>
  )
}

/** The deal's checklist (child cards, like the CRM): add, check, rename, delete. Changes show at once and roll back on failure. */
export function DealChecklist({ dealRef, t }: Props) {
  const [items, setItems] = useState<ChecklistItem[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [adding, setAdding] = useState(false)
  const { projectId, boardId, cardId } = dealRef

  useEffect(() => {
    let alive = true
    setItems(null)
    setLoadError(false)
    setError(null)
    void loadFunnelChecklistAction({ projectId, boardId, cardId }).then((res) => {
      if (!alive) return
      if (res.success) setItems(res.data)
      else setLoadError(true)
    })
    return () => {
      alive = false
    }
  }, [projectId, boardId, cardId])

  const ref = { projectId, boardId, cardId }
  const fail = () => setError(t("checklistSaveFailed"))

  const change = async (id: string, patch: Partial<ChecklistItem>) => {
    const before = items?.find((i) => i.id === id)
    if (!before) return
    setError(null)
    setItems((list) => list?.map((i) => (i.id === id ? { ...i, ...patch } : i)) ?? list)
    const res = await updateFunnelChecklistItemAction(ref, id, { title: patch.title, done: patch.done })
    if (!res.success) {
      setItems((list) => list?.map((i) => (i.id === id ? before : i)) ?? list)
      fail()
    }
  }

  const remove = async (id: string) => {
    const index = items?.findIndex((i) => i.id === id) ?? -1
    const before = index >= 0 ? items?.[index] : undefined
    if (!before) return
    setError(null)
    setItems((list) => list?.filter((i) => i.id !== id) ?? list)
    const res = await deleteFunnelChecklistItemAction(ref, id)
    if (!res.success) {
      setItems((list) => {
        if (!list) return list
        const next = [...list]
        next.splice(Math.min(index, next.length), 0, before)
        return next
      })
      setError(t("checklistDeleteFailed"))
    }
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const title = draft.replace(/\s+/g, " ").trim()
    if (!title || adding || !items) return
    setAdding(true)
    setError(null)
    const res = await addFunnelChecklistItemAction(ref, title, items.length * 10)
    setAdding(false)
    if (!res.success) {
      fail()
      return
    }
    setItems((list) => [...(list ?? []), res.data])
    setDraft("")
  }

  const done = items?.filter((i) => i.done).length ?? 0
  const total = items?.length ?? 0

  return (
    <Section
      id="deal-checklist"
      title={t("checklistTitle")}
      aside={total > 0 ? <span className="text-body-12 tabular-nums text-neutral-500">{t("checklistProgress", { done, total })}</span> : null}
    >
      {total > 0 && (
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-neutral-50">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </div>
      )}
      {loadError ? (
        <p className="text-body-13 text-neutral-500">{t("checklistLoadFailed")}</p>
      ) : items === null ? (
        <p className="text-body-13 text-neutral-500" aria-live="polite">
          {t("loading")}
        </p>
      ) : (
        <>
          {items.length > 0 && (
            <ul className="-mx-2 flex flex-col" aria-labelledby="deal-checklist">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  t={t}
                  onToggle={() => void change(item.id, { done: !item.done })}
                  onRename={(title) => void change(item.id, { title })}
                  onDelete={() => void remove(item.id)}
                />
              ))}
            </ul>
          )}
          <form onSubmit={add} className="flex items-center gap-2">
            <Input
              aria-label={t("checklistAddAria")}
              placeholder={t("checklistAdd")}
              value={draft}
              maxLength={LIMITS.checklistTitle}
              disabled={adding}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="submit"
              disabled={adding || draft.trim() === ""}
              className="h-9 shrink-0 rounded-lg border border-neutral-50 bg-white px-3 text-body-13 font-semibold text-neutral-900 transition-colors hover:bg-neutral-10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("checklistAddButton")}
            </button>
          </form>
        </>
      )}
      {error && (
        <p role="alert" className="text-body-12 text-error-dark">
          {error}
        </p>
      )}
    </Section>
  )
}
