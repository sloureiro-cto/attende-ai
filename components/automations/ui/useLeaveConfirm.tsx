"use client"

import { useRouter } from "next/navigation"
import { type MouseEvent, type ReactNode, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog"

/**
 * Confirms leaving a full-page editor through an in-app link while there are unsaved changes.
 * Attach `confirmLeave` to the link's onClick and render `leaveDialog` once.
 */
export function useLeaveConfirm(params: {
  dirty: boolean
  title: string
  cancelLabel: string
  leaveLabel: string
}): { confirmLeave: (e: MouseEvent<HTMLAnchorElement>) => void; leaveDialog: ReactNode } {
  const router = useRouter()
  const [target, setTarget] = useState<string | null>(null)

  const confirmLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!params.dirty) return
    e.preventDefault()
    setTarget(e.currentTarget.getAttribute("href"))
  }

  const leaveDialog = (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{params.title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{params.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const href = target
              setTarget(null)
              if (href) router.push(href)
            }}
          >
            {params.leaveLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return { confirmLeave, leaveDialog }
}
