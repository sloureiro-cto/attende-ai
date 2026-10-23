import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const PersonAddIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 22 22" fill="none">
      <g clipPath="url(#clip0_1112_887)">
        <path
          d="M13.7498 11.0001C15.7757 11.0001 17.4165 9.35925 17.4165 7.33341C17.4165 5.30758 15.7757 3.66675 13.7498 3.66675C11.724 3.66675 10.0832 5.30758 10.0832 7.33341C10.0832 9.35925 11.724 11.0001 13.7498 11.0001ZM13.7498 5.50008C14.7582 5.50008 15.5832 6.32508 15.5832 7.33341C15.5832 8.34175 14.7582 9.16675 13.7498 9.16675C12.7415 9.16675 11.9165 8.34175 11.9165 7.33341C11.9165 6.32508 12.7415 5.50008 13.7498 5.50008ZM13.7498 12.8334C11.3023 12.8334 6.4165 14.0617 6.4165 16.5001V18.3334H21.0832V16.5001C21.0832 14.0617 16.1973 12.8334 13.7498 12.8334ZM8.24984 16.5001C8.4515 15.8401 11.284 14.6667 13.7498 14.6667C16.2248 14.6667 19.0665 15.8492 19.2498 16.5001H8.24984ZM5.49984 13.7501V11.0001H8.24984V9.16675H5.49984V6.41675H3.6665V9.16675H0.916504V11.0001H3.6665V13.7501H5.49984Z"
          fill="url(#paint0_linear_1112_887)"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_1112_887"
          x1="0.916504"
          y1="3.66675"
          x2="14.8697"
          y2="22.8523"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#17242D" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <clipPath id="clip0_1112_887">
          <rect width="22" height="22" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      className={isGradient ? "" : color}
    >
      <g clipPath="url(#clip0_794_261)">
        <path
          d="M60 48C68.84 48 76 40.84 76 32C76 23.16 68.84 16 60 16C51.16 16 44 23.16 44 32C44 40.84 51.16 48 60 48ZM60 24C64.4 24 68 27.6 68 32C68 36.4 64.4 40 60 40C55.6 40 52 36.4 52 32C52 27.6 55.6 24 60 24ZM60 56C49.32 56 28 61.36 28 72V80H92V72C92 61.36 70.68 56 60 56ZM36 72C36.88 69.12 49.24 64 60 64C70.8 64 83.2 69.16 84 72H36ZM24 60V48H36V40H24V28H16V40H4V48H16V60H24Z"
          fill={isGradient ? "url(#gradient)" : "currentColor"}
        />
      </g>
      <defs>
        <clipPath id="clip0_794_261">
          <rect width="96" height="96" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

export default PersonAddIcon
