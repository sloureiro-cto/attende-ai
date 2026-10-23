import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const ClockIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 22 22" fill="none">
      <g clipPath="url(#clip0_1274_1273)">
        <path
          d="M10.9908 1.8335C5.93075 1.8335 1.83325 5.94016 1.83325 11.0002C1.83325 16.0602 5.93075 20.1668 10.9908 20.1668C16.0599 20.1668 20.1666 16.0602 20.1666 11.0002C20.1666 5.94016 16.0599 1.8335 10.9908 1.8335ZM10.9999 18.3335C6.94825 18.3335 3.66659 15.0518 3.66659 11.0002C3.66659 6.9485 6.94825 3.66683 10.9999 3.66683C15.0516 3.66683 18.3333 6.9485 18.3333 11.0002C18.3333 15.0518 15.0516 18.3335 10.9999 18.3335ZM11.4583 6.41683H10.0833V11.9168L14.8958 14.8043L15.5833 13.6768L11.4583 11.2293V6.41683Z"
          fill="#555A5E"
        />
      </g>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#17242D", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#45AD7E", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      className={isGradient ? "" : color}
    >
      <g clipPath="url(#clip0_1274_1273)">
        <path
          d="M10.9908 1.8335C5.93075 1.8335 1.83325 5.94016 1.83325 11.0002C1.83325 16.0602 5.93075 20.1668 10.9908 20.1668C16.0599 20.1668 20.1666 16.0602 20.1666 11.0002C20.1666 5.94016 16.0599 1.8335 10.9908 1.8335ZM10.9999 18.3335C6.94825 18.3335 3.66659 15.0518 3.66659 11.0002C3.66659 6.9485 6.94825 3.66683 10.9999 3.66683C15.0516 3.66683 18.3333 6.9485 18.3333 11.0002C18.3333 15.0518 15.0516 18.3335 10.9999 18.3335ZM11.4583 6.41683H10.0833V11.9168L14.8958 14.8043L15.5833 13.6768L11.4583 11.2293V6.41683Z"
          fill={isGradient ? "url(#gradient)" : "currentColor"}
        />
      </g>
      <defs>
        <clipPath id="clip0_1274_1273">
          <rect width="22" height="22" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

export default ClockIcon
