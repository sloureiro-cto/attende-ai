import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const ForwardArrowIcon = ({ size = "72", color = "currentColor" }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={color}
    >
      <path
        d="M10.7213 13.8308C10.5867 13.8308 10.4521 13.7813 10.3458 13.675C10.1404 13.4696 10.1404 13.1296 10.3458 12.9242L14.27 9.00001L10.3458 5.07584C10.1404 4.87042 10.1404 4.53042 10.3458 4.32501C10.5513 4.11959 10.8913 4.11959 11.0967 4.32501L15.3963 8.62459C15.6017 8.83001 15.6017 9.17001 15.3963 9.37542L11.0967 13.675C10.9904 13.7813 10.8558 13.8308 10.7213 13.8308Z"
        fill={"currentColor"}
      />
      <path
        d="M14.9004 9.53125H2.97919C2.68877 9.53125 2.44794 9.29042 2.44794 9C2.44794 8.70958 2.68877 8.46875 2.97919 8.46875H14.9004C15.1909 8.46875 15.4317 8.70958 15.4317 9C15.4317 9.29042 15.1909 9.53125 14.9004 9.53125Z"
        fill={"currentColor"}
      />
    </svg>
  )
}

export default ForwardArrowIcon
