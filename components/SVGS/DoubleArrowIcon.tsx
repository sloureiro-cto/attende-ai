import { SVGProps } from "react"

interface IconProps {
  size?: number
  color?: string
  props?: SVGProps<SVGSVGElement>
  className?: string
}

const DoubleArrowIcon = ({ size = 24, color = "#292D32", props, className }: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={className}
    >
      <path
        d="M19.9201 11.9998L13.4001 5.47984C12.6301 4.70984 11.3701 4.70984 10.6001 5.47984L4.08008 11.9998"
        stroke={className ? "currentColor" : color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.9201 19.0975L13.4001 12.5775C12.6301 11.8075 11.3701 11.8075 10.6001 12.5775L4.08008 19.0975"
        stroke={className ? "currentColor" : color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default DoubleArrowIcon
