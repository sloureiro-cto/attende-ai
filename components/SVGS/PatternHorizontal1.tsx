export interface IconProps {
  width?: number
  height?: number
  color?: string
  className?: string
}

const PatternHorizontal1 = ({ width = 44, height = 24, color = "currentColor", className }: IconProps) => {
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
        d="M6.25 10H7.75C9.25 10 10 9.25 10 7.75V6.25C10 4.75 9.25 4 7.75 4H6.25C4.75 4 4 4.75 4 6.25V7.75C4 9.25 4.75 10 6.25 10Z"
        fill={color}
      />
      <path
        d="M26.25 10H27.75C29.25 10 30 9.25 30 7.75V6.25C30 4.75 29.25 4 27.75 4H26.25C24.75 4 24 4.75 24 6.25V7.75C24 9.25 24.75 10 26.25 10Z"
        fill={color}
      />
      <path
        d="M16.25 10H17.75C19.25 10 20 9.25 20 7.75V6.25C20 4.75 19.25 4 17.75 4H16.25C14.75 4 14 4.75 14 6.25V7.75C14 9.25 14.75 10 16.25 10Z"
        fill={color}
      />
      <path
        d="M36.25 10H37.75C39.25 10 40 9.25 40 7.75V6.25C40 4.75 39.25 4 37.75 4H36.25C34.75 4 34 4.75 34 6.25V7.75C34 9.25 34.75 10 36.25 10Z"
        fill={color}
      />
      <path
        d="M16.25 20H17.75C19.25 20 20 19.25 20 17.75V16.25C20 14.75 19.25 14 17.75 14H16.25C14.75 14 14 14.75 14 16.25V17.75C14 19.25 14.75 20 16.25 20Z"
        fill={color}
      />
      <path
        d="M36.25 20H37.75C39.25 20 40 19.25 40 17.75V16.25C40 14.75 39.25 14 37.75 14H36.25C34.75 14 34 14.75 34 16.25V17.75C34 19.25 34.75 20 36.25 20Z"
        fill={color}
      />
      <path
        d="M6.25 20H7.75C9.25 20 10 19.25 10 17.75V16.25C10 14.75 9.25 14 7.75 14H6.25C4.75 14 4 14.75 4 16.25V17.75C4 19.25 4.75 20 6.25 20Z"
        fill={color}
      />
      <path
        d="M26.25 20H27.75C29.25 20 30 19.25 30 17.75V16.25C30 14.75 29.25 14 27.75 14H26.25C24.75 14 24 14.75 24 16.25V17.75C24 19.25 24.75 20 26.25 20Z"
        fill={color}
      />
    </svg>
  )
}

export default PatternHorizontal1
