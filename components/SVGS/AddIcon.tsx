import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const AddIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 22 22" fill="none">
      <g clipPath="url(#clip0_1654_48)">
        <path
          d="M17.4168 11.9166H11.9168V17.4166H10.0835V11.9166H4.5835V10.0833H10.0835V4.58325H11.9168V10.0833H17.4168V11.9166Z"
          fill="url(#paint0_linear_1654_48)"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_1654_48"
          x1="4.5835"
          y1="4.58325"
          x2="17.4168"
          y2="17.4166"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#17242D" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <clipPath id="clip0_1654_48">
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
      <g clipPath="url(#clip0_794_252)">
        <path d="M76 52H52V76H44V52H20V44H44V20H52V44H76V52Z" fill={isGradient ? "url(#gradient)" : "currentColor"} />
      </g>
      <defs>
        <clipPath id="clip0_794_252">
          <rect width="96" height="96" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

export default AddIcon
