import { SVGProps } from "react"

interface IconProps {
  size?: number
  color?: string
  props?: SVGProps<SVGSVGElement>
}

export function CheckMarkIcon({ size, props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" className="currentColor" {...props}>
      <path stroke={"currentColor"} strokeLinecap="round" strokeLinejoin="round" d="m2.25 9 4.495 4.5 9.005-9" />
    </svg>
  )
}
