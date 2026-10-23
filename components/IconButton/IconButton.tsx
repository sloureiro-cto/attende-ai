"use client"
import { ArrowDown2 } from "iconsax-react"
import { LoaderCircle } from "lucide-react"
import React, { ButtonHTMLAttributes, forwardRef } from "react"
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Tooltip } from "components/ui/tooltip"

type IconButtonSize = "extraSmall" | "small" | "medium" | "large" | "extraLarge"
type IconButtonVariant = "primary" | "secondary" | "danger" | "tertiary" | "ghost" | "dark"
type IconButtonStyle = "solid" | "outline"

interface PropTypes extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize
  type?: "button" | "submit" | "reset"
  /**
   * Solid vs outline DS variant. Named `styleVariant` (not `style`) so Radix's
   * `Slot`/`asChild` prop merge — which special-cases any prop literally named
   * `style` and spreads it as CSSProperties — can't corrupt this string enum
   * into a garbage object when this button is used as a Trigger's asChild child.
   */
  styleVariant?: IconButtonStyle
  variant?: IconButtonVariant
  icon?: React.ReactNode
  className?: string
  disabled?: boolean
  isActive?: boolean
  activeStyle?: string
  tooltipText?: string
  loading?: boolean
  isDropdown?: boolean
  iconSize?: number
  /** Renders the DS Focus close chip. Extra small never shows it. */
  onClear?: () => void
}

const iconSizeMap: Record<IconButtonSize, number> = {
  extraSmall: 10,
  small: 16,
  medium: 16,
  large: 20,
  extraLarge: 24,
}

const closeChipSizeMap: Record<IconButtonSize, number> = {
  extraSmall: 0,
  small: 16,
  medium: 16,
  large: 20,
  extraLarge: 24,
}

const closeIconSizeMap: Record<IconButtonSize, number> = {
  extraSmall: 0,
  small: 12,
  medium: 12,
  large: 16,
  extraLarge: 16,
}

const idleSizeClass: Record<IconButtonSize, string> = {
  extraSmall: "box-border h-[18px] w-[18px] min-h-[18px] min-w-[18px] p-0 rounded-[2px]",
  small: "box-border h-6 w-6 min-h-6 min-w-6 p-0 rounded",
  medium: "box-border h-7 w-7 min-h-7 min-w-7 p-0 rounded",
  large: "box-border h-8 w-8 min-h-8 min-w-8 p-0 rounded",
  extraLarge: "box-border h-9 w-9 min-h-9 min-w-9 p-0 rounded",
}

const focusSizeClass: Record<IconButtonSize, string> = {
  extraSmall: "box-border h-[18px] w-[18px] min-h-[18px] min-w-[18px] p-1 rounded-[2px]",
  small: "box-border h-6 w-auto min-h-6 min-w-6 p-1 rounded",
  medium: "box-border h-7 w-auto min-h-7 min-w-7 p-1 rounded",
  large: "box-border h-8 w-auto min-h-8 min-w-8 p-1 rounded",
  extraLarge: "box-border h-9 w-auto min-h-9 min-w-9 p-1 rounded",
}

const variantStyles: Record<
  Exclude<IconButtonVariant, "tertiary">,
  Record<IconButtonStyle, { idle: string; hover: string; active: string }>
> = {
  primary: {
    solid: {
      idle: "border border-primary bg-primary text-white",
      hover: "hover:border-primary-dark hover:bg-primary-dark",
      active:
        "border-primary bg-primary-clean text-primary-dark hover:border-primary hover:bg-primary-clean data-[state=open]:border-primary data-[state=open]:bg-primary-clean",
    },
    outline: {
      idle: "border border-primary bg-transparent text-primary",
      hover: "hover:bg-primary-clean",
      active:
        "border-primary bg-primary-clean text-primary-dark hover:border-primary hover:bg-primary-clean data-[state=open]:border-primary data-[state=open]:bg-primary-clean",
    },
  },
  secondary: {
    solid: {
      idle: "border border-transparent bg-neutral-10 text-secondary-darkest",
      hover: "hover:bg-neutral-50",
      active:
        "border-primary bg-primary-clean text-secondary-darkest hover:border-primary hover:bg-primary-clean data-[state=open]:border-primary data-[state=open]:bg-primary-clean",
    },
    outline: {
      idle: "border border-neutral-50 bg-white text-secondary-darkest",
      hover: "hover:bg-neutral-10",
      active:
        "border-primary bg-primary-clean text-secondary-darkest hover:border-primary hover:bg-primary-clean data-[state=open]:border-primary data-[state=open]:bg-primary-clean",
    },
  },
  danger: {
    solid: {
      idle: "border border-error bg-error text-white",
      hover: "hover:border-error-dark hover:bg-error-dark",
      active:
        "border-error bg-error-clean text-error-dark hover:border-error hover:bg-error-clean data-[state=open]:border-error data-[state=open]:bg-error-clean",
    },
    outline: {
      idle: "border border-error bg-transparent text-error",
      hover: "hover:bg-error-clean",
      active:
        "border-error bg-error-clean text-error-dark hover:border-error hover:bg-error-clean data-[state=open]:border-error data-[state=open]:bg-error-clean",
    },
  },
  ghost: {
    solid: {
      idle: "border border-transparent bg-transparent text-secondary-darkest",
      hover: "hover:bg-secondary-clean",
      active:
        "border-primary bg-primary-clean text-secondary-darkest hover:border-primary hover:bg-primary-clean data-[state=open]:border-primary data-[state=open]:bg-primary-clean",
    },
    outline: {
      idle: "border border-transparent bg-transparent text-secondary-darkest",
      hover: "hover:bg-secondary-clean",
      active:
        "border-primary bg-primary-clean text-secondary-darkest hover:border-primary hover:bg-primary-clean data-[state=open]:border-primary data-[state=open]:bg-primary-clean",
    },
  },
  dark: {
    solid: {
      idle: "border border-secondary-darkest bg-secondary-darkest text-white",
      hover: "hover:border-secondary-dark hover:bg-secondary-dark",
      active:
        "border-secondary-darkest bg-secondary-darkest text-white hover:border-secondary-darkest hover:bg-secondary-darkest",
    },
    outline: {
      idle: "border border-secondary-darkest bg-transparent text-secondary-darkest",
      hover: "hover:bg-neutral-10",
      active:
        "border-secondary-darkest bg-secondary-darkest text-white hover:border-secondary-darkest hover:bg-secondary-darkest",
    },
  },
}

const closeChipClass: Record<Exclude<IconButtonVariant, "tertiary">, string> = {
  primary: "bg-primary-lighter text-primary-dark",
  secondary: "bg-primary-lighter text-primary-dark",
  danger: "bg-error-lighter text-error-dark",
  ghost: "bg-primary-lighter text-primary-dark",
  dark: "bg-secondary-dark text-white",
}

/** Vuesax linear close — 12px glyph inside the 16px Focus chip. */
function CloseGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 2.5L9.5 9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 9.5L9.5 2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function isIconButtonStyle(value: unknown): value is IconButtonStyle {
  return value === "solid" || value === "outline"
}

/** Radix Slot merges `style` with `{ ...slot, ...child }`. Spreading `"outline"` becomes `{0:"o",…}`. */
function resolveIconButtonStyle(value: unknown): {
  dsStyle: IconButtonStyle
  htmlStyle: React.CSSProperties | undefined
} {
  if (isIconButtonStyle(value)) {
    return { dsStyle: value, htmlStyle: undefined }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const recovered = Object.keys(record)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => String(record[key]))
      .join("")
    const dsStyle: IconButtonStyle = isIconButtonStyle(recovered) ? recovered : "solid"
    const cssEntries = Object.entries(record).filter(([key]) => !/^\d+$/.test(key))
    const htmlStyle = cssEntries.length > 0 ? (Object.fromEntries(cssEntries) as React.CSSProperties) : undefined
    return { dsStyle, htmlStyle }
  }

  return { dsStyle: "solid", htmlStyle: undefined }
}

const IconButton = forwardRef<HTMLButtonElement, PropTypes>(function IconButton(
  {
    children,
    size = "large",
    styleVariant = "solid",
    variant = "primary",
    icon,
    disabled,
    className,
    isActive,
    activeStyle,
    tooltipText,
    loading = false,
    isDropdown = false,
    iconSize,
    onClear,
    onClick,
    ...props
  },
  ref
) {
  const resolvedVariant = variant === "tertiary" ? "ghost" : variant
  const { dsStyle, htmlStyle } = resolveIconButtonStyle(styleVariant)
  const palette = variantStyles[resolvedVariant]?.[dsStyle] ?? variantStyles.ghost.solid
  const resolvedIconSize = iconSize ?? iconSizeMap[size]
  const showClear = Boolean(isActive && onClear && closeChipSizeMap[size] > 0)
  const chipSize = closeChipSizeMap[size]
  const expanded = showClear

  const buttonContent = (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden font-semibold transition-colors duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive ? activeStyle || palette.active : cn(palette.idle, palette.hover),
        className,
        isActive && expanded ? focusSizeClass[size] : idleSizeClass[size]
      )}
      style={htmlStyle}
      disabled={disabled || loading}
      onClick={(e) => {
        if (loading) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      {...props}
    >
      {loading && <LoaderCircle className="animate-spin" size={resolvedIconSize} />}
      {icon &&
        React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, {
          size: resolvedIconSize,
          className: cn((icon as React.ReactElement<{ className?: string }>).props?.className),
        })}
      {children}
      {isDropdown && <ArrowDown2 size={resolvedIconSize} className="shrink-0" />}
      {showClear ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] p-0.5",
            closeChipClass[resolvedVariant]
          )}
          style={{ width: chipSize, height: chipSize }}
          role="button"
          tabIndex={-1}
          aria-label="Clear"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onClear?.()
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          <CloseGlyph size={closeIconSizeMap[size]} />
        </span>
      ) : null}
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
})

IconButton.displayName = "IconButton"

export default IconButton
