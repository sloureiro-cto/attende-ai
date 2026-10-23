import type { SVGProps } from "react"

interface IconProps {
  size?: number
  color?: string
  props?: SVGProps<SVGSVGElement>
  className?: string
}

/**
 * Handle de arrastar campos no form builder — par de colunas de traços (Figma reorder).
 */
export function FormFieldReorderHandleIcon({ size = 24, color = "#4D4B5C", props, className }: IconProps) {
  const stroke = className ? "currentColor" : color
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
      className={className}
    >
      <path d="M15 6H15.0001" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12H15.0001" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 18H15.0001" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 6H9.0001" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12H9.0001" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 18H9.0001" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
