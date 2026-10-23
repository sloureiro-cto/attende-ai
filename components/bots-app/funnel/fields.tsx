"use client"

import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/** Inputs of the funnel drawer, on theme tokens only (surface, border, ink) so they read the same in both themes. */
export const INPUT_CLASS =
  "block w-full rounded-lg border border-neutral-50 bg-white px-3 text-body-13 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-error-dark"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(INPUT_CLASS, "h-9", className)} {...props} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(INPUT_CLASS, "min-h-[72px] resize-y py-2", className)} {...props} />
})

/** A labelled field with an optional error message tied to the input (`aria-describedby`). */
export function FormField({ id, label, error, children }: { id: string; label: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-12 font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-body-12 text-error-dark">
          {error}
        </p>
      )}
    </div>
  )
}

/** Small square icon button (edit, delete, close). Always has an accessible name. */
export function IconAction({ label, onClick, children, danger, disabled, className }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-10 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50",
        danger && "hover:bg-error-clean hover:text-error-dark",
        className
      )}
    >
      {children}
    </button>
  )
}

/** A drawer section: a quiet heading, optional trailing info, then content. */
export function Section({ id, title, aside, children, className }: { id: string; title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 id={id} className="text-body-13 font-semibold text-neutral-900">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
