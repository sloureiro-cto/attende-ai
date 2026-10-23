"use client"

import { forwardRef, type TextareaHTMLAttributes, useCallback, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  classNames?: {
    container?: string
    label?: string
    textarea?: string
    helperText?: string
  }
  hideRequiredMark?: boolean
  helperText?: string
  error?: string
  customError?: React.ReactNode
  hideErrorMessage?: boolean
  minRows?: number
  maxRows?: number
  autoResize?: boolean
  size?: "small" | "medium" | "large"
  variant?: TextAreaVariant
  removeOptionalText?: boolean
}

export type TextAreaVariant = "default" | "primitive"

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    label,
    className,
    classNames,
    id,
    required = false,
    hideRequiredMark = false,
    helperText,
    error,
    customError,
    hideErrorMessage = false,
    minRows = 1,
    maxRows = 8,
    rows,
    size = "large",
    autoResize = false,
    onChange,
    disabled,
    variant = "default",
    value,
    removeOptionalText = false,
    ...rest
  },
  ref
) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [lineHeight, setLineHeight] = useState<number | null>(null)
  /** Latest forwarded ref without listing `ref` in deps — unstable refs (e.g. Radix composeRefs) would otherwise recreate this callback every render and can overflow the update depth. */
  const forwardedRef = useRef(ref)
  forwardedRef.current = ref

  const setTextareaNode = useCallback((node: HTMLTextAreaElement | null) => {
    const local = textRef as React.MutableRefObject<HTMLTextAreaElement | null>
    local.current = node
    const r = forwardedRef.current
    if (typeof r === "function") {
      r(node)
    } else if (r) {
      ;(r as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
    }
  }, [])

  if (label && !id && process.env.NODE_ENV !== "production") {
    console.warn("TextArea: 'id' prop is required when 'label' is provided for accessibility purposes.")
  }

  useLayoutEffect(() => {
    if (!textRef.current || !autoResize) return
    const computedStyle = window.getComputedStyle(textRef.current)
    const lh = parseFloat(computedStyle.lineHeight)
    setLineHeight(Number.isFinite(lh) && lh > 0 ? lh : null)
  }, [autoResize])

  const resizeTextarea = useCallback(() => {
    if (!textRef.current || !autoResize) return

    const textarea = textRef.current
    textarea.style.height = "auto"
    const scrollHeight = textarea.scrollHeight

    if (lineHeight) {
      const rowCount = Math.floor(scrollHeight / lineHeight)

      const min = minRows || 1
      const max = maxRows || Infinity

      const clampedRowCount = Math.max(min, Math.min(max, rowCount))
      textarea.style.height = `${clampedRowCount * lineHeight}px`
    } else {
      textarea.style.height = `${scrollHeight}px`
    }
  }, [autoResize, lineHeight, minRows, maxRows])

  useLayoutEffect(() => {
    if (!autoResize) return
    resizeTextarea()
  }, [value, autoResize, resizeTextarea])

  const textareaClassName = {
    default: cn(
      "block h-fit w-full rounded border border-neutral-border bg-white px-4 py-2 text-sm transition-all focus:border-neutral-900 focus:outline-none focus-visible:text-neutral-900",
      "disabled:cursor-not-allowed",
      "resize-none",
      size === "small" && "text-body-12",
      size === "medium" && "text-body-12",
      size === "large" && "text-body-14",
      className,
      classNames?.textarea
    ),
    primitive: cn(className, classNames?.textarea),
  }

  if (variant === "primitive") {
    return (
      <textarea
        {...rest}
        value={value}
        ref={setTextareaNode}
        id={id}
        rows={autoResize ? minRows : rows}
        className={textareaClassName[variant]}
        onChange={(e) => {
          if (onChange) onChange(e)
        }}
        disabled={disabled}
      />
    )
  }

  return (
    <div className={cn("flex flex-col gap-1", classNames?.container)}>
      {label && (
        <label
          htmlFor={id}
          className={cn("flex items-center gap-1 text-sm font-semibold text-neutral-900", classNames?.label)}
        >
          {label}
          {!required && !removeOptionalText && <span className="text-xs font-normal text-neutral-200">(Optional)</span>}
          {required && !hideRequiredMark && <span className="text-error">*</span>}
        </label>
      )}
      <textarea
        {...rest}
        value={value}
        ref={setTextareaNode}
        id={id}
        rows={autoResize ? minRows : rows}
        className={textareaClassName[variant]}
        onChange={(e) => {
          if (onChange) onChange(e)
        }}
        disabled={disabled}
      />
      {customError}
      {error && !hideErrorMessage && <div className="text-body-10 font-normal text-error">{error}</div>}
      {helperText && <div className={cn("text-sm text-neutral-200", classNames?.helperText)}>{helperText}</div>}
    </div>
  )
})

TextArea.displayName = "TextArea"
