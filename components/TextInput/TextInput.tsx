"use client"
import { InputAdornment, Tooltip } from "@mui/material"
import Image from "next/image"
import React, { InputHTMLAttributes, ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import EyeCloseIcon from "components/SVGS/EyeCloseIcon"
import EyeOpenIcon from "components/SVGS/EyeOpenIcon"

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  id?: string
  label?: string
  startIcon?: ReactNode
  endIcon?: ReactNode
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  hasMarginTop?: boolean
  labelStyle?: string
  helperText?: string
  helperTextStyle?: string
  size?: "small" | "medium" | "large"
  required?: boolean
  hideRequiredMark?: boolean
  fullWidth?: boolean
  error?: string | null
  hideErrorMessage?: boolean
  customError?: React.ReactNode
  focusedIconColor?: string
  removeOptionalText?: boolean
  containerClassName?: string
  infoDescription?: string
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      id,
      type = "text",
      value,
      onChange,
      className = "",
      label,
      startIcon,
      endIcon,
      hasMarginTop = false,
      labelStyle,
      helperText,
      helperTextStyle,
      size = "large",
      required = false,
      hideRequiredMark = false,
      fullWidth = false,
      error,
      hideErrorMessage = false,
      customError,
      focusedIconColor = "text-neutral-900",
      removeOptionalText = false,
      containerClassName = "",
      infoDescription,
      autoComplete: _autoComplete = "off",
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const handleTogglePassword = () => {
      setShowPassword((prevState) => !prevState)
    }

    return (
      <div className={cn("flex flex-col gap-1", fullWidth && "w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className={cn("flex items-center gap-1 text-sm font-semibold text-neutral-700", labelStyle)}
          >
            {label}
            {!required && !removeOptionalText && (
              <span className="text-xs font-normal text-neutral-200">(Optional)</span>
            )}
            {required && !hideRequiredMark && <span className="text-xs font-normal text-error">*</span>}
            {infoDescription && (
              <Tooltip title={infoDescription} arrow>
                <div className="rounded-full bg-info-clean p-[2px]">
                  <Image src="/questio-circle.svg" alt="Info" width={12} height={12} />
                </div>
              </Tooltip>
            )}
          </label>
        )}
        <div className={cn("relative", hasMarginTop && "mt-1")}>
          {startIcon && (
            <div
              className={cn(
                "absolute inset-y-0 left-0 flex items-center",
                size === "small" ? "pl-3" : "pl-4",
                props.disabled && "cursor-not-allowed text-neutral-100"
              )}
            >
              <InputAdornment className="pr-2" position="start">
                {React.cloneElement(startIcon as React.ReactElement, {
                  size: size === "small" ? 12 : size === "medium" ? 14 : 16,
                  className: cn(
                    (startIcon as React.ReactElement).props.className,
                    isFocused && focusedIconColor,
                    props.disabled && "text-neutral-100"
                  ),
                })}
              </InputAdornment>
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={type === "password" && showPassword ? "text" : type}
            value={value}
            onChange={(e) => {
              if (props.disabled) return
              onChange && onChange(e)
            }}
            disabled={props.disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
            className={cn(
              `block h-fit w-full rounded border border-neutral-50 bg-white px-4 py-2 text-sm font-normal transition-all focus:border-neutral-900 focus:outline-none focus-visible:text-neutral-900`,
              size === "small" && "py-1 text-xs",
              size === "medium" && "text-xs",
              size === "large" && "text-sm",
              // Apply horizontal padding before className so callers can override height,
              // but re-assert icon gutters after className so `px-*` cannot collapse them.
              !startIcon && (size === "small" ? "pl-3" : "pl-4"),
              !endIcon && type !== "password" && (size === "small" ? "pr-3" : "pr-4"),
              className,
              startIcon && (size === "small" ? "pl-8" : "pl-10"),
              (endIcon || type === "password") && (size === "small" ? "pr-9" : "pr-11"),
              props.disabled && "bg-neutral-10 text-neutral-100",
              error && "border-error text-error placeholder:text-error"
            )}
          />
          {type === "password" && (
            <div
              onClick={handleTogglePassword}
              className={cn(
                "pointer-events-auto absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3",
                isFocused && focusedIconColor
              )}
            >
              {showPassword ? <EyeOpenIcon /> : <EyeCloseIcon />}
            </div>
          )}
          {type !== "password" && endIcon && (
            <div
              className={cn(
                "absolute inset-y-0 right-0 flex items-center",
                size === "small" ? "pr-3" : "pr-4",
                props.disabled && "cursor-not-allowed text-neutral-100"
              )}
            >
              <InputAdornment position="end">
                {React.cloneElement(endIcon as React.ReactElement, {
                  className: cn(
                    (endIcon as React.ReactElement).props.className,
                    isFocused && focusedIconColor,
                    props.disabled && "text-neutral-100"
                  ),
                })}
              </InputAdornment>
            </div>
          )}
        </div>
        {customError}
        {error && !hideErrorMessage && <div className="text-body-10 font-normal text-error">{error}</div>}
        {helperText && <div className={cn("text-sm text-neutral-200", helperTextStyle)}>{helperText}</div>}
      </div>
    )
  }
)

TextInput.displayName = "TextInput"

export default TextInput
