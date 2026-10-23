import { Code } from "iconsax-react"
import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const CodeIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.3416 25.3292C19.7121 26.0701 19.4118 26.9712 18.6708 27.3416C17.591 27.8815 16.6887 28.6823 16.0103 29.6887C15.8832 29.8859 15.8832 30.1141 16.0103 30.3113C16.6887 31.3177 17.591 32.1185 18.6708 32.6584C19.4118 33.0288 19.7121 33.9299 19.3416 34.6708C18.9712 35.4118 18.0701 35.7121 17.3292 35.3416C15.7719 34.563 14.4761 33.4066 13.5151 31.9768L13.5064 31.9638C12.7178 30.7638 12.7179 29.2363 13.5064 28.0362L13.515 28.0232C14.4761 26.5933 15.7719 25.437 17.3292 24.6584C18.0701 24.2879 18.9712 24.5882 19.3416 25.3292Z"
        fill="url(#paint0_linear_435_1463)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29.0784 25.3292C29.4488 24.5882 30.3499 24.2879 31.0908 24.6584C32.6481 25.437 33.9439 26.5934 34.9049 28.0232L34.9136 28.0362C35.7022 29.2362 35.7021 30.7637 34.9136 31.9638L34.905 31.9768C33.9439 33.4067 32.6481 34.563 31.0908 35.3416C30.3499 35.7121 29.4488 35.4118 29.0784 34.6708C28.7079 33.9299 29.0082 33.0288 29.7492 32.6584C30.829 32.1185 31.7313 31.3177 32.4097 30.3113C32.5368 30.1141 32.5368 29.8859 32.4097 29.6887C31.7313 28.6823 30.829 27.8815 29.7492 27.3416C29.0082 26.9712 28.7079 26.0701 29.0784 25.3292Z"
        fill="url(#paint1_linear_435_1463)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.18934 6.18934C8.85828 3.5204 12.8521 2.5 18 2.5H30C35.1479 2.5 39.1417 3.5204 41.8107 6.18934C44.4796 8.85828 45.5 12.8521 45.5 18V30C45.5 35.1479 44.4796 39.1417 41.8107 41.8107C39.1417 44.4796 35.1479 45.5 30 45.5H18C12.8521 45.5 8.85828 44.4796 6.18934 41.8107C3.5204 39.1417 2.5 35.1479 2.5 30V18C2.5 12.8521 3.5204 8.85828 6.18934 6.18934ZM8.31066 8.31066C6.4796 10.1417 5.5 13.1479 5.5 18V30C5.5 34.8521 6.4796 37.8583 8.31066 39.6893C10.1417 41.5204 13.1479 42.5 18 42.5H30C34.8521 42.5 37.8583 41.5204 39.6893 39.6893C41.5204 37.8583 42.5 34.8521 42.5 30V18C42.5 13.1479 41.5204 10.1417 39.6893 8.31066C37.8583 6.4796 34.8521 5.5 30 5.5H18C13.1479 5.5 10.1417 6.4796 8.31066 8.31066Z"
        fill="url(#paint2_linear_435_1463)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M44.4 15.9992C44.4004 16.8276 43.7292 17.4996 42.9008 17.5L4.46078 17.52C3.63235 17.5204 2.96043 16.8492 2.96 16.0208C2.95957 15.1924 3.63079 14.5204 4.45922 14.52L42.8992 14.5C43.7276 14.4996 44.3996 15.1708 44.4 15.9992Z"
        fill="url(#paint3_linear_435_1463)"
      />
      <defs>
        <linearGradient id="paint0_linear_435_1463" x1="45.5" y1="24" x2="2.5" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient id="paint1_linear_435_1463" x1="45.5" y1="24" x2="2.5" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient id="paint2_linear_435_1463" x1="45.5" y1="24" x2="2.5" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient id="paint3_linear_435_1463" x1="45.5" y1="24" x2="2.5" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
      </defs>
    </svg>
  ) : (
    <Code size={size} className={color} />
  )
}

export default CodeIcon
