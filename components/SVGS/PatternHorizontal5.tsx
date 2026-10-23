export interface IconProps {
  width?: number
  height?: number
  color?: string
  className?: string
}

const PatternHorizontal5 = ({ width = 44, height = 24, color = "currentColor", className }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 44 24"
      fill="none"
      className={className}
    >
      <path
        d="M38.3108 10L5.68 10.0001C4.48 10.0001 4 10.3013 4 11.0495V12.9507C4 13.6989 4.48 14.0001 5.68 14.0001L38.3108 14C39.5108 14 39.9908 13.6988 39.9908 12.9506V11.0494C39.9908 10.3012 39.5108 10 38.3108 10Z"
        fill={color}
      />
      <path
        d="M38.3108 4L5.68 4.00011C4.48 4.00011 4 4.30129 4 5.04952V6.9507C4 7.69893 4.48 8.00011 5.68 8.00011L38.3108 8C39.5108 8 39.9908 7.69882 39.9908 6.95059V5.04941C39.9908 4.30118 39.5108 4 38.3108 4Z"
        fill={color}
      />
      <path
        d="M38.3108 16L5.68 16.0001C4.48 16.0001 4 16.3013 4 17.0495V18.9507C4 19.6989 4.48 20.0001 5.68 20.0001L38.3108 20C39.5108 20 39.9908 19.6988 39.9908 18.9506V17.0494C39.9908 16.3012 39.5108 16 38.3108 16Z"
        fill={color}
      />
    </svg>
  )
}

export default PatternHorizontal5
