"use client"
import Link from "next/link"
import { cn } from "@/lib/utils"
import Button from "components/Button/Button"

type PropTypes = {
  isActive: boolean
  href?: string
  icon?: React.ReactNode
  type: "link" | "button"
  onClick?: () => void
  label?: string
  size?: "extraSmall" | "small" | "medium" | "large" | "extraLarge"
  customClassName?: string
  variant?: "primary" | "secondary"
  customLabelClassName?: string
  "aria-label"?: string
}

const BtnViewMode = ({
  isActive,
  href,
  icon,
  type,
  onClick,
  label,
  size = "large",
  customClassName,
  variant = "secondary",
  customLabelClassName,
  "aria-label": ariaLabel,
}: PropTypes) => {
  return type === "link" ? (
    <Link
      href={href ?? "#"}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={cn(
        "inline-flex max-h-7 min-h-7 shrink-0 cursor-pointer items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-10 hover:text-secondary-darkest",
        isActive ? "bg-neutral-10 text-secondary-darkest" : "bg-transparent",
        customClassName
      )}
    >
      {icon}
      {label && <span className="text-semibold text-xs">{label}</span>}
    </Link>
  ) : (
    <Button
      className={cn(
        "flex cursor-pointer items-center justify-center rounded border-none px-2 py-1.5 text-neutral-500 hover:border-neutral-10 hover:bg-neutral-10 hover:text-secondary-darkest",
        isActive
          ? "border-neutral-10 bg-neutral-10 text-secondary-darkest hover:text-secondary-darkest focus:bg-neutral-10 focus:text-secondary-darkest"
          : "bg-transparent text-neutral-500 focus:text-secondary-darkest",
        customClassName
      )}
      variant={variant}
      size={size}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      {icon}
      {label && <span className={cn("text-semibold text-xs", customLabelClassName)}>{label}</span>}
    </Button>
  )
}

export default BtnViewMode
