"use client"

import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { controlClass, fieldId } from "./classes"

export type RowColumn = { key: string; label: string; placeholder?: string; multiline?: boolean; wide?: boolean; max?: number }

type Props = {
  path: string
  rows: Array<Record<string, string | undefined>>
  columns: RowColumn[]
  onChange: (rows: Array<Record<string, string | undefined>>) => void
  addLabel: string
  removeLabel: string
  /** Accessible name of one row group, e.g. "Item 2". */
  rowLabel: (index: number) => string
  /** Max number of rows. */
  max?: number
  invalid?: boolean
}

const emptyRow = (columns: RowColumn[]) => Object.fromEntries(columns.map((c) => [c.key, ""])) as Record<string, string>

/** Repeating groups of small fields (products, questions and answers, objections). New rows appear empty with focus on the first field. */
export function RowsField({ path, rows, columns, onChange, addLabel, removeLabel, rowLabel, max, invalid }: Props) {
  const set = (index: number, key: string, value: string) => onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index))
  const atLimit = max !== undefined && rows.length >= max

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-neutral-10/60 p-4" role="group" aria-label={rowLabel(index)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((column, ci) => {
              const id = `${fieldId(path)}-${index}-${column.key}`
              const Control = column.multiline ? "textarea" : "input"
              return (
                <div key={column.key} className={cn("flex min-w-0 flex-col gap-1", (column.wide || column.multiline) && "sm:col-span-2")}>
                  <label htmlFor={id} className="text-body-12 font-medium text-neutral-500">
                    {column.label}
                  </label>
                  <Control
                    id={id}
                    {...(column.multiline ? { rows: 3 } : { type: "text" })}
                    value={row[column.key] ?? ""}
                    maxLength={column.max}
                    placeholder={column.placeholder}
                    aria-invalid={invalid && !(row[column.key] ?? "").trim() && ci < 2 ? true : undefined}
                    onChange={(e: { target: { value: string } }) => set(index, column.key, e.target.value)}
                    className={cn(controlClass, column.multiline && "resize-y")}
                  />
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => remove(index)} className="inline-flex min-h-11 w-fit items-center gap-1.5 text-body-13 font-medium text-neutral-600 hover:text-error-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <Trash2 className="size-4" aria-hidden />
            {removeLabel}
            <span className="sr-only">: {rowLabel(index)}</span>
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={atLimit}
        onClick={() => onChange([...rows, emptyRow(columns)])}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-dashed border-primary px-4 text-body-14 font-semibold text-primary-dark transition-colors hover:bg-primary-clean disabled:cursor-not-allowed disabled:border-neutral-border disabled:text-neutral-200"
      >
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </button>
    </div>
  )
}
