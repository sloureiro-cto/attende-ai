import { Message2 } from "iconsax-react"
import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const ChatIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.5 21.0001C15.5 20.1716 16.1716 19.5001 17 19.5001H31C31.8284 19.5001 32.5 20.1716 32.5 21.0001C32.5 21.8285 31.8284 22.5001 31 22.5001H17C16.1716 22.5001 15.5 21.8285 15.5 21.0001Z"
        fill="url(#paint0_linear_9743_14639)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.68934 6.54939C7.75851 4.48022 10.6591 3.36005 14 3.36005H34C37.3409 3.36005 40.2415 4.48022 42.3107 6.54939C44.3798 8.61856 45.5 11.5192 45.5 14.86V26.86C45.5 30.2009 44.3798 33.1015 42.3107 35.1707C40.5578 36.9235 38.2083 37.9954 35.5 38.2821V41.1201C35.5 43.9254 32.3794 45.5678 30.0693 44.029M30.0693 44.029L21.5467 38.36H14C10.6591 38.36 7.75851 37.2399 5.68934 35.1707C3.62017 33.1015 2.5 30.2009 2.5 26.86V14.86C2.5 11.5192 3.62017 8.61856 5.68934 6.54939M7.81066 8.67071C6.37983 10.1015 5.5 12.2009 5.5 14.86V26.86C5.5 29.5192 6.37983 31.6186 7.81066 33.0494C9.24149 34.4802 11.3409 35.36 14 35.36H22C22.2956 35.36 22.5846 35.4474 22.8308 35.6111L31.7308 41.5312C32.0605 41.7509 32.5 41.5142 32.5 41.1201V36.86C32.5 36.0316 33.1716 35.36 34 35.36C36.6591 35.36 38.7585 34.4802 40.1893 33.0494C41.6202 31.6186 42.5 29.5192 42.5 26.86V14.86C42.5 12.2009 41.6202 10.1015 40.1893 8.67071C38.7585 7.23988 36.6591 6.36005 34 6.36005H14C11.3409 6.36005 9.24149 7.23988 7.81066 8.67071Z"
        fill="url(#paint1_linear_9743_14639)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_9743_14639"
          x1="45.5"
          y1="23.9899"
          x2="2.5"
          y2="23.9899"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_9743_14639"
          x1="45.5"
          y1="23.9899"
          x2="2.5"
          y2="23.9899"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
      </defs>
    </svg>
  ) : (
    <Message2 size={size} className={color} />
  )
}

export default ChatIcon
