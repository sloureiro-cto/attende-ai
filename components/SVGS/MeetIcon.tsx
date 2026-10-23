import { Video } from "iconsax-react"
import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const MeetIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.90066 10.0608C6.03091 10.9305 5.5 12.5021 5.5 15.5801V32.4201C5.5 34.3086 5.97281 36.0293 6.99218 37.2521C7.97142 38.4268 9.61919 39.3401 12.42 39.3401H25.06C28.1265 39.3401 29.6999 38.8097 30.5728 37.9384C31.4452 37.0678 31.98 35.4952 31.98 32.4201V15.5801C31.98 12.5021 31.4491 10.9305 30.5793 10.0608C29.7096 9.19101 28.138 8.6601 25.06 8.6601H12.42C9.342 8.6601 7.77041 9.19101 6.90066 10.0608ZM4.77934 7.93944C6.53959 6.17918 9.178 5.6601 12.42 5.6601H25.06C28.302 5.6601 30.9404 6.17918 32.7007 7.93944C34.4609 9.69969 34.98 12.3381 34.98 15.5801V32.4201C34.98 35.665 34.4548 38.3024 32.6922 40.0618C30.9301 41.8204 28.2935 42.3401 25.06 42.3401H12.42C8.90081 42.3401 6.33858 41.1533 4.68782 39.173C3.07719 37.2409 2.5 34.7516 2.5 32.4201V15.5801C2.5 12.3381 3.01909 9.69969 4.77934 7.93944Z"
        fill="url(#paint0_linear_435_1455)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M39.899 15.0098L34.98 18.4602V29.52L39.9014 32.9721L39.905 32.9746C41.0453 33.7796 41.6609 33.6489 41.8486 33.5515C42.0371 33.4535 42.5 33.0225 42.5 31.6201V16.3801C42.5 14.979 42.0377 14.545 41.8456 14.4447C41.654 14.3446 41.0365 14.2156 39.899 15.0098ZM43.2344 11.7855C44.8423 12.6252 45.5 14.4412 45.5 16.3801V31.6201C45.5 33.5577 44.8429 35.3766 43.2314 36.2137C41.6197 37.0509 39.7562 36.5411 38.1769 35.4269L38.175 35.4255L32.6186 31.5281C32.2183 31.2473 31.98 30.7891 31.98 30.3001V17.6801C31.98 17.1911 32.2183 16.7329 32.6186 16.4521L38.181 12.5504C39.7628 11.4455 41.6261 10.9456 43.2344 11.7855Z"
        fill="url(#paint1_linear_435_1455)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23 17.5001C22.1716 17.5001 21.5 18.1717 21.5 19.0001C21.5 19.8285 22.1716 20.5001 23 20.5001C23.8284 20.5001 24.5 19.8285 24.5 19.0001C24.5 18.1717 23.8284 17.5001 23 17.5001ZM18.5 19.0001C18.5 16.5148 20.5147 14.5001 23 14.5001C25.4853 14.5001 27.5 16.5148 27.5 19.0001C27.5 21.4854 25.4853 23.5001 23 23.5001C20.5147 23.5001 18.5 21.4854 18.5 19.0001Z"
        fill="url(#paint2_linear_435_1455)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_435_1455"
          x1="45.5"
          y1="24.0001"
          x2="2.5"
          y2="24.0001"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_435_1455"
          x1="45.5"
          y1="24.0001"
          x2="2.5"
          y2="24.0001"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_435_1455"
          x1="45.5"
          y1="24.0001"
          x2="2.5"
          y2="24.0001"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
      </defs>
    </svg>
  ) : (
    <Video size={size} className={color} />
  )
}

export default MeetIcon
