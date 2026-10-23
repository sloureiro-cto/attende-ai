import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import * as React from "react"

import { cn, getDialogNestedOverlayDismissProps, releaseStuckBodyPointerEvents } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    onClose?: (e?: any) => void
    customCloseButton?: React.ReactNode
    closeButtonContainerClassname?: string
    closeButtonClassname?: string
    hideCloseButton?: boolean
    dialogOverlayClickHandler?: (event: React.MouseEvent<HTMLDivElement>) => void
    /** Merged into `DialogOverlay` (e.g. z-index when content uses a higher layer). */
    overlayClassName?: string
  }
>(
  (
    {
      className,
      children,
      onClose,
      customCloseButton,
      closeButtonContainerClassname,
      closeButtonClassname,
      hideCloseButton,
      style,
      dialogOverlayClickHandler,
      overlayClassName,
      onCloseAutoFocus,
      onPointerDownOutside,
      onInteractOutside,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => {
    const nestedDismiss = getDialogNestedOverlayDismissProps()
    return (
    <DialogPortal>
      <DialogOverlay
        className={cn(
          "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          overlayClassName
        )}
        onClick={(event) => {
          dialogOverlayClickHandler?.(event)
        }}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Mobile: Position at top with safe area, full width
          // Desktop: Centered with translate
          "fixed z-50 grid w-full gap-4 border border-slate-200 bg-white p-6 shadow-lg duration-200",
          // Mobile positioning - top aligned for better keyboard handling
          "max-w-lg rounded-none pt-[env(safe-area-inset-top)]",
          // Desktop positioning - centered
          "inset-auto left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] rounded-lg pt-6",
          // Animations
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          // Mobile slide from top
          "data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0",
          // Desktop zoom and slide
          "md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%] md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]",
          "dark:border-slate-800 dark:bg-slate-950",
          className
        )}
        style={style}
        {...props}
        onPointerDownOutside={(event) => {
          nestedDismiss.onPointerDownOutside(event)
          if (dialogOverlayClickHandler) event.preventDefault()
          onPointerDownOutside?.(event)
        }}
        onInteractOutside={(event) => {
          nestedDismiss.onInteractOutside(event)
          if (dialogOverlayClickHandler) event.preventDefault()
          onInteractOutside?.(event)
        }}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event)
          queueMicrotask(releaseStuckBodyPointerEvents)
        }}
        onCloseAutoFocus={(event) => {
          releaseStuckBodyPointerEvents()
          onCloseAutoFocus?.(event)
        }}
        onClick={(event) => {
          event.stopPropagation()
          props.onClick?.(event)
        }}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            onClick={(e: any) => {
              if (onClose) {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className={cn(
              "pointer-events-auto absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500 dark:ring-offset-slate-950 dark:focus:ring-slate-300 dark:data-[state=open]:bg-slate-800 dark:data-[state=open]:text-slate-400",
              closeButtonContainerClassname
            )}
          >
            {customCloseButton ? customCloseButton : <X size={16} className={closeButtonClassname} />}
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
    )
  }
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-500 dark:text-slate-400", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
