"use client"

import { CloseCircle, Danger, InfoCircle, TickCircle } from "iconsax-react"
import { Id, toast, ToastOptions, ToastPosition } from "react-toastify"

// react-toastify doesn't publish "./dist/components/CloseButton" in its package.json
// "exports" map, so it can't be imported under the "bundler" moduleResolution this project
// uses — only the `closeToast` callback is actually needed here.
type ToastCloseButtonProps = { closeToast: (e: React.MouseEvent<HTMLElement>) => void }

function ToastCloseButton({ closeToast }: ToastCloseButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center border-0 bg-transparent p-0 text-inherit"
      onClick={closeToast}
      aria-label="Close notification"
    >
      <CloseCircle size={16} color="#E4E4E9" />
    </button>
  )
}

type ToastType = "info" | "success" | "warning" | "error"

interface ToastConfig extends Omit<ToastOptions, "position"> {
  position?: ToastPosition
  autoClose?: number | false
  hideProgressBar?: boolean
  closeOnClick?: boolean
  pauseOnHover?: boolean
  draggable?: boolean
  progress?: number | string
  actionLabel?: string
  onAction?: () => void
}

export function showToast(type: ToastType, message: string, _config?: ToastConfig): Id {
  const content =
    _config?.actionLabel && _config?.onAction ? (
      <div className="flex items-center gap-2">
        <span className="min-w-0 text-sm font-normal leading-5 text-neutral-900">{message}</span>
        <button
          type="button"
          className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase leading-4 text-primary underline underline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            _config?.onAction?.()
          }}
        >
          {_config.actionLabel}
        </button>
      </div>
    ) : (
      message
    )

  const base: ToastConfig = {
    className: "bg-white text-neutral-900 text-base font-normal",
    bodyClassName: "text-base text-neutral-900 font-normal ",
    closeButton: ToastCloseButton,
    autoClose: _config?.autoClose ?? 3000,
    hideProgressBar: _config?.hideProgressBar,
    closeOnClick: _config?.closeOnClick ?? true,
    pauseOnHover: _config?.pauseOnHover,
    draggable: _config?.draggable,
    progress: _config?.progress,
    toastId: _config?.toastId,
  }

  const configs: Record<ToastType, ToastConfig> = {
    success: { ...base, progressClassName: "bg-primary", icon: <TickCircle size="24" className="text-primary" /> },
    error: {
      ...base,
      progressClassName: "bg-error",
      icon: <InfoCircle size="24" className="rotate-180 text-error" />,
    },
    info: {
      ...base,
      progressClassName: "bg-warning-light",
      icon: <InfoCircle size="24" className="text-warning-light" />,
    },
    warning: { ...base, progressClassName: "bg-info", icon: <Danger size="24" className="text-info" /> },
  }

  const cfg = configs[type]
  switch (type) {
    case "success":
      return toast.success(content, cfg)
    case "error":
      return toast.error(content, cfg)
    case "info":
      return toast.info(content, cfg)
    case "warning":
      return toast.warn(content, cfg)
  }
}
