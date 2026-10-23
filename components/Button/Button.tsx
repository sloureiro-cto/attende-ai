"use client"
import { LoaderCircle } from "lucide-react"
import { ButtonHTMLAttributes, forwardRef } from "react"
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Tooltip } from "components/ui/tooltip"

interface PropTypes extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  size?: "extraSmall" | "small" | "medium" | "large" | "extraLarge"
  type?: "button" | "submit" | "reset"
  style?: "solid" | "outline"
  variant?: "primary" | "secondary" | "danger" | "warning" | "dangerClean" | "ghost"
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  className?: string
  disabled?: boolean
  isActive?: boolean
  activeStyle?: string
  tooltipText?: string
  loading?: boolean
  isMenuItem?: boolean
  contentClassName?: string
  /**
   * Provider white-label accent (hex). Only applied for `variant="primary"` — overrides the
   * Tailwind `bg-primary`/`border-primary`/`text-primary` classes via inline style, which always
   * wins over a class regardless of specificity. Hover state intentionally keeps the same color
   * (no darkened variant computed) rather than guessing a shade from an arbitrary brand hex.
   */
  brandColor?: string
}

const Button = forwardRef<HTMLButtonElement, PropTypes>(
  (
    {
      children,
      size = "large",
      style = "solid",
      variant = "primary",
      startIcon,
      endIcon,
      disabled,
      className,
      isActive,
      activeStyle,
      tooltipText,
      loading = false,
      onClick,
      isMenuItem,
      type = "button",
      contentClassName,
      brandColor,
      ...props
    },
    ref
  ) => {
    const brandColorStyle: React.CSSProperties | undefined =
      brandColor && variant === "primary"
        ? style === "solid"
          ? { backgroundColor: brandColor, borderColor: brandColor }
          : { color: brandColor, borderColor: brandColor }
        : undefined
    const buttonStyle = {
      primary: {
        solid: `bg-primary border border-primary text-white  
            hover:bg-primary-dark hover:border-primary-dark
            disabled:bg-primary disabled:opacity-50 disabled:text-white disabled:border-primary            transition-all duration-200
            active:bg-primary-darkest active:border-primary-darkest active:scale-[0.99]
            ${
              isActive
                ? activeStyle ||
                  "border-primary-darkest bg-primary-light hover:bg-primary-darkest hover:bg-primary-dark hover:border-primary-dark"
                : ""
            }`,
        outline: `border border-primary text-primary 
            hover:text-primary-dark hover:border-primary-dark 
            transition-all duration-150 
            disabled:opacity-50 disabled:text-primary disabled:border-primary            active:scale-[0.99]
            ${isActive ? activeStyle || "bg-primary-dark hover:bg-primary-darkest" : ""}`,
      },
      secondary: {
        solid: `bg-white border border-neutral-50 text-secondary-darkest transition-all duration-200 font-semibold
            hover:bg-neutral-10 hover:border-neutral-50 
            disabled:bg-white disabled:opacity-50 disabled:text-secondary-darkest             active:scale-[0.99] active:bg-neutral-10 active:border-neutral-50
            ${
              isActive
                ? activeStyle ||
                  "border-primary bg-primary-clean text-primary hover:bg-primary-lighter hover:border-primary-dark"
                : ""
            }`,
        outline: `border border-neutral-border hover:border-neutral-200 text-neutral-500 active:scale-[0.99]
            disabled:opacity-50 disabled:text-secondary-darkest disabled:border-neutral-border            ${
              isActive ? activeStyle || "bg-primary-dark hover:bg-primary-darkest" : ""
            }`,
      },
      danger: {
        solid: `bg-error border border-error hover:bg-error-dark 
            hover:border-error-dark text-white disabled:bg-error 
            disabled:opacity-50 disabled:text-white disabled:border-error            transition-all duration-200 active:scale-[0.99]
            ${
              isActive
                ? activeStyle ||
                  "border-error-darkest text-error-darkest bg-error-lighter hover:border-error-dark text-white disabled:bg-error"
                : ""
            }`,
        outline: `border border-error-lighter text-error-dark active:scale-[0.99]
            hover:text-error-dark hover:border-error-dark transition-all duration-150
            disabled:opacity-50 disabled:text-white disabled:border-error disabled:bg-error`,
      },
      dangerClean: {
        solid: `bg-error-clean border border-error-clean hover:bg-error-dark 
            hover:border-error-dark text-error-darkest hover:text-white disabled:bg-error-clean 
            disabled:opacity-50 disabled:text-white disabled:border-error            transition-all duration-200 active:scale-[0.99]
            ${
              isActive
                ? activeStyle ||
                  "border-error-darkest text-error-darkest bg-error-lighter hover:border-error-dark text-white disabled:bg-error"
                : ""
            }`,
        outline: `border border-error-lighter text-error-dark active:scale-[0.99]
            hover:text-error-dark hover:border-error-dark transition-all duration-150
            disabled:opacity-50 disabled:text-white disabled:border-error disabled:bg-error`,
      },
      warning: {
        solid: `bg-warning border border-warning hover:bg-warning-dark active:scale-[0.99]
            hover:border-warning-dark text-white disabled:bg-warning 
            disabled:opacity-50 disabled:text-white disabled:border-warning            transition-all duration-200
            ${
              isActive
                ? activeStyle ||
                  "border-warning-darkest text-warning-darkest bg-warning-lighter hover:border-warning-dark text-white disabled:bg-warning"
                : ""
            }`,
        outline: `border border-warning-lighter text-warning-dark active:scale-[0.99]
            hover:text-warning-dark hover:border-warning-dark transition-all duration-150
            disabled:opacity-50 disabled:text-white disabled:border-warning disabled:bg-warning`,
      },
      ghost: {
        solid: `bg-transparent text-secondary-darkest transition-all duration-200 font-normal
            hover:bg-secondary-clean active:bg-secondary-clean hover:border-secondary-clean active:scale-[0.99]
            disabled:bg-transparent disabled:opacity-50            ${
              isActive ? activeStyle || "bg-secondary-clean hover:bg-secondary-clean hover:border-secondary-clean" : ""
            }`,
        outline: `text-secondary-darkest active:scale-[0.99]`,
      },
    } as const

    const buttonSize = {
      extraSmall: "min-h-[18px] h-auto px-4 py-1 text-xs",
      small: "min-h-7 h-auto px-4 py-1 text-xs",
      medium: "min-h-8 h-auto px-4 py-2 text-xs",
      large: "min-h-9 h-auto px-4 py-2 text-sm",
      extraLarge: "min-h-10 h-auto px-4 py-2 text-sm",
    } as const

    const buttonContent = (
      <button
        ref={ref}
        className={cn(
          "inline-flex flex-shrink-0 items-center justify-center gap-1 rounded font-semibold",
          isMenuItem ? "gap-2" : "gap-1",
          buttonStyle[variant][style],
          buttonSize[size],
          className
        )}
        style={brandColorStyle}
        type={type}
        disabled={disabled || loading}
        onClick={(e) => {
          if (loading) {
            e.preventDefault()
            return
          }
          onClick && onClick(e)
        }}
        {...props}
      >
        {loading ? <LoaderCircle className="shrink-0 animate-spin" size={14} /> : startIcon}
        {children}
        {!loading && endIcon}
      </button>
    )

    if (tooltipText) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      )
    }

    return buttonContent
  }
)

Button.displayName = "Button"

export default Button
