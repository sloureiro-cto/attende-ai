"use client"

import { ArrowDown, ArrowUp, Pencil, X } from "lucide-react"
import { type KeyboardEvent, useState } from "react"
import { cn } from "@/lib/utils"
import { chipClass, controlClass, fieldId } from "./classes"

type Props = {
  path: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Max characters per item. */
  itemMax?: number
  /** Max number of items. */
  max?: number
  invalid?: boolean
  addLabel: string
  removeLabel: (item: string) => string
  /** Ready-made options shown as chips; tapping one adds/removes it. */
  suggestions?: string[]
  suggestionsLabel?: string
  /** Long free-text items (qualification questions) get a wider chip layout. */
  wide?: boolean
  /** Items can be reordered and edited in place (labels for the per-item buttons). */
  orderable?: { up: (item: string) => string; down: (item: string) => string; edit: (item: string) => string; save: string }
}

const normalize = (value: string) => value.trim().replace(/\s+/g, " ")

/** A list of short texts as chips: type and press Enter (or the button) to add, tap the × to remove. */
export function ChipListField({ path, value, onChange, placeholder, itemMax, max, invalid, addLabel, removeLabel, suggestions = [], suggestionsLabel, wide, orderable }: Props) {
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  const items = value
  const atLimit = max !== undefined && items.length >= max
  const has = (text: string) => items.some((i) => i.toLowerCase() === text.toLowerCase())

  const add = (raw: string) => {
    const text = normalize(raw)
    if (!text || has(text) || atLimit) return
    onChange([...items, itemMax ? text.slice(0, itemMax) : text])
    setDraft("")
  }
  const remove = (item: string) => onChange(items.filter((i) => i !== item))
  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange(next)
  }
  const saveEdit = () => {
    if (!editing) return
    const text = normalize(editing.text)
    if (text && !items.some((i, n) => n !== editing.index && i.toLowerCase() === text.toLowerCase())) onChange(items.map((i, n) => (n === editing.index ? (itemMax ? text.slice(0, itemMax) : text) : i)))
    setEditing(null)
  }
  const iconButton = "flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
  const toggleSuggestion = (text: string) => (has(text) ? onChange(items.filter((i) => i.toLowerCase() !== text.toLowerCase())) : add(text))

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      add(draft)
    } else if (event.key === "Backspace" && draft === "" && items.length > 0) {
      onChange(items.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {suggestionsLabel && <span className="text-body-12 font-medium text-neutral-500">{suggestionsLabel}</span>}
          <div className="flex flex-wrap gap-2" role="group" aria-label={suggestionsLabel}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={has(s)}
                onClick={() => toggleSuggestion(s)}
                className={cn(chipClass, has(s) ? "border-primary bg-primary-clean font-medium text-primary-darkest" : "border-neutral-100 bg-white text-neutral-700 hover:border-primary-lighter")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {items.length > 0 && (
        <ul className={cn("flex gap-2", wide ? "flex-col" : "flex-wrap")}>
          {items.map((item, index) =>
            orderable ? (
              <li key={item} className="flex items-center gap-1 rounded-xl border border-neutral-100 bg-neutral-10 py-1 pl-3 pr-1 text-body-14 text-neutral-800">
                {editing?.index === index ? (
                  <>
                    <input
                      autoFocus
                      aria-label={orderable.edit(item)}
                      value={editing.text}
                      maxLength={itemMax}
                      onChange={(e) => setEditing({ index, text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          saveEdit()
                        } else if (e.key === "Escape") setEditing(null)
                      }}
                      className={cn(controlClass, "py-2")}
                    />
                    <button type="button" onClick={saveEdit} className="shrink-0 rounded-lg px-3 py-2 text-body-13 font-semibold text-primary-dark hover:bg-primary-clean">
                      {orderable.save}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 break-words">{item}</span>
                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={orderable.up(item)} className={iconButton}>
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                    <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={orderable.down(item)} className={iconButton}>
                      <ArrowDown className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => setEditing({ index, text: item })} aria-label={orderable.edit(item)} className={iconButton}>
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => remove(item)} aria-label={removeLabel(item)} className={iconButton}>
                      <X className="size-4" aria-hidden />
                    </button>
                  </>
                )}
              </li>
            ) : (
              <li key={item} className={cn(chipClass, "border-neutral-100 bg-neutral-10 text-neutral-800", wide && "justify-between rounded-xl")}>
                <span className="min-w-0 break-words">{item}</span>
                <button type="button" onClick={() => remove(item)} aria-label={removeLabel(item)} className="flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            )
          )}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={fieldId(path)}
          type="text"
          value={draft}
          maxLength={itemMax}
          disabled={atLimit}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${fieldId(path)}-error` : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          className={controlClass}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!normalize(draft) || atLimit}
          className="shrink-0 rounded-xl border border-primary bg-white px-4 text-body-14 font-semibold text-primary-dark transition-colors hover:bg-primary-clean disabled:cursor-not-allowed disabled:border-neutral-100 disabled:text-neutral-400"
        >
          {addLabel}
        </button>
      </div>
    </div>
  )
}
