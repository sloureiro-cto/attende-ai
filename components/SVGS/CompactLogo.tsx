import { SVGProps } from "react"

type CompactLogoProps = {
  size: number | string
  color?: string
  className?: string
} & SVGProps<SVGSVGElement>

export const CompactLogo = ({ size = 20, color = "currentColor", className, ...props }: CompactLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
    {...props}
  >
    <path
      d="M20.572 0V5.716L12 10.428L3.42801 5.716V3.428H18.288V0H0V7.428L12 14.288L20.572 9.388V15.428L12 20.144L3.42801 15.428V12.024L0 10.064V17.144L12 24L24 17.144V0H20.572Z"
      fill={color}
    />
  </svg>
)
