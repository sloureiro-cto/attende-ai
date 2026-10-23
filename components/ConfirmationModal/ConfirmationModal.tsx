"use client"

import type * as React from "react"

import { cn } from "@/lib/utils"
import Button from "components/Button/Button"
import { Divider } from "components/Divider/Divider"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "components/ui/dialog"

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: (e?: any) => void
  onCancel?: (e?: any) => void
  onConfirm: (e?: any) => void
  title?: string
  description?: React.ReactNode
  itemName?: string
  actionText?: string
  cancelText?: string | React.ReactNode
  confirmText?: string | React.ReactNode
  variant?: "delete" | "warning" | "info"
  hideDescription?: boolean
  loading?: boolean
  overlayClassName?: string
  classNames?: {
    confirmButton?: string
    cancelButton?: string
    title?: string
    description?: string
    dialogContent?: string
    dialogHeader?: string
    dialogFooter?: string
  }
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = "Confirm action",
  description,
  itemName,
  actionText = "delete",
  cancelText = "Cancel",
  confirmText = "Delete",
  variant = "delete",
  hideDescription = false,
  loading = false,
  overlayClassName,
  classNames,
}: ConfirmationDialogProps) {
  const getButtonVariant = () => {
    switch (variant) {
      case "delete":
        return "danger"
      default:
        return "primary"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        onClose={onClose}
        overlayClassName={overlayClassName}
        className={cn("flex flex-col gap-4 overflow-hidden rounded-lg p-6 sm:max-w-[425px]", classNames?.dialogContent)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <DialogHeader className={cn("relative", classNames?.dialogHeader)}>
          <DialogTitle className={cn("text-2xl font-medium text-neutral-900", classNames?.title)}>{title}</DialogTitle>
        </DialogHeader>
        <Divider />
        {!hideDescription && (
          <DialogDescription className={cn("mb-6 text-base text-neutral-900", classNames?.description)}>
            {description || (
              <>
                Are you sure you want to {actionText}{" "}
                {itemName && (
                  <>
                    &quot;<span className="font-semibold">{itemName}</span>&quot;
                  </>
                )}
                ?
              </>
            )}
          </DialogDescription>
        )}
        {!hideDescription && <Divider />}
        <DialogFooter
          className={cn(
            "flex gap-3 xs:justify-between sm:justify-between md:justify-between lg:justify-between xl:justify-between",
            classNames?.dialogFooter
          )}
        >
          <div className="flex w-full justify-between">
            <Button
              type="button"
              variant="secondary"
              style={variant !== "delete" ? "solid" : "outline"}
              className={classNames?.cancelButton}
              onClick={() => {
                if (onCancel) onCancel()
                else onClose()
              }}
              disabled={loading}
              autoFocus={false}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={getButtonVariant()}
              className={classNames?.confirmButton}
              onClick={async (e: any) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  await Promise.resolve(onConfirm(e))
                  onClose(e)
                } catch {
                  // Keep dialog open when confirm fails / rejects.
                }
              }}
              loading={loading}
              disabled={loading}
            >
              {confirmText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
