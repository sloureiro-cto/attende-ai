import { SVGProps } from "react"

interface IconProps {
  size?: number
  color?: string
  props?: SVGProps<SVGSVGElement>
  className?: string
}

export function CloseIcon({ size = 16, color = "#4D4B5C", props, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" {...props} className={className}>
      <path
        stroke={className ? "currentColor" : color}
        className={className}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4 4 8 8M4 12l8-8"
      />
    </svg>
  )
}
