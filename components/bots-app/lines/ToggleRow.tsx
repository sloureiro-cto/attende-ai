"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  className?: string
}

/** A labelled on/off setting: the whole row is the switch, so it is easy to hit on a phone. */
export function ToggleRow({ title, description, checked, onCheckedChange, disabled = false, className }: Props) {
  const id = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border border-neutral-50 bg-white px-4 py-3.5 text-left transition-colors",
        "hover:border-neutral-100 hover:bg-neutral-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={`${id}-title`} className="text-body-14 font-semibold text-neutral-900">
          {title}
        </span>
        <span id={`${id}-desc`} className="text-body-13 text-neutral-500">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors",
          checked ? "border-primary-dark bg-primary-dark" : "border-neutral-100 bg-neutral-50"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-4 -translate-y-1/2 rounded-full shadow-sm transition-[left] motion-reduce:transition-none",
            checked ? "left-[19px] bg-white" : "left-[3px] bg-neutral-400"
          )}
        />
      </span>
    </button>
  )
}
