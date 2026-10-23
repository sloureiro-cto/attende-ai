"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { actionClass } from "components/bots-app/ui/actionStyles"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "components/ui/alert-dialog"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  busy?: boolean
  tone?: "primary" | "danger"
  /** Extra content between the text and the buttons (warnings). */
  children?: ReactNode
}

/** Confirmation with the app's own button styles (the shared AlertDialog buttons rely on tokens this theme does not define). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, busy = false, tone = "primary", children }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-3xl border-neutral-border bg-white p-5 sm:p-7">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-body-18 text-neutral-900">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-body-14 text-neutral-500">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel asChild>
            <button type="button" disabled={busy} className={actionClass({ variant: "secondary", size: "lg" })}>
              {cancelLabel}
            </button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                onConfirm()
              }}
              aria-busy={busy || undefined}
              className={actionClass({
                variant: "primary",
                size: "lg",
                className: cn(tone === "danger" && "border-error-dark bg-error-dark hover:border-error-darkest hover:bg-error-darkest"),
              })}
            >
              {confirmLabel}
            </button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
