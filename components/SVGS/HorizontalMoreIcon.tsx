import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const HorizontalMoreIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 22 22" fill="none">
      <g clipPath="url(#clip0_1654_25)">
        <path
          d="M14.6668 11.0001C14.6668 12.0084 15.4918 12.8334 16.5002 12.8334C17.5085 12.8334 18.3335 12.0084 18.3335 11.0001C18.3335 9.99175 17.5085 9.16675 16.5002 9.16675C15.4918 9.16675 14.6668 9.99175 14.6668 11.0001ZM12.8335 11.0001C12.8335 9.99175 12.0085 9.16675 11.0002 9.16675C9.99183 9.16675 9.16683 9.99175 9.16683 11.0001C9.16683 12.0084 9.99183 12.8334 11.0002 12.8334C12.0085 12.8334 12.8335 12.0084 12.8335 11.0001ZM7.3335 11.0001C7.3335 9.99175 6.5085 9.16675 5.50016 9.16675C4.49183 9.16675 3.66683 9.99175 3.66683 11.0001C3.66683 12.0084 4.49183 12.8334 5.50016 12.8334C6.5085 12.8334 7.3335 12.0084 7.3335 11.0001Z"
          fill="url(#paint0_linear_1654_25)"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_1654_25"
          x1="18.3335"
          y1="9.16675"
          x2="16.608"
          y2="16.0687"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#17242D" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <clipPath id="clip0_1654_25">
          <rect width="22" height="22" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      className={isGradient ? "" : color}
    >
      <g clipPath="url(#clip0_871_1058)">
        <path
          d="M64 48C64 52.4 67.6 56 72 56C76.4 56 80 52.4 80 48C80 43.6 76.4 40 72 40C67.6 40 64 43.6 64 48ZM56 48C56 43.6 52.4 40 48 40C43.6 40 40 43.6 40 48C40 52.4 43.6 56 48 56C52.4 56 56 52.4 56 48ZM32 48C32 43.6 28.4 40 24 40C19.6 40 16 43.6 16 48C16 52.4 19.6 56 24 56C28.4 56 32 52.4 32 48Z"
          fill={isGradient ? "url(#gradient)" : "currentColor"}
        />
      </g>
      <defs>
        <clipPath id="clip0_871_1058">
          <rect width="96" height="96" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

export default HorizontalMoreIcon
