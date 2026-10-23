import React from "react"

export interface IconProps {
  size?: string
  color?: string
}

const CheckIcon = ({ size = "72", color = "currentColor" }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={color}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M3 10L7.66118 14.6667L17 5.33337" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default CheckIcon
