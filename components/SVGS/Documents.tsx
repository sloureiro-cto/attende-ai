import { DocumentText } from "iconsax-react"
import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const DocumentIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.47419 8.27068C8.19273 9.65071 7.5 11.7299 7.5 14.5V34.5C7.5 37.2701 8.19273 39.3493 9.47419 40.7293C10.737 42.0892 12.7859 43 16 43H32C35.2141 43 37.263 42.0892 38.5258 40.7293C39.8073 39.3493 40.5 37.2701 40.5 34.5V14.5C40.5 11.7299 39.8073 9.65071 38.5258 8.27068C37.263 6.91077 35.2141 6 32 6H16C12.7859 6 10.737 6.91077 9.47419 8.27068ZM7.27581 6.22932C9.26304 4.08923 12.2141 3 16 3H32C35.7859 3 38.737 4.08923 40.7242 6.22932C42.6927 8.34929 43.5 11.2701 43.5 14.5V34.5C43.5 37.7299 42.6927 40.6507 40.7242 42.7707C38.737 44.9108 35.7859 46 32 46H16C12.2141 46 9.26304 44.9108 7.27581 42.7707C5.30727 40.6507 4.5 37.7299 4.5 34.5V14.5C4.5 11.2701 5.30727 8.34929 7.27581 6.22932Z"
        fill="url(#paint0_linear_2039_6072)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29 8C29.8284 8 30.5 8.67157 30.5 9.5V13.5C30.5 14.8716 31.6284 16 33 16H37C37.8284 16 38.5 16.6716 38.5 17.5C38.5 18.3284 37.8284 19 37 19H33C29.9716 19 27.5 16.5284 27.5 13.5V9.5C27.5 8.67157 28.1716 8 29 8Z"
        fill="url(#paint1_linear_2039_6072)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.5 26.5C14.5 25.6716 15.1716 25 16 25H24C24.8284 25 25.5 25.6716 25.5 26.5C25.5 27.3284 24.8284 28 24 28H16C15.1716 28 14.5 27.3284 14.5 26.5Z"
        fill="url(#paint2_linear_2039_6072)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.5 34.5C14.5 33.6716 15.1716 33 16 33H32C32.8284 33 33.5 33.6716 33.5 34.5C33.5 35.3284 32.8284 36 32 36H16C15.1716 36 14.5 35.3284 14.5 34.5Z"
        fill="url(#paint3_linear_2039_6072)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2039_6072"
          x1="43.5"
          y1="24.5"
          x2="4.5"
          y2="24.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_2039_6072"
          x1="43.5"
          y1="24.5"
          x2="4.5"
          y2="24.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_2039_6072"
          x1="43.5"
          y1="24.5"
          x2="4.5"
          y2="24.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_2039_6072"
          x1="43.5"
          y1="24.5"
          x2="4.5"
          y2="24.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
      </defs>
    </svg>
  ) : (
    <DocumentText size={size} className={color} />
  )
}

export default DocumentIcon
